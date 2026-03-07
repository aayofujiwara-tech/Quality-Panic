import type { Card } from '../game/types';

type Props = {
  flipping: boolean;
  flippingCard: Card | null;
};

function cardStyle(card: Card): string {
  switch (card.type) {
    case 'product':
      return 'bg-blue-900 border-blue-500 text-blue-200';
    case 'defect':
      if (card.severity === 'black') return 'bg-gray-900 border-gray-400 text-gray-200';
      if (card.severity === 'red') return 'bg-red-900 border-red-500 text-red-200';
      return 'bg-yellow-900 border-yellow-500 text-yellow-200';
    case 'event':
      return 'bg-purple-900 border-purple-500 text-purple-200';
  }
}

function cardIcon(card: Card): string {
  switch (card.type) {
    case 'product':
      return card.value >= 3 ? '💎' : card.value >= 2 ? '⭐' : '📋';
    case 'defect':
      return card.severity === 'black' ? '💀' : card.severity === 'red' ? '🔴' : '🟡';
    case 'event':
      return '⚡';
  }
}

function cardLabel(card: Card): string {
  switch (card.type) {
    case 'product':
      return `+${card.value}`;
    case 'defect':
      return card.name;
    case 'event':
      return card.name;
  }
}

export function CardFlipAnimation({ flipping, flippingCard }: Props) {
  if (!flipping || !flippingCard) return null;

  return (
    <div className="flex justify-center my-2">
      <div className="card-flip-container">
        <div className="card-flip w-14 h-18 sm:w-16 sm:h-22 md:w-20 md:h-28 relative">
          {/* 表面 */}
          <div className={`card-flip-front w-full h-full rounded-lg border-2 flex flex-col items-center justify-center ${cardStyle(flippingCard)}`}>
            <div className="text-lg sm:text-xl md:text-2xl">{cardIcon(flippingCard)}</div>
            <div className="text-[8px] sm:text-[10px] md:text-xs font-bold mt-0.5 text-center px-0.5">
              {cardLabel(flippingCard)}
            </div>
          </div>
          {/* 裏面 */}
          <div className="card-flip-back w-full h-full card-back-design" />
        </div>
      </div>
    </div>
  );
}
