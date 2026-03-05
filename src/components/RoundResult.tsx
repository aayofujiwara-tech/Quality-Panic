import type { RoundResult as RoundResultType } from '../game/types';

type Props = {
  result: RoundResultType;
  totalScore: number;
  targetScore: number;
  onNext: () => void;
};

export function RoundResultView({ result, totalScore, targetScore, onNext }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      {result.panicked ? (
        <>
          <div className="text-4xl font-bold text-red-400">パニック発生！</div>
          <div className="text-gray-400">このラウンドの利益は全て失われました...</div>
          <div className="text-sm text-red-300">汚染ストックから3枚が山札に追加投入されました</div>
        </>
      ) : (
        <>
          <div className="text-4xl font-bold text-green-400">出荷完了！</div>
          <div className="text-2xl text-white">
            +{result.profit}点 獲得
          </div>
        </>
      )}

      <div className="text-gray-300 mt-4">
        累計スコア: <span className="text-xl font-bold text-white">{totalScore}</span>
        <span className="text-gray-500">/{targetScore}</span>
      </div>

      <div className="text-sm text-gray-500">
        {result.cardsDrawn}枚めくりました
      </div>

      <button
        onClick={onNext}
        className="mt-4 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-lg cursor-pointer transition-all"
      >
        次のラウンドへ
      </button>
    </div>
  );
}
