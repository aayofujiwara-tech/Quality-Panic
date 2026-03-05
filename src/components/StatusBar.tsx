type Props = {
  round: number;
  maxRounds: number;
  score: number;
  targetScore: number;
  difficulty: string;
};

export function StatusBar({ round, maxRounds, score, targetScore, difficulty }: Props) {
  return (
    <div className="flex items-center justify-between bg-gray-800 px-6 py-3 border-b border-gray-700">
      <h1 className="text-xl font-bold text-amber-400">品証パニック</h1>
      <div className="flex gap-6 text-sm">
        <span className="text-gray-300">
          R<span className="text-white font-bold text-base">{round}</span>/{maxRounds}
        </span>
        <span className="text-gray-300">
          スコア: <span className={`font-bold text-base ${score >= targetScore ? 'text-green-400' : 'text-white'}`}>{score}</span>
          <span className="text-gray-500">/{targetScore}</span>
        </span>
        <span className="text-gray-500">{difficulty}</span>
      </div>
    </div>
  );
}
