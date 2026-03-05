import type { Card, DefectCard } from '../game/types';

type Props = {
  remaining: number;
  defectRate: number;
  drawPile: Card[];
};

export function DrawPile({ remaining, defectRate, drawPile }: Props) {
  const ratePercent = Math.round(defectRate * 100);
  const barColor =
    ratePercent < 20 ? 'bg-green-500' :
    ratePercent < 40 ? 'bg-yellow-500' :
    'bg-red-500';

  // カテゴリ別カウント
  const products = drawPile.filter(c => c.type === 'product').length;
  const defects = drawPile.filter((c): c is DefectCard => c.type === 'defect');
  const yellow = defects.filter(d => d.severity === 'yellow').length;
  const red = defects.filter(d => d.severity === 'red').length;
  const black = defects.filter(d => d.severity === 'black').length;
  const events = drawPile.filter(c => c.type === 'event').length;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="w-24 h-32 bg-gray-700 border-2 border-gray-500 rounded-lg flex flex-col items-center justify-center shadow-lg">
        <div className="text-3xl mb-1">📦</div>
        <div className="text-sm text-gray-300">山札</div>
        <div className="text-lg font-bold text-white">{remaining}枚</div>
      </div>
      <div className="w-24">
        <div className="text-xs text-gray-400 text-center mb-1">不良率 {ratePercent}%</div>
        <div className="w-full bg-gray-600 rounded-full h-2">
          <div
            className={`h-2 rounded-full transition-all duration-300 ${barColor}`}
            style={{ width: `${ratePercent}%` }}
          />
        </div>
      </div>
      {/* カテゴリ別内訳 */}
      <div className="w-28 text-xs space-y-1 mt-1">
        <div className="flex justify-between text-blue-300">
          <span>📦 製品</span>
          <span>{products}</span>
        </div>
        <div className="flex justify-between text-gray-300">
          <span>⚠️ 不具合</span>
          <span>{yellow + red + black}</span>
        </div>
        <div className="flex justify-between pl-3">
          <span className="text-yellow-400">黄</span>
          <span className="text-yellow-400">{yellow}</span>
        </div>
        <div className="flex justify-between pl-3">
          <span className="text-red-400">赤</span>
          <span className="text-red-400">{red}</span>
        </div>
        {black > 0 && (
          <div className="flex justify-between pl-3">
            <span className="text-gray-100">黒</span>
            <span className="text-gray-100">{black}</span>
          </div>
        )}
        <div className="flex justify-between text-purple-300">
          <span>⚡ イベント</span>
          <span>{events}</span>
        </div>
      </div>
    </div>
  );
}
