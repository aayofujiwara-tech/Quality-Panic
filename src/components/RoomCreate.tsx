import { useState } from 'react';
import { signInAnonymous } from '../firebase/auth';
import { createRoom } from '../firebase/roomManager';

type Props = {
  onCreated: (roomCode: string, uid: string) => void;
  onBack: () => void;
};

export function RoomCreate({ onCreated, onBack }: Props) {
  const [status, setStatus] = useState<'input' | 'creating' | 'error'>('input');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const name = playerName.trim() || 'プレイヤー1';
    setStatus('creating');
    setError('');

    try {
      const user = await signInAnonymous();
      const code = await createRoom(user.uid, name);
      onCreated(code, user.uid);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'ルーム作成に失敗しました');
      setStatus('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 sm:gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl sm:text-4xl font-bold text-amber-400 mb-2">ルームを作る</h1>
        <p className="text-sm sm:text-base text-gray-400">対戦相手にルームコードを伝えてください</p>
      </div>

      <div className="flex flex-col gap-4 w-full max-w-[320px]">
        <div>
          <label className="block text-sm text-gray-400 mb-1">プレイヤー名</label>
          <input
            type="text"
            value={playerName}
            onChange={(e) => setPlayerName(e.target.value)}
            placeholder="プレイヤー1"
            maxLength={10}
            className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-blue-500 focus:outline-none"
            disabled={status === 'creating'}
          />
        </div>

        {error && (
          <p className="text-red-400 text-sm text-center">{error}</p>
        )}

        <button
          onClick={handleCreate}
          disabled={status === 'creating'}
          className="px-6 py-3 min-h-[44px] bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 rounded-lg text-white font-medium transition-all cursor-pointer disabled:cursor-not-allowed"
        >
          {status === 'creating' ? '作成中...' : 'ルームを作成'}
        </button>

        <button
          onClick={onBack}
          disabled={status === 'creating'}
          className="px-6 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
        >
          戻る
        </button>
      </div>
    </div>
  );
}
