import type { ResponseCard } from '../game/types';

type Props = {
  hand: ResponseCard[];
  onUseCard: (index: number) => void;
  disabled?: boolean;
  highlightUsable?: boolean; // 不具合対応時にtrue
};

const cardColor: Record<string, string> = {
  first_aid: 'bg-green-900 border-green-500 text-green-200 hover:bg-green-800',
  root_cause: 'bg-teal-900 border-teal-500 text-teal-200 hover:bg-teal-800',
  inspection: 'bg-emerald-900 border-emerald-500 text-emerald-200 hover:bg-emerald-800',
  design_change: 'bg-cyan-900 border-cyan-400 text-cyan-200 hover:bg-cyan-800',
};

const cardIcon: Record<string, string> = {
  first_aid: '🩹',
  root_cause: '🔍',
  inspection: '🛡️',
  design_change: '⚙️',
};

export function ResponseHand({ hand, onUseCard, disabled, highlightUsable }: Props) {
  if (hand.length === 0) return null;

  return (
    <div className="border-t border-gray-700 px-3 sm:px-6 py-2 sm:py-3">
      <div className="text-xs text-gray-500 mb-1.5 sm:mb-2">対応カード手札 ({hand.length}/3)</div>
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {hand.map((card, i) => {
          const isDefectResponse = card.responseType !== 'design_change';
          const isHighlighted = highlightUsable && isDefectResponse;
          return (
            <button
              key={i}
              onClick={() => onUseCard(i)}
              disabled={disabled}
              className={`px-2 sm:px-3 py-2 min-h-[44px] rounded border text-xs sm:text-sm font-medium transition-all cursor-pointer
                ${cardColor[card.responseType]}
                ${isHighlighted ? 'ring-2 ring-yellow-400 scale-105' : ''}
                ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
              `}
              title={card.description}
            >
              <span className="mr-0.5 sm:mr-1">{cardIcon[card.responseType]}</span>
              {card.name}
            </button>
          );
        })}
      </div>
    </div>
  );
}
