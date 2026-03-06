import type { RoundResult } from '../game/types';

type Props = {
  history: RoundResult[];
  currentRound: number;
};

export function RoundHistory({ history, currentRound }: Props) {
  return (
    <div className="bg-gray-800 px-3 sm:px-6 py-2 sm:py-3 border-t border-gray-700">
      <div className="flex gap-2 sm:gap-3 items-center overflow-x-auto">
        {history.map((r) => (
          <div
            key={r.round}
            className={`text-xs sm:text-sm px-2 sm:px-3 py-1 rounded shrink-0 ${
              r.panicked
                ? 'bg-red-900/50 text-red-400 border border-red-700'
                : 'bg-green-900/50 text-green-400 border border-green-700'
            }`}
          >
            R{r.round}: {r.panicked ? 'パニック!' : `${r.profit}点`}
          </div>
        ))}
        {history.length < currentRound && (
          <div className="text-xs sm:text-sm px-2 sm:px-3 py-1 rounded shrink-0 bg-amber-900/50 text-amber-400 border border-amber-700">
            R{currentRound}: 進行中...
          </div>
        )}
      </div>
    </div>
  );
}
