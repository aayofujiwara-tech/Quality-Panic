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

// PC: コンパクト、スマホ: 従来サイズ
const CARD_SIZE = 'w-12 h-[60px] sm:w-14 sm:h-[68px] md:w-14 md:h-[68px]';

export function CardFlipAnimation({ flipping, flippingCard }: Props) {
  return (
    <div className="flex justify-center my-0.5">
      {flipping && flippingCard ? (
        <div className="card-flip-container">
          <div className={`card-flip ${CARD_SIZE} relative`}>
            {/* 表面 */}
            <div className={`card-flip-front w-full h-full rounded-lg border-2 flex flex-col items-center justify-center ${cardStyle(flippingCard)}`}>
              <div className="text-base sm:text-lg md:text-xl">{cardIcon(flippingCard)}</div>
              <div className="text-[7px] sm:text-[8px] md:text-[10px] font-bold mt-0.5 text-center px-0.5">
                {cardLabel(flippingCard)}
              </div>
            </div>
            {/* 裏面 */}
            <div className="card-flip-back w-full h-full card-back-design" />
          </div>
        </div>
      ) : (
        <div className={`${CARD_SIZE} rounded-lg border-2 border-dashed border-gray-600 flex items-center justify-center`}>
          <span className="text-[8px] sm:text-[9px] md:text-[10px] text-gray-600 text-center leading-tight">
            次の<br />出荷
          </span>
        </div>
      )}
    </div>
  );
}
