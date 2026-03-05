import type { GameState } from '../game/types';

type Props = {
  state: GameState;
  onRestart: () => void;
};

export function GameOverScreen({ state, onRestart }: Props) {
  const isCleared = state.gameResult === 'clear';

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className={`text-5xl font-bold ${isCleared ? 'text-green-400' : 'text-red-400'}`}>
        {isCleared ? '🎉 クリア！' : '😱 ゲームオーバー'}
      </div>

      <div className="text-2xl text-gray-300">
        最終スコア: <span className="font-bold text-white">{state.score}</span>
        <span className="text-gray-500">/{state.targetScore}</span>
      </div>

      <div className="text-gray-400">
        難易度: {state.difficulty} | {state.roundHistory.length}ラウンド完了
      </div>

      <div className="flex flex-col gap-1 mt-4 bg-gray-800 rounded-lg p-4 min-w-[300px]">
        <div className="text-sm text-gray-400 mb-2">ラウンド結果</div>
        {state.roundHistory.map((r) => (
          <div key={r.round} className="flex justify-between text-sm">
            <span className="text-gray-300">R{r.round}</span>
            <span className={r.panicked ? 'text-red-400' : 'text-green-400'}>
              {r.panicked ? 'パニック!' : `+${r.profit}点`}
            </span>
            <span className="text-gray-500">{r.cardsDrawn}枚</span>
          </div>
        ))}
      </div>

      <button
        onClick={onRestart}
        className="mt-4 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-lg cursor-pointer transition-all"
      >
        もう一度プレイ
      </button>
    </div>
  );
}
