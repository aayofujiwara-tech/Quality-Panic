import type { Card } from '../game/types';

type Props = {
  cards: Card[];
  currentProfit: number;
  currentDefectPoints: number;
  panicThreshold: number;
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

function cardLabel(card: Card): string {
  switch (card.type) {
    case 'product':
      return `${card.name} +${card.value}`;
    case 'defect':
      return `${card.name} (${card.defectPoints}pt)`;
    case 'event':
      return card.name;
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

export function DrawnCards({ cards, currentProfit, currentDefectPoints, panicThreshold }: Props) {
  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 sm:gap-4 mb-2 sm:mb-3 flex-wrap">
        <span className="text-xs sm:text-sm text-gray-400">累計利益:</span>
        <span className="text-base sm:text-xl font-bold text-blue-400">{currentProfit}点</span>
        <span className="text-xs sm:text-sm text-gray-400 ml-2 sm:ml-4">不具合Pt:</span>
        <span className={`text-base sm:text-xl font-bold ${
          currentDefectPoints === 0 ? 'text-green-400' :
          currentDefectPoints >= panicThreshold - 1 ? 'text-red-400' :
          'text-yellow-400'
        }`}>
          {currentDefectPoints}/{panicThreshold}
        </span>
      </div>

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        {cards.map((card, i) => (
          <div
            key={i}
            className={`px-2 py-1 sm:px-3 sm:py-2 rounded border text-xs sm:text-sm font-medium ${cardStyle(card)}`}
          >
            <span className="mr-0.5 sm:mr-1">{cardIcon(card)}</span>
            {cardLabel(card)}
          </div>
        ))}
        {cards.length === 0 && (
          <div className="text-gray-500 text-xs sm:text-sm">まだカードをめくっていません</div>
        )}
      </div>
    </div>
  );
}
