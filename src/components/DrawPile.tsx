type Props = {
  remaining: number;
  defectRate: number;
};

export function DrawPile({ remaining, defectRate }: Props) {
  const ratePercent = Math.round(defectRate * 100);
  const barColor =
    ratePercent < 20 ? 'bg-green-500' :
    ratePercent < 40 ? 'bg-yellow-500' :
    'bg-red-500';

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
    </div>
  );
}
