import { useState, useEffect } from 'react';
import type { GameState } from '../game/types';
import { saveHighScore } from '../game/highscore';
import { submitRanking, isValidPlayerName } from '../firebase/ranking';
import { signInAnonymous } from '../firebase/auth';

type Props = {
  state: GameState;
  onRestart: () => void;
};

export function GameOverScreen({ state, onRestart }: Props) {
  const isCleared = state.gameResult === 'clear';
  const [isNewRecord, setIsNewRecord] = useState(false);
  const [showRankingModal, setShowRankingModal] = useState(false);
  const [rankingSubmitted, setRankingSubmitted] = useState(false);

  // ハイスコア判定（初回レンダリング時に1回だけ）
  useEffect(() => {
    const updated = saveHighScore(state.score);
    setIsNewRecord(updated);
  }, [state.score]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 sm:gap-6 px-4">
      <div className={`text-3xl sm:text-5xl font-bold ${isCleared ? 'text-green-400' : 'text-red-400'}`}>
        {isCleared ? '🎉 クリア！' : '😱 ゲームオーバー'}
      </div>

      {isNewRecord && (
        <div className="text-xl sm:text-2xl font-bold text-yellow-300 animate-bounce">
          ✨ NEW RECORD! ✨
        </div>
      )}

      <div className="text-xl sm:text-2xl text-gray-300">
        最終スコア: <span className="font-bold text-white">{state.score}</span>
        <span className="text-gray-500">/{state.targetScore}</span>
      </div>

      <div className="text-sm sm:text-base text-gray-400">
        難易度: {state.difficulty} | {state.roundHistory.length}ラウンド完了
      </div>

      <div className="flex flex-col gap-1 mt-2 sm:mt-4 bg-gray-800 rounded-lg p-3 sm:p-4 w-full max-w-[320px]">
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

      <div className="flex flex-col sm:flex-row gap-3 mt-2 sm:mt-4">
        {!rankingSubmitted && (
          <button
            onClick={() => setShowRankingModal(true)}
            className="px-6 py-3 min-h-[44px] bg-blue-700 hover:bg-blue-600 text-white font-bold rounded-lg cursor-pointer transition-all"
          >
            ランキングに登録
          </button>
        )}
        {rankingSubmitted && (
          <div className="px-6 py-3 text-green-400 font-bold">登録完了!</div>
        )}
        <button
          onClick={onRestart}
          className="px-8 py-3 min-h-[44px] bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-base sm:text-lg cursor-pointer transition-all"
        >
          もう一度プレイ
        </button>
      </div>

      {showRankingModal && (
        <RankingSubmitModal
          score={state.score}
          difficulty={state.difficulty}
          onClose={() => setShowRankingModal(false)}
          onSubmitted={() => {
            setRankingSubmitted(true);
            setShowRankingModal(false);
          }}
        />
      )}
    </div>
  );
}

// ===== ランキング登録モーダル =====

function RankingSubmitModal({
  score,
  difficulty,
  onClose,
  onSubmitted,
}: {
  score: number;
  difficulty: string;
  onClose: () => void;
  onSubmitted: () => void;
}) {
  const [playerName, setPlayerName] = useState('名無しの品証');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const nameValid = isValidPlayerName(playerName);

  const handleSubmit = async () => {
    if (!nameValid || submitting) return;
    setSubmitting(true);
    setError('');
    try {
      await signInAnonymous();
      await submitRanking({
        playerName,
        score,
        difficulty,
        date: new Date().toISOString(),
      });
      onSubmitted();
    } catch {
      setError('登録に失敗しました。もう一度お試しください。');
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-sm p-6 shadow-2xl">
        <h2 className="text-lg font-bold text-amber-400 mb-4">ランキング登録</h2>

        <div className="text-gray-300 mb-4">
          スコア: <span className="font-bold text-white">{score}点</span>
          <span className="ml-2 text-xs px-2 py-0.5 bg-gray-700 rounded text-gray-400">{difficulty}</span>
        </div>

        <label className="block text-sm text-gray-400 mb-1">プレイヤー名（最大10文字）</label>
        <input
          type="text"
          value={playerName}
          onChange={(e) => setPlayerName(e.target.value.slice(0, 10))}
          maxLength={10}
          className="w-full px-3 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none mb-1"
        />
        {playerName.length > 0 && !nameValid && (
          <p className="text-xs text-red-400 mb-3">英数字・ひらがな・カタカナ・漢字のみ使用できます</p>
        )}
        {nameValid && <div className="mb-3" />}

        {error && <p className="text-sm text-red-400 mb-3">{error}</p>}

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2 min-h-[44px] bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold cursor-pointer transition-all"
          >
            やめる
          </button>
          <button
            onClick={handleSubmit}
            disabled={!nameValid || submitting}
            className="flex-1 px-4 py-2 min-h-[44px] bg-blue-700 hover:bg-blue-600 disabled:bg-gray-600 disabled:text-gray-400 rounded-lg text-white font-bold cursor-pointer transition-all"
          >
            {submitting ? '送信中...' : '登録する'}
          </button>
        </div>
      </div>
    </div>
  );
}
