import { useState } from 'react';
import { DIFFICULTIES } from '../game/constants';
import type { Difficulty } from '../game/types';

export type GameMode = 'solo' | 'create_room' | 'join_room';

type Props = {
  onStart: (difficulty: Difficulty) => void;
  onMultiplayer?: (mode: 'create_room' | 'join_room') => void;
};

export function TitleScreen({ onStart, onMultiplayer }: Props) {
  const [screen, setScreen] = useState<'top' | 'solo_difficulty'>('top');

  if (screen === 'solo_difficulty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-8">
        <div className="text-center">
          <h1 className="text-5xl font-bold text-amber-400 mb-2">品証パニック</h1>
          <p className="text-gray-400 text-lg">ソロモード</p>
        </div>

        <div className="flex flex-col gap-3 w-64">
          <div className="text-sm text-gray-400 text-center mb-1">難易度を選択</div>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.name}
              onClick={() => onStart(d)}
              className="px-6 py-3 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-lg text-white font-medium transition-all cursor-pointer"
            >
              {d.name}
              <span className="text-gray-400 ml-2 text-sm">（目標{d.targetScore}点）</span>
            </button>
          ))}
          <button
            onClick={() => setScreen('top')}
            className="mt-2 px-6 py-2 text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-amber-400 mb-2">品証パニック</h1>
        <p className="text-gray-400 text-lg">Quality Panic</p>
      </div>

      <p className="text-gray-500 text-sm max-w-md text-center">
        品質保証テーマのプッシュ・ユア・ラック系カードゲーム。
        山札からカードをめくり、パニックを起こさずに利益を稼げ！
      </p>

      <div className="flex flex-col gap-3 w-64">
        <button
          onClick={() => setScreen('solo_difficulty')}
          className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ソロプレイ
          <span className="block text-gray-400 text-xs mt-1">1人で目標スコアに挑戦</span>
        </button>

        <div className="text-sm text-gray-500 text-center my-1">── 2人対戦 ──</div>

        <button
          onClick={() => onMultiplayer?.('create_room')}
          className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ルームを作る
          <span className="block text-gray-400 text-xs mt-1">ルームコードを発行して対戦相手を待つ</span>
        </button>

        <button
          onClick={() => onMultiplayer?.('join_room')}
          className="px-6 py-4 bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ルームに入る
          <span className="block text-gray-400 text-xs mt-1">ルームコードを入力して参加</span>
        </button>
      </div>
    </div>
  );
}
