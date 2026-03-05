import type { GameState } from '../game/types';
import { getDefectRate } from '../game/gameEngine';
import { StatusBar } from './StatusBar';
import { DrawPile } from './DrawPile';
import { DrawnCards } from './DrawnCards';
import { ActionButtons } from './ActionButtons';
import { ResponseHand } from './ResponseHand';
import { RoundHistory } from './RoundHistory';
import { RoundResultView } from './RoundResult';
import { DefectResponse } from './DefectResponse';

type Props = {
  state: GameState;
  onDraw: () => void;
  onStop: () => void;
  onNextRound: () => void;
  onPrepare: () => void;
  onUseResponseCard: (index: number) => void;
  onSkipResponseCard: () => void;
  onUseDesignChange: (index: number) => void;
};

export function GameBoard({
  state, onDraw, onStop, onNextRound, onPrepare,
  onUseResponseCard, onSkipResponseCard, onUseDesignChange,
}: Props) {
  const defectRate = getDefectRate(state.drawPile);
  const isShipping = state.phase === 'shipping' || state.phase === 'defect_response';

  return (
    <div className="flex flex-col min-h-screen">
      <StatusBar
        round={state.round}
        maxRounds={state.maxRounds}
        score={state.score}
        targetScore={state.targetScore}
        difficulty={state.difficulty}
      />

      <div className="flex-1 p-6">
        {state.phase === 'prepare' && (
          <div className="flex flex-col items-center justify-center gap-6 py-12">
            <div className="text-2xl font-bold text-amber-400">
              ラウンド {state.round} 準備中
            </div>
            {state.round > 1 && (
              <div className="text-gray-400 text-sm">
                汚染カードが山札に投入されます...
              </div>
            )}
            <button
              onClick={onPrepare}
              className="px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-lg cursor-pointer transition-all"
            >
              出荷開始！
            </button>
          </div>
        )}

        {isShipping && (
          <div className="flex gap-8 items-start">
            <DrawPile remaining={state.drawPile.length} defectRate={defectRate} />
            <div className="flex-1 flex flex-col">
              <DrawnCards
                cards={state.drawnCardsThisRound}
                currentProfit={state.currentRoundProfit}
                currentDefectPoints={state.currentDefectPoints}
                panicThreshold={state.panicThreshold}
              />
              <ActionButtons
                onDraw={onDraw}
                onStop={onStop}
                canDraw={state.drawPile.length > 0 && state.phase === 'shipping'}
                canStop={state.drawnCardsThisRound.length > 0 && state.phase === 'shipping'}
                cardsDrawn={state.drawnCardsThisRound.length}
              />
            </div>
          </div>
        )}

        {state.phase === 'result' && (
          <RoundResultView
            result={state.roundHistory[state.roundHistory.length - 1]}
            totalScore={state.score}
            targetScore={state.targetScore}
            responseCardsGained={(() => {
              const r = state.roundHistory[state.roundHistory.length - 1];
              if (!r || r.panicked) return 0;
              if (r.profit <= 2) return 2;
              if (r.profit <= 5) return 1;
              return 0;
            })()}
            onNext={onNextRound}
          />
        )}
      </div>

      {/* 対応カード手札（出荷フェーズ中に表示） */}
      {isShipping && (
        <ResponseHand
          hand={state.responseHand}
          onUseCard={onUseDesignChange}
          disabled={state.phase === 'defect_response'}
        />
      )}

      {/* 不具合対応モーダル */}
      {state.phase === 'defect_response' && state.pendingDefect && (
        <DefectResponse
          defect={state.pendingDefect}
          hand={state.responseHand}
          onUseCard={onUseResponseCard}
          onSkip={onSkipResponseCard}
        />
      )}

      <RoundHistory history={state.roundHistory} currentRound={state.round} />
    </div>
  );
}
