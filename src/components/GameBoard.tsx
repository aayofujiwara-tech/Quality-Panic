import { useMemo } from 'react';
import type { GameState } from '../game/types';
import type { AnimationState } from '../game/animations';
import { getDefectRate, canStop } from '../game/gameEngine';
import { MAX_CONTAMINATION_PER_ROUND } from '../game/constants';
import { StatusBar } from './StatusBar';
import { DrawPile } from './DrawPile';
import { DrawnCards } from './DrawnCards';
import { ActionButtons } from './ActionButtons';
import { ResponseHand } from './ResponseHand';
import { RoundHistory } from './RoundHistory';
import { RoundResultView } from './RoundResult';
import { DefectResponse } from './DefectResponse';
import { EventModal } from './EventModal';
import { SamplingModal } from './SamplingModal';
import { CardFlipAnimation } from './CardFlipAnimation';
import { RuleSidePanel, RuleMobilePanel, buildSoloProps } from './RuleSummaryPanel';

type Props = {
  state: GameState;
  anim: AnimationState;
  onDraw: () => void;
  onStop: () => void;
  onNextRound: () => void;
  onPrepare: () => void;
  onUseResponseCard: (index: number) => void;
  onSkipResponseCard: () => void;
  onUseDesignChange: (index: number) => void;
  onDismissEvent: () => void;
  onSelectSamplingCard: (index: number) => void;
};

export function GameBoard({
  state, anim, onDraw, onStop, onNextRound, onPrepare,
  onUseResponseCard, onSkipResponseCard, onUseDesignChange, onDismissEvent,
  onSelectSamplingCard,
}: Props) {
  const defectRate = getDefectRate(state.drawPile);
  const isShipping = state.phase === 'shipping' || state.phase === 'defect_response' || state.phase === 'event_display';
  const ruleProps = useMemo(() => buildSoloProps(state), [
    state.contaminationStock, state.responseStock, state.responseDiscard,
    state.snsFireActive, state.waterInspectionActive, state.forcedDraws,
  ]);

  const nextContamination = (() => {
    if (state.round >= state.maxRounds) return undefined;
    if (isShipping) {
      const count = Math.min(
        Math.ceil(state.currentRoundProfit / 2),
        MAX_CONTAMINATION_PER_ROUND,
        state.contaminationStock.length,
      );
      return { count, tentative: true };
    }
    return undefined;
  })();

  return (
    <div className={`flex flex-col min-h-screen ${anim.panicking ? 'panic-shake' : ''}`}>
      {/* パニックフラッシュオーバーレイ */}
      {anim.panicking && (
        <div className="fixed inset-0 z-40 pointer-events-none panic-overlay" />
      )}

      {/* イベントフラッシュオーバーレイ */}
      {anim.eventFlash && (
        <div className={`fixed inset-0 z-40 pointer-events-none ${
          anim.eventFlash === 'bad' ? 'event-flash-bad' : 'event-flash-good'
        }`} />
      )}

      <StatusBar
        round={state.round}
        maxRounds={state.maxRounds}
        score={state.score}
        targetScore={state.targetScore}
        difficulty={state.difficulty}
        scoreCounting={anim.scoreCounting}
        waterInspectionActive={state.waterInspectionActive}
        deckRemaining={isShipping ? state.drawPile.length : undefined}
        defectRate={isShipping ? defectRate : undefined}
        drawPile={isShipping ? state.drawPile : undefined}
        nextContamination={isShipping ? nextContamination : undefined}
      />

      <div className="flex-1 flex flex-row overflow-hidden">
        <div className="flex-1 p-2 sm:p-4 md:p-3 relative overflow-y-auto">
          {/* 汚染投入テキスト */}
          {anim.contaminationText && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 z-30">
              <div className="contamination-text text-lg sm:text-xl font-bold text-red-400 bg-red-900/60 px-4 py-2 rounded-lg border border-red-700">
                ☣️ {anim.contaminationText}
              </div>
            </div>
          )}

          {/* 大量出荷テキスト */}
          {anim.bigShipment && (
            <div className="absolute top-1/3 left-1/2 -translate-x-1/2 z-30">
              <div className="big-shipment-text text-2xl sm:text-3xl font-bold text-amber-300">
                大量出荷！
              </div>
            </div>
          )}

          {state.phase === 'prepare' && (
            <div className="flex flex-col items-center justify-center gap-3 sm:gap-5 py-6 sm:py-10">
              <div className="text-2xl font-bold text-amber-400">
                ラウンド {state.round} 準備中
              </div>
              {state.round > 1 && (
                <div className="text-gray-400 text-sm">
                  汚染カードが山札に投入されます...
                </div>
              )}
              {state.samplingNextRound > 0 && (
                <div className="text-sm text-teal-400">
                  🔍 抜き取り検査効果: 3枚から1枚を選べます{state.samplingNextRound >= 2 ? `（${state.samplingNextRound}回）` : ''}
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
            <div className="flex flex-col">
              {/* スマホ: DrawPileを表示（PCではStatusBarに統合済み） */}
              <div className="md:hidden mb-2">
                <DrawPile
                  remaining={state.drawPile.length}
                  defectRate={defectRate}
                  drawPile={state.drawPile}
                  nextContamination={nextContamination}
                />
              </div>

              <ActiveEffects state={state} />
              <DrawnCards
                cards={state.drawnCardsThisRound}
                currentProfit={state.currentRoundProfit}
                currentDefectPoints={state.currentDefectPoints}
                panicThreshold={state.panicThreshold}
              />
              <CardFlipAnimation flipping={anim.flipping} flippingCard={anim.flippingCard} />
              <ActionButtons
                onDraw={onDraw}
                onStop={onStop}
                canDraw={state.drawPile.length > 0 && state.phase === 'shipping' && !anim.busy}
                canStop={canStop(state) && state.phase === 'shipping' && !anim.busy}
                cardsDrawn={state.drawnCardsThisRound.length}
              />
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
              drawnCards={state.drawnCardsThisRound}
              defectPointsLog={state.defectPointsLog}
              panicking={anim.panicking}
            />
          )}
        </div>

        <RuleSidePanel {...ruleProps} />
      </div>

      {isShipping && (
        <ResponseHand
          hand={state.responseHand}
          onUseCard={onUseDesignChange}
          disabled={state.phase !== 'shipping' || anim.busy}
          cardUsingIndex={anim.cardUsingIndex}
        />
      )}

      {state.phase === 'defect_response' && state.pendingDefect && (
        <DefectResponse
          defect={state.pendingDefect}
          hand={state.responseHand}
          onUseCard={onUseResponseCard}
          onSkip={onSkipResponseCard}
          disabled={anim.busy}
          cardUsingIndex={anim.cardUsingIndex}
        />
      )}

      {state.phase === 'event_display' && state.pendingEvent && (
        <EventModal
          event={state.pendingEvent}
          state={state}
          onDismiss={onDismissEvent}
          glowing={anim.eventGlowing}
          disabled={anim.busy}
        />
      )}

      {state.phase === 'sampling' && state.samplingCards.length > 0 && (
        <SamplingModal
          cards={state.samplingCards}
          onSelect={onSelectSamplingCard}
          remaining={state.samplingNextRound}
        />
      )}

      <RoundHistory history={state.roundHistory} currentRound={state.round} />

      <RuleMobilePanel {...ruleProps} />
    </div>
  );
}

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
  if (state.samplingNextRound > 0) {
    effects.push({ icon: '🔍', text: `抜き取り検査: 次ラウンド${state.samplingNextRound}回発動`, color: 'text-teal-400' });
  }

  if (effects.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {effects.map((e, i) => (
        <span key={i} className={`text-xs px-2 py-0.5 rounded bg-gray-800 border border-gray-700 ${e.color}`}>
          {e.icon} {e.text}
        </span>
      ))}
    </div>
  );
}
