import type { Card, DefectCard } from '../game/types';

type Props = {
  round: number;
  maxRounds: number;
  score: number;
  targetScore: number;
  difficulty: string;
  scoreCounting?: boolean;
  waterInspectionActive?: boolean;
  // 山札情報（PC統合用）
  deckRemaining?: number;
  defectRate?: number;
  drawPile?: Card[];
  nextContamination?: { count: number; tentative: boolean };
};

export function StatusBar({
  round, maxRounds, score, targetScore, difficulty, scoreCounting, waterInspectionActive,
  deckRemaining, defectRate, drawPile, nextContamination,
}: Props) {
  const ratePercent = defectRate != null ? Math.round(defectRate * 100) : 0;
  const rateColor = ratePercent < 20 ? 'text-green-400' : ratePercent < 40 ? 'text-yellow-400' : 'text-red-400';

  // 山札内訳
  let deckBreakdown: { products: number; defects: number; events: number } | null = null;
  if (drawPile) {
    const products = drawPile.filter(c => c.type === 'product').length;
    const defects = drawPile.filter((c): c is DefectCard => c.type === 'defect').length;
    const events = drawPile.filter(c => c.type === 'event').length;
    deckBreakdown = { products, defects, events };
  }

  return (
    <div className={`bg-gray-800 border-b border-gray-700 ${waterInspectionActive ? 'shield-effect' : ''}`}>
      {/* 1行目: ゲーム情報 */}
      <div className="flex items-center justify-between px-3 sm:px-6 py-1.5 sm:py-2">
        <h1 className="text-base sm:text-xl font-bold text-amber-400 shrink-0">品証パニック</h1>
        <div className="flex gap-3 sm:gap-6 text-xs sm:text-sm flex-wrap justify-end">
          <span className="text-gray-300">
            R<span className="text-white font-bold text-sm sm:text-base">{round}</span>/{maxRounds}
          </span>
          <span className="text-gray-300">
            スコア: <span className={`font-bold text-sm sm:text-base ${scoreCounting ? 'score-count-up' : ''} ${score >= targetScore ? 'text-green-400' : 'text-white'}`}>{score}</span>
            <span className="text-gray-500">/{targetScore}</span>
          </span>
          <span className="text-gray-500 hidden sm:inline">{difficulty}</span>
        </div>
      </div>

      {/* 2行目: 山札情報（PC: 常時表示、スマホ: 非表示=DrawPileコンポーネントで表示） */}
      {deckRemaining != null && (
        <div className="hidden md:flex items-center gap-4 px-3 sm:px-6 py-1 border-t border-gray-700/50 text-xs text-gray-400">
          <span>
            📦 山札 <span className="text-white font-bold">{deckRemaining}</span>枚
          </span>
          <span className={rateColor}>
            不具合率 {ratePercent}%
          </span>
          {deckBreakdown && (
            <span className="flex gap-2">
              <span className="text-blue-300">製品{deckBreakdown.products}</span>
              <span className="text-yellow-400">不具合{deckBreakdown.defects}</span>
              <span className="text-purple-300">イベント{deckBreakdown.events}</span>
            </span>
          )}
          {nextContamination && nextContamination.count > 0 && (
            <span className="text-red-300">
              次R汚染: +{nextContamination.count}枚{nextContamination.tentative ? '~' : ''}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
