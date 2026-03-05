import type { DefectCard, ResponseCard } from '../game/types';

type Props = {
  defect: DefectCard;
  hand: ResponseCard[];
  onUseCard: (index: number) => void;
  onSkip: () => void;
};

const cardIcon: Record<string, string> = {
  first_aid: '🩹',
  root_cause: '🔍',
  inspection: '🛡️',
};

export function DefectResponse({ defect, hand, onUseCard, onSkip }: Props) {
  const usableCards = hand
    .map((card, index) => ({ card, index }))
    .filter(({ card }) =>
      card.responseType === 'first_aid' ||
      card.responseType === 'root_cause' ||
      card.responseType === 'inspection'
    );

  const severityLabel = defect.severity === 'black' ? '💀 リコール級'
    : defect.severity === 'red' ? '🔴 重大な不具合'
    : '🟡 軽微な不具合';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-xl p-6 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center mb-4">
          <div className="text-lg text-red-400 font-bold mb-1">不具合発生！</div>
          <div className="text-2xl font-bold text-white mb-1">{severityLabel}</div>
          <div className="text-gray-400">不具合Pt: {defect.defectPoints}</div>
        </div>

        <div className="border-t border-gray-700 pt-4 mb-4">
          <div className="text-sm text-gray-400 mb-3">対応カードを使いますか？</div>
          <div className="flex flex-col gap-2">
            {usableCards.map(({ card, index }) => (
              <button
                key={index}
                onClick={() => onUseCard(index)}
                className="flex items-center gap-3 px-4 py-3 bg-green-900/60 border border-green-600 rounded-lg
                  hover:bg-green-800 transition-all text-left cursor-pointer"
              >
                <span className="text-xl">{cardIcon[card.responseType]}</span>
                <div>
                  <div className="font-bold text-green-200">{card.name}</div>
                  <div className="text-xs text-green-400">{card.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onSkip}
          className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg
            hover:bg-gray-600 transition-all text-gray-300 cursor-pointer"
        >
          対応しない（不具合Ptを受ける）
        </button>
      </div>
    </div>
  );
}
