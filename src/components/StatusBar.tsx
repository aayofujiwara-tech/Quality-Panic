type Props = {
  round: number;
  maxRounds: number;
  score: number;
  targetScore: number;
  difficulty: string;
  scoreCounting?: boolean;
  waterInspectionActive?: boolean;
};

export function StatusBar({ round, maxRounds, score, targetScore, difficulty, scoreCounting, waterInspectionActive }: Props) {
  return (
    <div className={`flex items-center justify-between bg-gray-800 px-3 sm:px-6 py-2 sm:py-3 border-b border-gray-700 ${waterInspectionActive ? 'shield-effect' : ''}`}>
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
  );
}
