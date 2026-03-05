import { useState, useEffect } from 'react';
import { listenRoom, leaveRoom, updateRoomStatus } from '../firebase/roomManager';
import type { Room } from '../game/types';

type Props = {
  roomCode: string;
  uid: string;
  onGameStart: (room: Room) => void;
  onBack: () => void;
};

export function WaitingRoom({ roomCode, uid, onGameStart, onBack }: Props) {
  const [room, setRoom] = useState<Room | null>(null);
  const [leaving, setLeaving] = useState(false);

  const isHost = room?.hostUid === uid;
  const players = room?.players ? Object.entries(room.players) : [];
  const playerCount = players.length;
  const canStart = isHost && playerCount === 2;

  useEffect(() => {
    const unsub = listenRoom(roomCode, (r) => {
      if (!r) {
        // ルームが削除された（ホストが退出）
        onBack();
        return;
      }
      setRoom(r);

      // ゲーム開始を検知
      if (r.status === 'playing') {
        onGameStart(r);
      }
    });
    return unsub;
  }, [roomCode, onBack, onGameStart]);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await leaveRoom(roomCode, uid, isHost);
      onBack();
    } catch {
      setLeaving(false);
    }
  };

  const handleStart = async () => {
    if (!canStart || !room) return;
    // ステータスを playing に変更（Step 3でゲーム初期化処理を追加）
    await updateRoomStatus(roomCode, 'playing');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-amber-400 mb-2">待機中</h1>
        <p className="text-gray-400">対戦相手の参加を待っています</p>
      </div>

      {/* ルームコード表示 */}
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 text-center">
        <div className="text-sm text-gray-400 mb-2">ルームコード</div>
        <div className="text-4xl font-mono font-bold text-white tracking-widest">
          {roomCode}
        </div>
        <div className="text-xs text-gray-500 mt-2">このコードを対戦相手に伝えてください</div>
      </div>

      {/* プレイヤーリスト */}
      <div className="w-72 flex flex-col gap-3">
        <div className="text-sm text-gray-400 text-center">プレイヤー ({playerCount}/2)</div>
        {players.map(([playerUid, info]) => (
          <div
            key={playerUid}
            className="flex items-center justify-between px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg"
          >
            <div className="flex items-center gap-2">
              <div
                className={`w-2 h-2 rounded-full ${info.connected ? 'bg-green-400' : 'bg-red-400'}`}
              />
              <span className="text-white">{info.name}</span>
            </div>
            <div className="flex items-center gap-2">
              {playerUid === room?.hostUid && (
                <span className="text-xs text-amber-400 border border-amber-400/30 px-2 py-0.5 rounded">
                  ホスト
                </span>
              )}
              {playerUid === uid && (
                <span className="text-xs text-blue-400">あなた</span>
              )}
            </div>
          </div>
        ))}

        {playerCount < 2 && (
          <div className="flex items-center justify-center px-4 py-3 bg-gray-800/50 border border-dashed border-gray-600 rounded-lg">
            <span className="text-gray-500">待機中...</span>
          </div>
        )}
      </div>

      {/* ボタン */}
      <div className="flex flex-col gap-3 w-72">
        {isHost && (
          <button
            onClick={handleStart}
            disabled={!canStart}
            className="px-6 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
          >
            {canStart ? 'ゲーム開始' : '相手を待っています...'}
          </button>
        )}

        <button
          onClick={handleLeave}
          disabled={leaving}
          className="px-6 py-2 text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
        >
          {isHost ? 'ルームを閉じる' : 'ルームを退出'}
        </button>
      </div>
    </div>
  );
}
