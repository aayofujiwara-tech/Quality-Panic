import type { Card, DefectCard } from '../game/types';

type Props = {
  cards: Card[];
  onSelect: (index: number) => void;
  remaining?: number;
};

function cardIcon(card: Card): string {
  switch (card.type) {
    case 'product':
      return '📦';
    case 'defect':
      return card.severity === 'black' ? '☠️' : card.severity === 'red' ? '🔴' : '🟡';
    case 'event':
      return '⚡';
  }
}

function cardColor(card: Card): string {
  switch (card.type) {
    case 'product':
      return 'border-blue-400 bg-blue-900/40 hover:bg-blue-800/60';
    case 'defect': {
      const d = card as DefectCard;
      if (d.severity === 'black') return 'border-gray-300 bg-gray-800/60 hover:bg-gray-700/60';
      if (d.severity === 'red') return 'border-red-400 bg-red-900/40 hover:bg-red-800/60';
      return 'border-yellow-400 bg-yellow-900/40 hover:bg-yellow-800/60';
    }
    case 'event':
      return 'border-purple-400 bg-purple-900/40 hover:bg-purple-800/60';
  }
}

function cardLabel(card: Card): string {
  switch (card.type) {
    case 'product':
      return `${card.name}（+${card.value}点）`;
    case 'defect':
      return `${card.name}（${card.defectPoints}Pt）`;
    case 'event':
      return card.name;
  }
}

function cardEffect(card: Card): string {
  switch (card.type) {
    case 'product':
      return '選択 → このラウンドの利益として確保';
    case 'defect':
      return '選択 → ゲームから除外';
    case 'event':
      return '選択 → 即座に効果発動';
  }
}

export function SamplingModal({ cards, onSelect, remaining = 0 }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50">
      <div className="border-2 border-teal-500 bg-gray-900/95 rounded-t-xl sm:rounded-xl p-4 sm:p-6 max-w-2xl w-full sm:mx-4 shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="text-center mb-4 sm:mb-6">
          <div className="text-2xl sm:text-3xl mb-2">🔍</div>
          <div className="text-base sm:text-xl font-bold text-teal-300">
            抜き取り検査 — 3枚から1枚を選択
          </div>
          <div className="text-xs sm:text-sm text-gray-400 mt-1">
            選ばなかった2枚は山札に戻されます
          </div>
          {remaining > 0 && (
            <div className="text-xs sm:text-sm text-teal-400 mt-1">
              あと{remaining}回の検査が残っています
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          {cards.map((card, i) => (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`border-2 rounded-lg p-3 sm:p-4 flex flex-row sm:flex-col items-center gap-2 sm:gap-2
                min-h-[44px] transition-all cursor-pointer ${cardColor(card)}`}
            >
              <div className="text-2xl sm:text-3xl">{cardIcon(card)}</div>
              <div className="flex-1 sm:flex-none text-left sm:text-center">
                <div className="text-sm font-bold text-white">{cardLabel(card)}</div>
                <div className="text-xs text-gray-300">{cardEffect(card)}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
