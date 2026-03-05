import { DIFFICULTIES } from '../game/constants';
import type { Difficulty } from '../game/types';

type Props = {
  onStart: (difficulty: Difficulty) => void;
};

export function TitleScreen({ onStart }: Props) {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-8">
      <div className="text-center">
        <h1 className="text-5xl font-bold text-amber-400 mb-2">品証パニック</h1>
        <p className="text-gray-400 text-lg">Quality Panic - ソロモード</p>
      </div>

      <p className="text-gray-500 text-sm max-w-md text-center">
        品質保証テーマのプッシュ・ユア・ラック系カードゲーム。
        山札からカードをめくり、パニックを起こさずに利益を稼げ！
      </p>

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
      </div>
    </div>
  );
}
