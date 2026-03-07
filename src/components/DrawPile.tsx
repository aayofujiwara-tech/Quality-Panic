import type { Card, DefectCard } from '../game/types';

type Props = {
  remaining: number;
  defectRate: number;
  drawPile: Card[];
  nextContamination?: { count: number; tentative: boolean };
  flipping?: boolean;
  flippingCard?: Card | null;
};

function flippingCardStyle(card: Card): string {
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

function flippingCardIcon(card: Card): string {
  switch (card.type) {
    case 'product':
      return card.value >= 3 ? '💎' : card.value >= 2 ? '⭐' : '📋';
    case 'defect':
      return card.severity === 'black' ? '💀' : card.severity === 'red' ? '🔴' : '🟡';
    case 'event':
      return '⚡';
  }
}

export function DrawPile({ remaining, defectRate, drawPile, nextContamination, flipping, flippingCard }: Props) {
  const ratePercent = Math.round(defectRate * 100);
  const barColor =
    ratePercent < 20 ? 'bg-green-500' :
    ratePercent < 40 ? 'bg-yellow-500' :
    'bg-red-500';

  const products = drawPile.filter(c => c.type === 'product').length;
  const defects = drawPile.filter((c): c is DefectCard => c.type === 'defect');
  const yellow = defects.filter(d => d.severity === 'yellow').length;
  const red = defects.filter(d => d.severity === 'red').length;
  const black = defects.filter(d => d.severity === 'black').length;
  const events = drawPile.filter(c => c.type === 'event').length;

  return (
    <div className="flex flex-row md:flex-col items-center gap-3 md:gap-2 bg-gray-800/50 md:bg-transparent rounded-lg p-2 md:p-0">
      {/* 山札アイコン + フリップアニメーション */}
      <div className="relative shrink-0">
        <div className="w-16 h-20 md:w-24 md:h-32 bg-gray-700 border-2 border-gray-500 rounded-lg flex flex-col items-center justify-center shadow-lg">
          <div className="text-xl md:text-3xl mb-0.5 md:mb-1">📦</div>
          <div className="text-xs md:text-sm text-gray-300">山札</div>
          <div className="text-sm md:text-lg font-bold text-white">{remaining}枚</div>
          <div className={`text-[10px] md:text-xs ${ratePercent < 20 ? 'text-green-400' : ratePercent < 40 ? 'text-yellow-400' : 'text-red-400'}`}>
            (不具合 {ratePercent}%)
          </div>
        </div>

        {/* カードフリップ演出 */}
        {flipping && flippingCard && (
          <div className="absolute -right-2 -top-2 md:-right-4 md:-top-4 card-flip-container z-10">
            <div className="card-flip w-14 h-18 md:w-20 md:h-28 relative">
              {/* 表面 */}
              <div className={`card-flip-front w-full h-full rounded-lg border-2 flex flex-col items-center justify-center ${flippingCardStyle(flippingCard)}`}>
                <div className="text-lg md:text-2xl">{flippingCardIcon(flippingCard)}</div>
                <div className="text-[8px] md:text-xs font-bold mt-0.5 text-center px-0.5">
                  {flippingCard.type === 'product' ? `+${flippingCard.value}` :
                   flippingCard.type === 'defect' ? flippingCard.name :
                   flippingCard.name}
                </div>
              </div>
              {/* 裏面 */}
              <div className="card-flip-back w-full h-full card-back-design" />
            </div>
          </div>
        )}
      </div>

      {/* 不良率バー */}
      <div className="flex flex-col gap-1 min-w-[80px] md:w-24">
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full defect-bar-animate ${barColor}`}
            style={{ width: `${ratePercent}%` }}
          />
        </div>
      </div>

      {/* カテゴリ別内訳 */}
      <div className="flex flex-row md:flex-col gap-2 md:gap-1 md:w-28 text-xs md:mt-1">
        <div className="flex gap-1 md:justify-between text-blue-300">
          <span className="hidden md:inline">📦 製品</span>
          <span className="md:hidden">📦</span>
          <span>{products}</span>
        </div>
        <div className="flex gap-1 md:justify-between text-gray-300">
          <span className="hidden md:inline">⚠️ 不具合</span>
          <span className="md:hidden">⚠️</span>
          <span>{yellow + red + black}</span>
        </div>
        <div className="hidden md:flex justify-between pl-3">
          <span className="text-yellow-400">黄</span>
          <span className="text-yellow-400">{yellow}</span>
        </div>
        <div className="hidden md:flex justify-between pl-3">
          <span className="text-red-400">赤</span>
          <span className="text-red-400">{red}</span>
        </div>
        {black > 0 && (
          <div className="hidden md:flex justify-between pl-3">
            <span className="text-gray-100">黒</span>
            <span className="text-gray-100">{black}</span>
          </div>
        )}
        <div className="flex gap-1 md:justify-between text-purple-300">
          <span className="hidden md:inline">⚡ イベント</span>
          <span className="md:hidden">⚡</span>
          <span>{events}</span>
        </div>
      </div>

      {/* 次ラウンド汚染予測 */}
      {nextContamination && (
        <div className="text-xs text-center md:w-28 px-2 py-1 rounded bg-red-900/30 border border-red-800/50">
          <span className="text-red-300">
            次R汚染: <span className="font-bold text-red-200">+{nextContamination.count}枚{nextContamination.tentative ? '〜' : ''}</span>
          </span>
        </div>
      )}
    </div>
  );
}
