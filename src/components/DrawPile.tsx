import type { Card, DefectCard } from '../game/types';

type Props = {
  remaining: number;
  defectRate: number;
  drawPile: Card[];
  nextContamination?: { count: number; tentative: boolean };
};

export function DrawPile({ remaining, defectRate, drawPile, nextContamination }: Props) {
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
      {/* 山札アイコン */}
      <div className="w-16 h-20 md:w-24 md:h-32 bg-gray-700 border-2 border-gray-500 rounded-lg flex flex-col items-center justify-center shadow-lg shrink-0">
        <div className="text-xl md:text-3xl mb-0.5 md:mb-1">📦</div>
        <div className="text-xs md:text-sm text-gray-300">山札</div>
        <div className="text-sm md:text-lg font-bold text-white">{remaining}枚</div>
        <div className={`text-[10px] md:text-xs ${ratePercent < 20 ? 'text-green-400' : ratePercent < 40 ? 'text-yellow-400' : 'text-red-400'}`}>
          (不具合 {ratePercent}%)
        </div>
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
