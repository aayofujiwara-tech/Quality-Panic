import { useState, useEffect, useCallback, useRef } from 'react';
import type { Room, Card, DefectCard, ResponseCard, MultiplayerGameState } from '../game/types';
import {
  startTurn, multiDrawCard, multiStopDrawing, multiHandlePanic,
  multiCanStop, multiUseResponseCard, multiSkipDefectResponse,
  multiUseDesignChange, advanceTurn,
} from '../game/multiplayerEngine';
import { writeGameState, writePlayerResponseHand, writePlayerScore } from '../firebase/gameSync';
import { listenRoom } from '../firebase/roomManager';

type Props = {
  roomCode: string;
  uid: string;
  initialRoom: Room;
  onBack: () => void;
};

type LocalPhase =
  | 'waiting_turn'    // 相手のターン待ち
  | 'prepare'         // 自分のターン準備
  | 'shipping'        // 出荷中（カードめくり）
  | 'defect_response' // 不具合対応判断
  | 'event_display'   // イベント表示
  | 'result'          // ターン結果表示
  | 'round_result'    // ラウンド結果
  | 'game_over';      // ゲーム終了

export function MultiplayerGame({ roomCode, uid, initialRoom, onBack }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [localPhase, setLocalPhase] = useState<LocalPhase>('prepare');
  const [pendingDefect, setPendingDefect] = useState<DefectCard | null>(null);
  const [pendingEvent, setPendingEvent] = useState<Card | null>(null);
  const [lastDrawnCard, setLastDrawnCard] = useState<Card | null>(null);
  const [turnProfit, setTurnProfit] = useState(0);
  const [turnPanicked, setTurnPanicked] = useState(false);
  const [myResponseHand, setMyResponseHand] = useState<ResponseCard[]>([]);
  const [myScore, setMyScore] = useState(0);

  const roomRef = useRef(room);
  roomRef.current = room;

  // カードマスタのローカルキャッシュ
  const cardMaster = room.cardMaster ?? {};

  const gameState = room.gameState;
  const isMyTurn = gameState?.currentPlayerUid === uid;
  const playerOrder = room.playerOrder ?? [];
  const opponentUid = playerOrder.find(id => id !== uid) ?? '';

  // ルーム監視
  useEffect(() => {
    const unsub = listenRoom(roomCode, (r) => {
      if (!r) {
        onBack();
        return;
      }
      setRoom(r);
    });
    return unsub;
  }, [roomCode, onBack]);

  // ゲーム状態が変わったとき、自分のターンかどうかでフェーズ更新
  useEffect(() => {
    if (!gameState) return;

    if (gameState.phase === 'game_over') {
      setLocalPhase('game_over');
      return;
    }

    if (gameState.currentPlayerUid === uid) {
      if (gameState.phase === 'prepare' && localPhase === 'waiting_turn') {
        setLocalPhase('prepare');
      }
    } else {
      if (localPhase !== 'result' && localPhase !== 'round_result' && localPhase !== 'game_over') {
        setLocalPhase('waiting_turn');
      }
    }
  }, [gameState?.currentPlayerUid, gameState?.phase, gameState?.round, uid]);

  // 初期手札設定
  useEffect(() => {
    if (room.players?.[uid]) {
      const hand = room.players[uid].responseHand ?? [];
      setMyResponseHand(hand);
      setMyScore(room.players[uid].score ?? 0);
    }
  }, [room.players?.[uid]?.responseHand?.length, room.players?.[uid]?.score]);

  // ===== アクションハンドラ =====

  const handleStartTurn = useCallback(async () => {
    if (!gameState || !isMyTurn) return;
    const newState = startTurn(gameState);
    await writeGameState(roomCode, newState);
    setLocalPhase('shipping');
    setLastDrawnCard(null);
    setTurnProfit(0);
    setTurnPanicked(false);
  }, [gameState, isMyTurn, roomCode]);

  const handleDraw = useCallback(async () => {
    if (!gameState || !isMyTurn || localPhase !== 'shipping') return;

    const result = multiDrawCard(gameState, cardMaster, myResponseHand);
    if (!result) return;

    setLastDrawnCard(result.drawnCard);
    await writeGameState(roomCode, result.gameState);

    if (result.panicked) {
      // パニック処理
      const panicState = multiHandlePanic(result.gameState, uid);
      await writeGameState(roomCode, panicState);
      setTurnPanicked(true);
      setTurnProfit(0);
      setLocalPhase('result');
    } else if (result.needsDefectResponse) {
      setPendingDefect(result.drawnCard as DefectCard);
      setLocalPhase('defect_response');
    } else if (result.eventTriggered) {
      setPendingEvent(result.eventTriggered);
      setLocalPhase('event_display');
    } else {
      // 更新された利益を反映
      setTurnProfit(result.gameState.turnState?.currentProfit ?? 0);
    }
  }, [gameState, isMyTurn, localPhase, roomCode, uid, cardMaster, myResponseHand]);

  const handleStop = useCallback(async () => {
    if (!gameState || !isMyTurn) return;

    const { gameState: newState, newResponseHand, profit } =
      multiStopDrawing(gameState, uid, cardMaster, myResponseHand);

    const newScore = myScore + profit;
    setMyScore(newScore);
    setMyResponseHand(newResponseHand);
    setTurnProfit(profit);
    setTurnPanicked(false);

    await Promise.all([
      writeGameState(roomCode, newState),
      writePlayerResponseHand(roomCode, uid, newResponseHand),
      writePlayerScore(roomCode, uid, newScore),
    ]);

    setLocalPhase('result');
  }, [gameState, isMyTurn, roomCode, uid, cardMaster, myResponseHand, myScore]);

  const handleUseResponseCard = useCallback(async (cardIndex: number) => {
    if (!gameState || !pendingDefect) return;

    const { gameState: newState, newResponseHand } =
      multiUseResponseCard(gameState, cardMaster, myResponseHand, cardIndex, pendingDefect);

    setMyResponseHand(newResponseHand);
    setPendingDefect(null);

    await Promise.all([
      writeGameState(roomCode, newState),
      writePlayerResponseHand(roomCode, uid, newResponseHand),
    ]);

    setLocalPhase('shipping');
    setTurnProfit(newState.turnState?.currentProfit ?? 0);
  }, [gameState, pendingDefect, roomCode, uid, cardMaster, myResponseHand]);

  const handleSkipDefect = useCallback(async () => {
    if (!gameState || !pendingDefect) return;

    const { gameState: newState, panicked } = multiSkipDefectResponse(gameState, pendingDefect);
    setPendingDefect(null);

    if (panicked) {
      const panicState = multiHandlePanic(newState, uid);
      await writeGameState(roomCode, panicState);
      setTurnPanicked(true);
      setTurnProfit(0);
      setLocalPhase('result');
    } else {
      await writeGameState(roomCode, newState);
      setLocalPhase('shipping');
      setTurnProfit(newState.turnState?.currentProfit ?? 0);
    }
  }, [gameState, pendingDefect, roomCode, uid]);

  const handleDismissEvent = useCallback(() => {
    setPendingEvent(null);
    setLocalPhase('shipping');
    setTurnProfit(gameState?.turnState?.currentProfit ?? 0);
  }, [gameState]);

  const handleUseDesignChange = useCallback(async (cardIndex: number) => {
    if (!gameState) return;

    const { gameState: newState, newResponseHand } =
      multiUseDesignChange(gameState, myResponseHand, cardIndex);

    setMyResponseHand(newResponseHand);
    await Promise.all([
      writeGameState(roomCode, newState),
      writePlayerResponseHand(roomCode, uid, newResponseHand),
    ]);
  }, [gameState, roomCode, uid, myResponseHand]);

  const handleNextTurn = useCallback(async () => {
    if (!gameState) return;

    const newState = advanceTurn(gameState, playerOrder);
    await writeGameState(roomCode, newState);

    if (newState.phase === 'game_over') {
      setLocalPhase('game_over');
    } else if (newState.currentPlayerUid === uid) {
      setLocalPhase('prepare');
    } else {
      setLocalPhase('waiting_turn');
    }
  }, [gameState, playerOrder, roomCode, uid]);

  // ===== レンダリング =====

  const getPlayerName = (playerUid: string) =>
    room.players?.[playerUid]?.name ?? 'プレイヤー';

  const getPlayerScore = (playerUid: string) =>
    room.players?.[playerUid]?.score ?? 0;

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">ゲームデータを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ステータスバー */}
      <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700">
        <div className="flex items-center gap-4">
          <span className="text-amber-400 font-bold">R{gameState.round}/{gameState.maxRounds}</span>
          <span className="text-gray-400 text-sm">山札: {gameState.drawPile?.length ?? 0}</span>
        </div>
        <div className="flex items-center gap-6">
          {playerOrder.map((pid) => (
            <div key={pid} className={`flex items-center gap-2 ${pid === uid ? 'text-blue-400' : 'text-gray-300'}`}>
              <span className="text-sm">{getPlayerName(pid)}</span>
              <span className="font-bold">{pid === uid ? myScore : getPlayerScore(pid)}pt</span>
              {pid === gameState.currentPlayerUid && (
                <span className="text-xs text-amber-400 border border-amber-400/30 px-1 rounded">手番</span>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* メインエリア */}
      <div className="flex-1 p-6 flex flex-col items-center justify-center gap-6">
        {/* 待機中 */}
        {localPhase === 'waiting_turn' && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-300 mb-2">
              {getPlayerName(gameState.currentPlayerUid)} のターン
            </h2>
            <p className="text-gray-500">相手の出荷を見守っています...</p>
            <div className="mt-4 text-gray-600 animate-pulse">待機中</div>
          </div>
        )}

        {/* 準備フェーズ */}
        {localPhase === 'prepare' && isMyTurn && (
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-400 mb-2">
              あなたのターン
            </h2>
            <p className="text-gray-400 mb-4">ラウンド {gameState.round}</p>
            {gameState.lastContamination && gameState.lastContamination.round === gameState.round && (
              <p className="text-red-400 text-sm mb-4">
                汚染カード {gameState.lastContamination.count}枚 が山札に投入されました
              </p>
            )}
            <button
              onClick={handleStartTurn}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-lg cursor-pointer transition-all"
            >
              出荷開始！
            </button>
          </div>
        )}

        {/* 出荷中 */}
        {localPhase === 'shipping' && isMyTurn && gameState.turnState && (
          <div className="w-full max-w-lg">
            {/* アクティブ効果 */}
            <ActiveEffectsMulti turnState={gameState.turnState} />

            {/* 引いたカードの表示 */}
            <div className="mb-4">
              <div className="flex items-center gap-4 mb-2">
                <span className="text-sm text-gray-400">
                  利益: <span className="text-green-400 font-bold">{gameState.turnState.currentProfit}pt</span>
                </span>
                <span className="text-sm text-gray-400">
                  不具合Pt: <span className={`font-bold ${gameState.turnState.currentDefectPoints > 0 ? 'text-red-400' : 'text-gray-300'}`}>
                    {gameState.turnState.currentDefectPoints}/{gameState.turnState.panicThreshold}
                  </span>
                </span>
                <span className="text-sm text-gray-400">
                  引いた枚数: {(gameState.turnState.drawnCards ?? []).length}
                </span>
              </div>

              {lastDrawnCard && (
                <div className={`p-3 rounded-lg border mb-3 ${
                  lastDrawnCard.type === 'product' ? 'border-green-500 bg-green-900/20' :
                  lastDrawnCard.type === 'defect' ? 'border-red-500 bg-red-900/20' :
                  'border-yellow-500 bg-yellow-900/20'
                }`}>
                  <span className="text-sm text-gray-400">最後に引いたカード: </span>
                  <span className="font-medium text-white">{lastDrawnCard.name}</span>
                </div>
              )}
            </div>

            {/* ドローされたカード一覧 */}
            <div className="flex flex-wrap gap-2 mb-4 min-h-[48px]">
              {(gameState.turnState.drawnCards ?? []).map((cardId, i) => {
                const card = cardMaster[cardId];
                if (!card) return null;
                return (
                  <div
                    key={i}
                    className={`px-2 py-1 rounded text-xs ${
                      card.type === 'product' ? 'bg-green-900/40 text-green-300 border border-green-700' :
                      card.type === 'defect' ? 'bg-red-900/40 text-red-300 border border-red-700' :
                      'bg-yellow-900/40 text-yellow-300 border border-yellow-700'
                    }`}
                  >
                    {card.name}
                  </div>
                );
              })}
            </div>

            {/* アクションボタン */}
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleDraw}
                disabled={!gameState.drawPile?.length}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                めくる
              </button>
              <button
                onClick={handleStop}
                disabled={!multiCanStop(gameState.turnState)}
                className="px-6 py-3 bg-amber-600 hover:bg-amber-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
              >
                止める
              </button>
            </div>
          </div>
        )}

        {/* 不具合対応 */}
        {localPhase === 'defect_response' && pendingDefect && (
          <div className="bg-gray-800 border border-red-500 rounded-xl p-6 max-w-md">
            <h3 className="text-lg font-bold text-red-400 mb-3">不具合発生！</h3>
            <p className="text-white mb-1">{pendingDefect.name}</p>
            <p className="text-red-300 text-sm mb-4">不具合Pt: {pendingDefect.defectPoints}</p>

            <div className="flex flex-col gap-2 mb-4">
              {myResponseHand.map((card, i) => {
                if (!['first_aid', 'root_cause', 'inspection'].includes(card.responseType)) return null;
                return (
                  <button
                    key={i}
                    onClick={() => handleUseResponseCard(i)}
                    className="px-4 py-2 bg-emerald-700 hover:bg-emerald-600 rounded text-white text-sm cursor-pointer transition-all text-left"
                  >
                    {card.name} - {card.description}
                  </button>
                );
              })}
            </div>

            <button
              onClick={handleSkipDefect}
              className="w-full px-4 py-2 bg-gray-700 hover:bg-gray-600 rounded text-gray-300 text-sm cursor-pointer transition-all"
            >
              対応しない（不具合Ptを受ける）
            </button>
          </div>
        )}

        {/* イベント表示 */}
        {localPhase === 'event_display' && pendingEvent && (
          <div className="bg-gray-800 border border-yellow-500 rounded-xl p-6 max-w-md text-center">
            <h3 className="text-lg font-bold text-yellow-400 mb-2">イベント発動！</h3>
            <p className="text-white text-xl mb-1">{pendingEvent.name}</p>
            {'description' in pendingEvent && (
              <p className="text-gray-400 text-sm mb-4">{(pendingEvent as { description: string }).description}</p>
            )}
            <button
              onClick={handleDismissEvent}
              className="px-6 py-2 bg-yellow-600 hover:bg-yellow-500 rounded-lg text-white cursor-pointer transition-all"
            >
              OK
            </button>
          </div>
        )}

        {/* ターン結果 */}
        {localPhase === 'result' && (
          <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md text-center">
            <h3 className="text-xl font-bold mb-3">
              {turnPanicked ? (
                <span className="text-red-400">パニック発生！</span>
              ) : (
                <span className="text-green-400">出荷完了！</span>
              )}
            </h3>
            <p className="text-gray-300 mb-1">
              {turnPanicked ? '利益: 0pt（パニックペナルティ）' : `利益: ${turnProfit}pt`}
            </p>
            <p className="text-gray-400 text-sm mb-4">合計スコア: {myScore}pt</p>
            <button
              onClick={handleNextTurn}
              className="px-6 py-3 bg-blue-600 hover:bg-blue-500 rounded-lg text-white font-medium cursor-pointer transition-all"
            >
              次へ
            </button>
          </div>
        )}

        {/* ゲーム終了 */}
        {localPhase === 'game_over' && (
          <div className="text-center">
            <h2 className="text-3xl font-bold text-amber-400 mb-6">ゲーム終了</h2>

            <div className="flex gap-8 mb-8">
              {playerOrder.map((pid) => {
                const score = pid === uid ? myScore : getPlayerScore(pid);
                const isMe = pid === uid;
                return (
                  <div key={pid} className={`p-6 rounded-xl border ${isMe ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-800'}`}>
                    <div className="text-sm text-gray-400 mb-1">{getPlayerName(pid)}{isMe ? '（あなた）' : ''}</div>
                    <div className="text-3xl font-bold text-white">{score}pt</div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const myFinalScore = myScore;
              const opScore = getPlayerScore(opponentUid);
              if (myFinalScore > opScore) return <p className="text-2xl text-amber-400 font-bold mb-6">勝利！</p>;
              if (myFinalScore < opScore) return <p className="text-2xl text-blue-400 font-bold mb-6">敗北...</p>;
              return <p className="text-2xl text-gray-300 font-bold mb-6">引き分け</p>;
            })()}

            <button
              onClick={onBack}
              className="px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-lg text-white cursor-pointer transition-all"
            >
              タイトルに戻る
            </button>
          </div>
        )}
      </div>

      {/* 対応カード手札（出荷中のみ表示） */}
      {localPhase === 'shipping' && isMyTurn && myResponseHand.length > 0 && (
        <div className="px-4 py-3 bg-gray-900 border-t border-gray-700">
          <div className="text-xs text-gray-500 mb-1">対応カード</div>
          <div className="flex gap-2">
            {myResponseHand.map((card, i) => (
              <button
                key={i}
                onClick={() => {
                  if (card.responseType === 'design_change') {
                    handleUseDesignChange(i);
                  }
                }}
                disabled={card.responseType !== 'design_change'}
                className={`px-3 py-2 rounded text-xs border transition-all ${
                  card.responseType === 'design_change'
                    ? 'bg-purple-900/40 border-purple-600 text-purple-300 cursor-pointer hover:bg-purple-800/40'
                    : 'bg-gray-800 border-gray-700 text-gray-400 cursor-default'
                }`}
                title={card.description}
              >
                {card.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// アクティブ効果の表示
function ActiveEffectsMulti({ turnState }: { turnState: NonNullable<MultiplayerGameState['turnState']> }) {
  const effects: { icon: string; text: string; color: string }[] = [];

  if (turnState.snsFireActive) {
    effects.push({ icon: '🔥', text: 'SNS炎上: 不具合Pt2倍', color: 'text-orange-400' });
  }
  if (turnState.forcedDraws > 0) {
    effects.push({ icon: '⏰', text: `納期プレッシャー: あと${turnState.forcedDraws}枚`, color: 'text-yellow-400' });
  }
  if (turnState.panicThreshold < 3) {
    effects.push({ icon: '👴', text: `ベテラン退職: 閾値${turnState.panicThreshold}`, color: 'text-red-400' });
  }
  if (turnState.waterInspectionActive) {
    effects.push({ icon: '🛡️', text: '水際検査: 次の不具合無効', color: 'text-emerald-400' });
  }

  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {effects.map((e, i) => (
        <span key={i} className={`text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 ${e.color}`}>
          {e.icon} {e.text}
        </span>
      ))}
    </div>
  );
}
