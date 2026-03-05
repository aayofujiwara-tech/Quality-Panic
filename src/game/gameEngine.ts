import type { GameState, Card, ProductCard, DefectCard, EventCard, ResponseCard, Difficulty, RoundResult } from './types';
import { MAX_ROUNDS, PANIC_THRESHOLD, MAX_CONTAMINATION_PER_ROUND, PANIC_CONTAMINATION_PENALTY, RESPONSE_HAND_LIMIT } from './constants';
import { createInitialDrawPile, createContaminationStock, createResponseStock, shuffle } from './cards';

// ゲーム初期化
export function initGame(difficulty: Difficulty): GameState {
  const stock = createResponseStock();
  const initialCard = stock.shift()!;

  return {
    phase: 'prepare',
    round: 1,
    maxRounds: MAX_ROUNDS,
    score: 0,
    targetScore: difficulty.targetScore,
    difficulty: difficulty.name,

    drawPile: createInitialDrawPile(),
    contaminationStock: createContaminationStock(),

    responseStock: stock,
    responseDiscard: [],
    responseHand: [initialCard],

    currentRoundProfit: 0,
    currentRoundProducts: [],
    currentDefectPoints: 0,
    panicThreshold: PANIC_THRESHOLD,

    pendingDefect: null,
    pendingEvent: null,

    snsFireActive: false,
    forcedDraws: 0,
    samplingNextRound: false,
    samplingCards: [],
    waterInspectionActive: false,

    roundHistory: [],
    lastDrawnCard: null,
    drawnCardsThisRound: [],

    gameResult: 'playing',
  };
}

// 準備フェーズ: 汚染投入 → 抜き取り検査チェック → 出荷開始
export function prepareRound(state: GameState): GameState {
  const newState = { ...state };

  if (state.round > 1) {
    // 前ラウンドの確定利益から投入枚数を計算
    const prevResult = state.roundHistory[state.roundHistory.length - 1];
    const prevProfit = prevResult ? prevResult.profit : 0;
    let contaminationCount = Math.ceil(prevProfit / 2);
    contaminationCount = Math.min(contaminationCount, MAX_CONTAMINATION_PER_ROUND);

    const stockCopy = [...state.contaminationStock];
    const drawPileCopy = [...state.drawPile];

    const toAdd = Math.min(contaminationCount, stockCopy.length);
    for (let i = 0; i < toAdd; i++) {
      drawPileCopy.push(stockCopy.shift()!);
    }

    newState.contaminationStock = stockCopy;
    newState.drawPile = shuffle(drawPileCopy);
  }

  // ラウンド状態リセット
  newState.currentRoundProfit = 0;
  newState.currentRoundProducts = [];
  newState.currentDefectPoints = 0;
  newState.panicThreshold = PANIC_THRESHOLD;
  newState.pendingDefect = null;
  newState.pendingEvent = null;
  newState.lastDrawnCard = null;
  newState.drawnCardsThisRound = [];
  newState.snsFireActive = false;
  newState.forcedDraws = 0;
  newState.waterInspectionActive = false;

  // 抜き取り検査: 前ラウンドでフラグが立っていたら3枚公開
  if (state.samplingNextRound && newState.drawPile.length >= 3) {
    const pile = [...newState.drawPile];
    const revealed = pile.splice(0, 3);
    newState.drawPile = pile;
    newState.samplingCards = revealed;
    newState.samplingNextRound = false;
    newState.phase = 'sampling';
    return newState;
  }

  newState.samplingNextRound = false;
  newState.samplingCards = [];
  newState.phase = 'shipping';
  return newState;
}

// 抜き取り検査: プレイヤーが3枚から1枚を選択
export function selectSamplingCard(state: GameState, index: number): GameState {
  const cards = state.samplingCards;
  if (index < 0 || index >= cards.length) return state;

  const selected = cards[index];
  const remaining = cards.filter((_, i) => i !== index);

  // 残り2枚を山札に戻してシャッフル
  const newDrawPile = shuffle([...state.drawPile, ...remaining]);

  let newState: GameState = {
    ...state,
    drawPile: newDrawPile,
    samplingCards: [],
  };

  // 選択したカードの効果を適用
  switch (selected.type) {
    case 'product':
      // 製品カード → このラウンドの利益として即確保
      newState.currentRoundProfit = newState.currentRoundProfit + selected.value;
      newState.currentRoundProducts = [...newState.currentRoundProducts, selected];
      newState.phase = 'shipping';
      break;

    case 'defect':
      // 不具合カード → ゲームから除外（山札に戻さない＝捨て札）
      newState.phase = 'shipping';
      break;

    case 'event':
      // イベントカード → 即座に効果発動
      newState = applyEventEffect(newState, selected);
      // イベント表示モーダルを出す
      newState.phase = 'event_display';
      newState.pendingEvent = selected;
      break;
  }

  return newState;
}

// カードを1枚めくる
export function drawCard(state: GameState): GameState {
  if (state.drawPile.length === 0) {
    return endGame(state);
  }

  const newDrawPile = [...state.drawPile];
  const card = newDrawPile.shift()!;

  // 強制めくり残りをデクリメント
  const newForcedDraws = state.forcedDraws > 0 ? state.forcedDraws - 1 : 0;

  const newState: GameState = {
    ...state,
    drawPile: newDrawPile,
    lastDrawnCard: card,
    drawnCardsThisRound: [...state.drawnCardsThisRound, card],
    forcedDraws: newForcedDraws,
  };

  switch (card.type) {
    case 'product':
      return handleProductCard(newState, card);
    case 'defect':
      return handleDefectCard(newState, card);
    case 'event':
      return handleEventCard(newState, card);
    default:
      return newState;
  }
}

function handleProductCard(state: GameState, card: ProductCard): GameState {
  return {
    ...state,
    currentRoundProfit: state.currentRoundProfit + card.value,
    currentRoundProducts: [...state.currentRoundProducts, card],
  };
}

function handleDefectCard(state: GameState, card: DefectCard): GameState {
  // 水際検査が有効なら自動無効化
  if (state.waterInspectionActive) {
    return {
      ...state,
      waterInspectionActive: false,
    };
  }

  // 手札に対応カードがあれば使用判断待ちにする
  const usableCards = state.responseHand.filter(
    r => r.responseType === 'first_aid' || r.responseType === 'root_cause' || r.responseType === 'inspection'
  );
  if (usableCards.length > 0) {
    return {
      ...state,
      phase: 'defect_response',
      pendingDefect: card,
    };
  }

  return applyDefectPoints(state, card);
}

// 不具合Ptを適用してパニック判定
function applyDefectPoints(state: GameState, card: DefectCard): GameState {
  let points = card.defectPoints;

  // リコール級（黒）は即パニック
  if (card.severity === 'black') {
    points = state.panicThreshold;
  }

  // SNS炎上効果: 不具合Ptが2倍
  if (state.snsFireActive) {
    points *= 2;
  }

  const newDefectPoints = state.currentDefectPoints + points;

  const newState: GameState = {
    ...state,
    currentDefectPoints: newDefectPoints,
    pendingDefect: null,
    snsFireActive: false, // 使い切り
  };

  if (newDefectPoints >= state.panicThreshold) {
    return handlePanic(newState);
  }

  return newState;
}

// 対応カードを使用（不具合に対して）
export function useResponseCard(state: GameState, cardIndex: number): GameState {
  const defect = state.pendingDefect;
  if (!defect) return state;

  const card = state.responseHand[cardIndex];
  if (!card) return state;

  const newHand = state.responseHand.filter((_, i) => i !== cardIndex);
  let newState: GameState = {
    ...state,
    responseHand: newHand,
    pendingDefect: null,
    phase: 'shipping',
  };

  switch (card.responseType) {
    case 'first_aid': {
      newState = {
        ...newState,
        responseDiscard: [...newState.responseDiscard, card],
      };
      break;
    }
    case 'root_cause': {
      const drawPileCopy = [...newState.drawPile];
      const defectIdx = drawPileCopy.findIndex(c => c.type === 'defect');
      if (defectIdx >= 0) {
        drawPileCopy.splice(defectIdx, 1);
      }
      newState = {
        ...newState,
        drawPile: drawPileCopy,
        responseDiscard: [...newState.responseDiscard, card],
      };
      break;
    }
    case 'inspection': {
      newState = {
        ...newState,
        waterInspectionActive: true,
        responseDiscard: [...newState.responseDiscard, card],
      };
      break;
    }
    default:
      break;
  }

  return newState;
}

// 対応カードを使わずに不具合を受ける
export function skipResponseCard(state: GameState): GameState {
  const defect = state.pendingDefect;
  if (!defect) return { ...state, phase: 'shipping', pendingDefect: null };

  return applyDefectPoints({ ...state, phase: 'shipping' }, defect);
}

// 設計変更カードを使用（出荷フェーズ中いつでも使える）
export function useDesignChange(state: GameState, cardIndex: number): GameState {
  const card = state.responseHand[cardIndex];
  if (!card || card.responseType !== 'design_change') return state;

  const newHand = state.responseHand.filter((_, i) => i !== cardIndex);
  const stockCopy = [...state.contaminationStock];

  const removeCount = Math.min(2, stockCopy.length);
  stockCopy.splice(0, removeCount);

  return {
    ...state,
    responseHand: newHand,
    contaminationStock: stockCopy,
  };
}

// イベントカード処理: 効果を適用してイベント表示フェーズへ
function handleEventCard(state: GameState, card: EventCard): GameState {
  let newState = applyEventEffect(state, card);
  newState = {
    ...newState,
    phase: 'event_display',
    pendingEvent: card,
  };

  // ベテラン退職で即パニック判定
  if (card.eventType === 'veteran_retire' && newState.currentDefectPoints >= newState.panicThreshold) {
    return handlePanic(newState);
  }

  return newState;
}

// イベント効果を適用（handleEventCardとselectSamplingCardで共用）
function applyEventEffect(state: GameState, card: EventCard): GameState {
  const newState = { ...state };

  switch (card.eventType) {
    case 'sns_fire':
      newState.snsFireActive = true;
      break;

    case 'deadline_pressure':
      newState.forcedDraws = 2;
      break;

    case 'veteran_retire':
      newState.panicThreshold = 2;
      break;

    case 'kaizen': {
      const drawnDefects = state.drawnCardsThisRound.filter(
        (c): c is DefectCard => c.type === 'defect'
      );
      if (drawnDefects.length > 0 && state.currentDefectPoints > 0) {
        const lastDefect = drawnDefects[drawnDefects.length - 1];
        newState.currentDefectPoints = Math.max(0, state.currentDefectPoints - lastDefect.defectPoints);
      }
      break;
    }

    case 'iso_audit':
      if (state.currentDefectPoints === 0) {
        newState.currentRoundProfit = state.currentRoundProfit + 3;
      }
      break;

    case 'sampling_inspection':
      newState.samplingNextRound = true;
      break;
  }

  return newState;
}

// イベント表示を閉じて出荷フェーズに戻る
export function dismissEvent(state: GameState): GameState {
  return {
    ...state,
    phase: 'shipping',
    pendingEvent: null,
  };
}

// パニック発生
function handlePanic(state: GameState): GameState {
  const stockCopy = [...state.contaminationStock];
  const drawPileCopy = [...state.drawPile];

  const penaltyCount = Math.min(PANIC_CONTAMINATION_PENALTY, stockCopy.length);
  for (let i = 0; i < penaltyCount; i++) {
    drawPileCopy.push(stockCopy.shift()!);
  }

  const roundResult: RoundResult = {
    round: state.round,
    profit: 0,
    panicked: true,
    cardsDrawn: state.drawnCardsThisRound.length,
  };

  return {
    ...state,
    phase: 'result',
    contaminationStock: stockCopy,
    drawPile: shuffle(drawPileCopy),
    roundHistory: [...state.roundHistory, roundResult],
    currentRoundProfit: 0,
    currentRoundProducts: [],
    pendingDefect: null,
    pendingEvent: null,
  };
}

// 対応カードストックからドロー（リサイクル処理付き）
function drawFromResponseStock(
  stock: ResponseCard[],
  discard: ResponseCard[],
  count: number
): { drawn: ResponseCard[]; newStock: ResponseCard[]; newDiscard: ResponseCard[] } {
  let currentStock = [...stock];
  let currentDiscard = [...discard];
  const drawn: ResponseCard[] = [];

  for (let i = 0; i < count; i++) {
    if (currentStock.length === 0) {
      if (currentDiscard.length === 0) break;
      currentStock = shuffle(currentDiscard);
      currentDiscard = [];
    }
    drawn.push(currentStock.shift()!);
  }

  return { drawn, newStock: currentStock, newDiscard: currentDiscard };
}

// 自分で止める → 利益確定 + 対応カード入手
export function stopDrawing(state: GameState): GameState {
  const profit = state.currentRoundProfit;

  const roundResult: RoundResult = {
    round: state.round,
    profit,
    panicked: false,
    cardsDrawn: state.drawnCardsThisRound.length,
  };

  let responseDrawCount = 0;
  if (profit <= 2) responseDrawCount = 2;
  else if (profit <= 5) responseDrawCount = 1;

  const handSpace = RESPONSE_HAND_LIMIT - state.responseHand.length;
  responseDrawCount = Math.min(responseDrawCount, handSpace);

  const { drawn, newStock, newDiscard } = drawFromResponseStock(
    state.responseStock,
    state.responseDiscard,
    responseDrawCount,
  );

  return {
    ...state,
    phase: 'result',
    score: state.score + profit,
    roundHistory: [...state.roundHistory, roundResult],
    responseStock: newStock,
    responseDiscard: newDiscard,
    responseHand: [...state.responseHand, ...drawn],
  };
}

// 止められるかチェック（強制めくりがあると止められない）
export function canStop(state: GameState): boolean {
  if (state.drawnCardsThisRound.length === 0) return false;
  if (state.forcedDraws > 0) return false;
  return true;
}

// 次のラウンドへ
export function nextRound(state: GameState): GameState {
  const nextRoundNum = state.round + 1;

  if (nextRoundNum > state.maxRounds || state.drawPile.length === 0) {
    return endGame(state);
  }

  return {
    ...state,
    phase: 'prepare',
    round: nextRoundNum,
    currentRoundProfit: 0,
    currentRoundProducts: [],
    currentDefectPoints: 0,
    panicThreshold: PANIC_THRESHOLD,
    pendingDefect: null,
    pendingEvent: null,
    lastDrawnCard: null,
    drawnCardsThisRound: [],
    snsFireActive: false,
    forcedDraws: 0,
    waterInspectionActive: false,
  };
}

// ゲーム終了
function endGame(state: GameState): GameState {
  const result = state.score >= state.targetScore ? 'clear' : 'failed';
  return {
    ...state,
    phase: 'game_over',
    gameResult: result,
  };
}

// 山札の不具合率を計算
export function getDefectRate(drawPile: Card[]): number {
  if (drawPile.length === 0) return 0;
  const defectCount = drawPile.filter(c => c.type === 'defect').length;
  return defectCount / drawPile.length;
}
