import type { GameState } from '../game/types';
import { getDefectRate, canStop } from '../game/gameEngine';
import { StatusBar } from './StatusBar';
import { DrawPile } from './DrawPile';
import { DrawnCards } from './DrawnCards';
import { ActionButtons } from './ActionButtons';
import { ResponseHand } from './ResponseHand';
import { RoundHistory } from './RoundHistory';
import { RoundResultView } from './RoundResult';
import { DefectResponse } from './DefectResponse';
import { EventModal } from './EventModal';

type Props = {
  state: GameState;
  onDraw: () => void;
  onStop: () => void;
  onNextRound: () => void;
  onPrepare: () => void;
  onUseResponseCard: (index: number) => void;
  onSkipResponseCard: () => void;
  onUseDesignChange: (index: number) => void;
  onDismissEvent: () => void;
};

export function GameBoard({
  state, onDraw, onStop, onNextRound, onPrepare,
  onUseResponseCard, onSkipResponseCard, onUseDesignChange, onDismissEvent,
}: Props) {
  const defectRate = getDefectRate(state.drawPile);
  const isShipping = state.phase === 'shipping' || state.phase === 'defect_response' || state.phase === 'event_display';

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
            {state.canPreviewFirstCard && (
              <div className="text-sm text-cyan-400">
                🎒 新人配属効果: 1枚目を見てから判断できます
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
              {/* アクティブな効果の表示 */}
              <ActiveEffects state={state} />
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
                canStop={canStop(state) && state.phase === 'shipping'}
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
          disabled={state.phase !== 'shipping'}
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

      {/* イベント発動モーダル */}
      {state.phase === 'event_display' && state.pendingEvent && (
        <EventModal
          event={state.pendingEvent}
          state={state}
          onDismiss={onDismissEvent}
        />
      )}

      <RoundHistory history={state.roundHistory} currentRound={state.round} />
    </div>
  );
}

// アクティブな効果を表示するサブコンポーネント
function ActiveEffects({ state }: { state: GameState }) {
  const effects: { icon: string; text: string; color: string }[] = [];

  if (state.snsFireActive) {
    effects.push({ icon: '🔥', text: 'SNS炎上: 次の不具合Pt2倍', color: 'text-orange-400' });
  }
  if (state.forcedDraws > 0) {
    effects.push({ icon: '⏰', text: `納期プレッシャー: あと${state.forcedDraws}枚強制`, color: 'text-yellow-400' });
  }
  if (state.panicThreshold < 3) {
    effects.push({ icon: '👴', text: `ベテラン退職: 閾値${state.panicThreshold}`, color: 'text-red-400' });
  }
  if (state.waterInspectionActive) {
    effects.push({ icon: '🛡️', text: '水際検査: 次の不具合自動無効', color: 'text-emerald-400' });
  }
  if (state.canPreviewFirstCard && state.drawnCardsThisRound.length === 0) {
    effects.push({ icon: '🎒', text: '新人配属: 1枚目プレビュー可', color: 'text-cyan-400' });
  }

  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2 mb-3">
      {effects.map((e, i) => (
        <span key={i} className={`text-xs px-2 py-1 rounded bg-gray-800 border border-gray-700 ${e.color}`}>
          {e.icon} {e.text}
        </span>
      ))}
    </div>
  );
}
