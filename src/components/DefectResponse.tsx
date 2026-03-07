import type { DefectCard, ResponseCard } from '../game/types';

type Props = {
  defect: DefectCard;
  hand: ResponseCard[];
  onUseCard: (index: number) => void;
  onSkip: () => void;
  disabled?: boolean;
  cardUsingIndex?: number | null;
};

const cardIcon: Record<string, string> = {
  first_aid: '🩹',
  root_cause: '🔍',
  inspection: '🛡️',
};

export function DefectResponse({ defect, hand, onUseCard, onSkip, disabled, cardUsingIndex }: Props) {
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
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className="bg-gray-800 border border-gray-600 rounded-t-xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full sm:mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-3 sm:mb-4">
          <div className="text-base sm:text-lg text-red-400 font-bold mb-1">不具合発生！</div>
          <div className="text-xl sm:text-2xl font-bold text-white mb-1">{severityLabel}</div>
          <div className="text-sm sm:text-base text-gray-400">不具合Pt: {defect.defectPoints}</div>
        </div>

        <div className="border-t border-gray-700 pt-3 sm:pt-4 mb-3 sm:mb-4">
          <div className="text-sm text-gray-400 mb-2 sm:mb-3">対応カードを使いますか？</div>
          <div className="flex flex-col gap-2">
            {usableCards.map(({ card, index }) => (
              <button
                key={index}
                onClick={() => !disabled && onUseCard(index)}
                disabled={disabled}
                className={`flex items-center gap-3 px-3 sm:px-4 py-3 min-h-[44px] bg-green-900/60 border border-green-600 rounded-lg
                  hover:bg-green-800 transition-all text-left cursor-pointer
                  ${cardUsingIndex === index ? 'card-use-glow' : ''}
                  ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-lg sm:text-xl">{cardIcon[card.responseType]}</span>
                <div>
                  <div className="font-bold text-sm sm:text-base text-green-200">{card.name}</div>
                  <div className="text-xs text-green-400">{card.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={onSkip}
          className="w-full px-4 py-3 min-h-[44px] bg-gray-700 border border-gray-600 rounded-lg
            hover:bg-gray-600 transition-all text-gray-300 cursor-pointer text-sm sm:text-base"
        >
          対応しない（不具合Ptを受ける）
        </button>
      </div>
    </div>
  );
}
