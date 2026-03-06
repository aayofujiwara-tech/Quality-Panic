import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import type { Room, Card, DefectCard, EventCard, ResponseCard, MultiplayerGameState, DefectPointChange } from '../game/types';
import {
  startTurn, multiDrawCard, multiStopDrawing, multiHandlePanic,
  multiCanStop, multiUseResponseCard, multiSkipDefectResponse,
  multiUseDesignChange, advanceTurn, multiSelectSamplingCard,
} from '../game/multiplayerEngine';
import { writeGameState, writePlayerResponseHand, writePlayerScore } from '../firebase/gameSync';
import { listenRoom } from '../firebase/roomManager';
import { MAX_CONTAMINATION_PER_ROUND } from '../game/constants';
import { DrawPile } from './DrawPile';
import { DrawnCards } from './DrawnCards';
import { ActionButtons } from './ActionButtons';
import { ResponseHand } from './ResponseHand';
import { DefectResponse } from './DefectResponse';
import { SamplingModal } from './SamplingModal';
import { PanicCardHistory } from './RoundResult';

type Props = {
  roomCode: string;
  uid: string;
  initialRoom: Room;
  onBack: () => void;
};

type LocalPhase =
  | 'waiting_turn'    // 相手のターン待ち
  | 'prepare'         // 自分のターン準備
  | 'sampling'        // 抜き取り検査中
  | 'shipping'        // 出荷中（カードめくり）
  | 'defect_response' // 不具合対応判断
  | 'event_display'   // イベント表示
  | 'result'          // ターン結果表示
  | 'round_result'    // ラウンド結果
  | 'game_over';      // ゲーム終了

// カードIDの配列をCard[]に変換するヘルパー
function resolveCards(ids: string[], cardMaster: Record<string, Card>): Card[] {
  return ids.map(id => cardMaster[id]).filter((c): c is Card => c != null);
}

// マルチプレイヤー用の不具合率計算
function getMultiDefectRate(ids: string[], cardMaster: Record<string, Card>): number {
  if (ids.length === 0) return 0;
  const cards = resolveCards(ids, cardMaster);
  if (cards.length === 0) return 0;
  const defectCount = cards.filter(c => c.type === 'defect').length;
  return defectCount / cards.length;
}

// イベントアイコン・色定義（EventModalと同一）
const eventIcons: Record<string, string> = {
  sns_fire: '🔥',
  deadline_pressure: '⏰',
  veteran_retire: '👴',
  kaizen: '💡',
  iso_audit: '📋',
  sampling_inspection: '🔍',
};

const eventColors: Record<string, string> = {
  sns_fire: 'border-orange-500 bg-orange-900/40',
  deadline_pressure: 'border-yellow-500 bg-yellow-900/40',
  veteran_retire: 'border-red-500 bg-red-900/40',
  kaizen: 'border-green-500 bg-green-900/40',
  iso_audit: 'border-blue-500 bg-blue-900/40',
  sampling_inspection: 'border-teal-500 bg-teal-900/40',
};

function getMultiEventDescription(event: EventCard, turnState: MultiplayerGameState['turnState']): string {
  switch (event.eventType) {
    case 'sns_fire':
      return '次に出荷する不具合カードのPtが2倍になります！';
    case 'deadline_pressure':
      return 'あと最低2枚は出荷しないといけません！';
    case 'veteran_retire': {
      const defPt = turnState?.currentDefectPoints ?? 0;
      return `パニック閾値が3→2に低下！（このラウンドのみ）${
        defPt >= 2 ? '\n現在の不具合Ptが閾値以上のため、パニック発生！' : ''
      }`;
    }
    case 'kaizen':
      return '直近の不具合1Ptが無効化されました！';
    case 'iso_audit':
      return (turnState?.currentDefectPoints ?? 0) === 0
        ? 'ボーナス3点獲得！不具合ゼロの品質管理が評価されました！'
        : '不具合が検出されており、ボーナスなし';
    case 'sampling_inspection':
      return '次ラウンド開始時、山札から3枚を抜き取り検査。1枚を選んで確保できます';
    default:
      return event.description;
  }
}

export function MultiplayerGame({ roomCode, uid, initialRoom, onBack }: Props) {
  const [room, setRoom] = useState<Room>(initialRoom);
  const [localPhase, setLocalPhase] = useState<LocalPhase>('prepare');
  const [pendingDefect, setPendingDefect] = useState<DefectCard | null>(null);
  const [pendingEvent, setPendingEvent] = useState<EventCard | null>(null);
  const [, setLastDrawnCard] = useState<Card | null>(null);
  const [turnProfit, setTurnProfit] = useState(0);
  const [turnPanicked, setTurnPanicked] = useState(false);
  const [lastDrawnCards, setLastDrawnCards] = useState<Card[]>([]);
  const [lastDefectPointsLog, setLastDefectPointsLog] = useState<DefectPointChange[]>([]);
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

  // 山札のCard[]変換（DrawPile用）
  const drawPileCards = useMemo(
    () => resolveCards(gameState?.drawPile ?? [], cardMaster),
    [gameState?.drawPile, cardMaster],
  );

  // 今ターンに引いたカードのCard[]変換（DrawnCards用）
  const drawnCardsThisTurn = useMemo(
    () => resolveCards(gameState?.turnState?.drawnCards ?? [], cardMaster),
    [gameState?.turnState?.drawnCards, cardMaster],
  );

  // 抜き取り検査カードのCard[]変換
  const samplingCardsResolved = useMemo(
    () => resolveCards(gameState?.samplingCards ?? [], cardMaster),
    [gameState?.samplingCards, cardMaster],
  );

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
    // 抜き取り検査がある場合はサンプリングフェーズへ
    if ((newState.samplingCards ?? []).length > 0) {
      setLocalPhase('sampling');
    } else {
      setLocalPhase('shipping');
    }
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
      setLastDrawnCards(resolveCards(result.gameState.turnState?.drawnCards ?? [], cardMaster));
      setLastDefectPointsLog(result.gameState.turnState?.defectPointsLog ?? []);
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
    setLastDrawnCards(drawnCardsThisTurn);
    setLastDefectPointsLog(gameState?.turnState?.defectPointsLog ?? []);

    await Promise.all([
      writeGameState(roomCode, newState),
      writePlayerResponseHand(roomCode, uid, newResponseHand),
      writePlayerScore(roomCode, uid, newScore),
    ]);

    setLocalPhase('result');
  }, [gameState, isMyTurn, roomCode, uid, cardMaster, myResponseHand, myScore, drawnCardsThisTurn]);

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
      setLastDrawnCards(drawnCardsThisTurn);
      setLastDefectPointsLog(newState.turnState?.defectPointsLog ?? []);
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
  }, [gameState, pendingDefect, roomCode, uid, drawnCardsThisTurn]);

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

  const handleSelectSamplingCard = useCallback(async (index: number) => {
    if (!gameState) return;
    const newState = multiSelectSamplingCard(gameState, index, cardMaster);
    await writeGameState(roomCode, newState);
    // まだサンプリングカードが残っていれば継続
    if ((newState.samplingCards ?? []).length > 0) {
      setLocalPhase('sampling');
    } else {
      setLocalPhase('shipping');
    }
  }, [gameState, roomCode, cardMaster]);

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

  // ===== ヘルパー =====

  const getPlayerName = (playerUid: string) =>
    room.players?.[playerUid]?.name ?? 'プレイヤー';

  const getPlayerScore = (playerUid: string) =>
    room.players?.[playerUid]?.score ?? 0;

  const isShipping = localPhase === 'shipping' || localPhase === 'defect_response' || localPhase === 'event_display';

  // 次ラウンド汚染予測
  const nextContamination = useMemo(() => {
    if (!gameState || gameState.round >= gameState.maxRounds) return undefined;
    const roundResult = gameState.roundResults?.[gameState.round];
    let confirmedProfit = 0;
    let hasConfirmed = false;
    if (roundResult) {
      for (const pid of playerOrder) {
        if (roundResult[pid]) {
          confirmedProfit += roundResult[pid].profit;
          hasConfirmed = true;
        }
      }
    }
    const count = Math.min(
      Math.ceil(confirmedProfit / 2),
      MAX_CONTAMINATION_PER_ROUND,
      (gameState.contaminationStock ?? []).length,
    );
    return { count, tentative: !hasConfirmed };
  }, [gameState?.round, gameState?.maxRounds, gameState?.roundResults, gameState?.contaminationStock?.length, playerOrder]);

  // ===== レンダリング =====

  if (!gameState) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-gray-400">ゲームデータを読み込み中...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* ステータスバー（マルチ専用：両者スコア＋手番表示） */}
      <div className="flex items-center justify-between bg-gray-800 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-700">
        <h1 className="text-base sm:text-xl font-bold text-amber-400 shrink-0">品証パニック</h1>
        <div className="flex gap-2 sm:gap-6 text-xs sm:text-sm flex-wrap justify-end">
          <span className="text-gray-300">
            R<span className="text-white font-bold text-sm sm:text-base">{gameState.round}</span>/{gameState.maxRounds}
          </span>
          {playerOrder.map((pid) => {
            const isMe = pid === uid;
            const score = isMe ? myScore : getPlayerScore(pid);
            const isCurrent = pid === gameState.currentPlayerUid;
            return (
              <span key={pid} className={isMe ? 'text-blue-300' : 'text-gray-300'}>
                <span className="hidden sm:inline">{getPlayerName(pid)}{isMe ? '(自分)' : ''}: </span>
                <span className="sm:hidden">{isMe ? '自分' : '相手'}: </span>
                <span className="font-bold text-sm sm:text-base text-white">{score}pt</span>
                {isCurrent && (
                  <span className="ml-1 text-xs text-amber-400 border border-amber-400/30 px-1 rounded">手番</span>
                )}
              </span>
            );
          })}
        </div>
      </div>

      <div className="flex-1 p-3 sm:p-6">
        {/* 相手のターン待ち */}
        {localPhase === 'waiting_turn' && (
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-8 sm:py-12">
            <div className="text-xl sm:text-2xl font-bold text-gray-300">
              {getPlayerName(gameState.currentPlayerUid)} のターン
            </div>
            <div className="text-gray-500">相手の出荷を見守っています...</div>
            <div className="text-gray-600 animate-pulse">待機中</div>
          </div>
        )}

        {/* 準備フェーズ */}
        {localPhase === 'prepare' && isMyTurn && (
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-8 sm:py-12">
            <div className="text-xl sm:text-2xl font-bold text-amber-400">
              ラウンド {gameState.round} 準備中
            </div>
            {gameState.lastContamination && gameState.lastContamination.round === gameState.round && (
              <div className="text-sm text-red-400">
                汚染カード {gameState.lastContamination.count}枚 が山札に投入されました
              </div>
            )}
            {(gameState.samplingNextRound ?? 0) > 0 && (
              <div className="text-sm text-teal-400">
                🔍 抜き取り検査効果: 3枚から1枚を選べます{(gameState.samplingNextRound ?? 0) >= 2 ? `（${gameState.samplingNextRound}回）` : ''}
              </div>
            )}
            <button
              onClick={handleStartTurn}
              className="px-8 py-3 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-base sm:text-lg cursor-pointer transition-all"
            >
              出荷開始！
            </button>
          </div>
        )}

        {/* 出荷中（ソロと同一レイアウト） */}
        {isShipping && isMyTurn && gameState.turnState && (
          <div className="flex flex-col md:flex-row gap-4 md:gap-8 items-stretch md:items-start">
            <DrawPile
              remaining={(gameState.drawPile ?? []).length}
              defectRate={getMultiDefectRate(gameState.drawPile ?? [], cardMaster)}
              drawPile={drawPileCards}
              nextContamination={nextContamination}
            />
            <div className="flex-1 flex flex-col">
              <ActiveEffectsMulti turnState={gameState.turnState} />
              <DrawnCards
                cards={drawnCardsThisTurn}
                currentProfit={gameState.turnState.currentProfit}
                currentDefectPoints={gameState.turnState.currentDefectPoints}
                panicThreshold={gameState.turnState.panicThreshold}
              />
              <ActionButtons
                onDraw={handleDraw}
                onStop={handleStop}
                canDraw={(gameState.drawPile ?? []).length > 0 && localPhase === 'shipping'}
                canStop={multiCanStop(gameState.turnState) && localPhase === 'shipping'}
                cardsDrawn={drawnCardsThisTurn.length}
              />
            </div>
          </div>
        )}

        {/* ターン結果（ソロと同一レイアウト） */}
        {localPhase === 'result' && (
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-8 sm:py-12">
            {turnPanicked ? (
              <>
                <div className="text-3xl sm:text-4xl font-bold text-red-400">パニック発生！</div>
                <div className="text-sm sm:text-base text-gray-400">このラウンドの利益は全て失われました...</div>
                <div className="text-xs sm:text-sm text-red-300">汚染ストックから3枚が山札に追加投入されました</div>
                <div className="text-xs sm:text-sm text-gray-500 mt-1">対応カードは入手できません</div>
                {lastDrawnCards.length > 0 && (
                  <PanicCardHistory cards={lastDrawnCards} defectPointsLog={lastDefectPointsLog} />
                )}
              </>
            ) : (
              <>
                <div className="text-3xl sm:text-4xl font-bold text-green-400">出荷完了！</div>
                <div className="text-xl sm:text-2xl text-white">+{turnProfit}点 獲得</div>
                {turnProfit <= 5 && (
                  <div className="text-sm text-green-300">
                    対応カードを{turnProfit <= 2 ? 2 : 1}枚入手しました
                  </div>
                )}
              </>
            )}

            <div className="text-gray-300 mt-4">
              累計スコア: <span className="text-xl font-bold text-white">{myScore}pt</span>
            </div>

            <button
              onClick={handleNextTurn}
              className="mt-2 sm:mt-4 px-8 py-3 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-base sm:text-lg cursor-pointer transition-all"
            >
              次へ
            </button>
          </div>
        )}

        {/* ゲーム終了 */}
        {localPhase === 'game_over' && (
          <div className="flex flex-col items-center justify-center gap-4 sm:gap-6 py-8 sm:py-12 px-4">
            <div className="text-2xl sm:text-3xl font-bold text-amber-400">ゲーム終了</div>

            <div className="flex gap-4 sm:gap-8">
              {playerOrder.map((pid) => {
                const score = pid === uid ? myScore : getPlayerScore(pid);
                const isMe = pid === uid;
                return (
                  <div key={pid} className={`p-4 sm:p-6 rounded-xl border ${isMe ? 'border-blue-500 bg-blue-900/20' : 'border-gray-600 bg-gray-800'}`}>
                    <div className="text-xs sm:text-sm text-gray-400 mb-1">{getPlayerName(pid)}{isMe ? '（あなた）' : ''}</div>
                    <div className="text-2xl sm:text-3xl font-bold text-white">{score}pt</div>
                  </div>
                );
              })}
            </div>

            {(() => {
              const myFinalScore = myScore;
              const opScore = getPlayerScore(opponentUid);
              if (myFinalScore > opScore) return <p className="text-xl sm:text-2xl text-amber-400 font-bold">勝利！</p>;
              if (myFinalScore < opScore) return <p className="text-xl sm:text-2xl text-blue-400 font-bold">敗北...</p>;
              return <p className="text-xl sm:text-2xl text-gray-300 font-bold">引き分け</p>;
            })()}

            <button
              onClick={onBack}
              className="px-8 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold cursor-pointer transition-all"
            >
              タイトルに戻る
            </button>
          </div>
        )}
      </div>

      {/* 対応カード手札（ソロと同一コンポーネント） */}
      {isShipping && isMyTurn && (
        <ResponseHand
          hand={myResponseHand}
          onUseCard={handleUseDesignChange}
          disabled={localPhase !== 'shipping'}
        />
      )}

      {/* 不具合対応モーダル（ソロと同一コンポーネント） */}
      {localPhase === 'defect_response' && pendingDefect && (
        <DefectResponse
          defect={pendingDefect}
          hand={myResponseHand}
          onUseCard={handleUseResponseCard}
          onSkip={handleSkipDefect}
        />
      )}

      {/* イベント発動モーダル（ソロと同一デザイン） */}
      {localPhase === 'event_display' && pendingEvent && (
        <MultiEventModal
          event={pendingEvent}
          turnState={gameState.turnState}
          onDismiss={handleDismissEvent}
        />
      )}

      {/* 抜き取り検査モーダル */}
      {localPhase === 'sampling' && samplingCardsResolved.length > 0 && (
        <SamplingModal
          cards={samplingCardsResolved}
          onSelect={handleSelectSamplingCard}
          remaining={gameState.samplingNextRound ?? 0}
        />
      )}
    </div>
  );
}

// ===== マルチプレイヤー用イベントモーダル（ソロEventModalと同一デザイン） =====

function MultiEventModal({
  event,
  turnState,
  onDismiss,
}: {
  event: EventCard;
  turnState: MultiplayerGameState['turnState'];
  onDismiss: () => void;
}) {
  const icon = eventIcons[event.eventType] ?? '⚡';
  const colorClass = eventColors[event.eventType] ?? 'border-purple-500 bg-purple-900/40';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className={`border-2 rounded-t-xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full sm:mx-4 shadow-2xl ${colorClass}`}>
        <div className="text-center">
          <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">{icon}</div>
          <div className="text-lg sm:text-xl font-bold text-white mb-2">{event.name}</div>
          <div className="text-sm sm:text-base text-gray-300 whitespace-pre-line mb-4 sm:mb-6">
            {getMultiEventDescription(event, turnState)}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-4 py-3 min-h-[44px] bg-purple-700 hover:bg-purple-600 border border-purple-500
            rounded-lg text-white font-bold transition-all cursor-pointer"
        >
          了解
        </button>
      </div>
    </div>
  );
}

// ===== アクティブ効果表示（ソロと同一デザイン） =====

function ActiveEffectsMulti({ turnState }: { turnState: NonNullable<MultiplayerGameState['turnState']> }) {
  const effects: { icon: string; text: string; color: string }[] = [];

  if (turnState.snsFireActive) {
    effects.push({ icon: '🔥', text: 'SNS炎上: 次の不具合Pt2倍', color: 'text-orange-400' });
  }
  if (turnState.forcedDraws > 0) {
    effects.push({ icon: '⏰', text: `納期プレッシャー: あと${turnState.forcedDraws}枚強制`, color: 'text-yellow-400' });
  }
  if (turnState.panicThreshold < 3) {
    effects.push({ icon: '👴', text: `ベテラン退職: 閾値${turnState.panicThreshold}`, color: 'text-red-400' });
  }
  if (turnState.waterInspectionActive) {
    effects.push({ icon: '🛡️', text: '水際検査: 次の不具合自動無効', color: 'text-emerald-400' });
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
