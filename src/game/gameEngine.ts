import type { GameState, Card, ProductCard, DefectCard, ResponseCard, Difficulty, RoundResult } from './types';
import { MAX_ROUNDS, PANIC_THRESHOLD, MAX_CONTAMINATION_PER_ROUND, PANIC_CONTAMINATION_PENALTY, RESPONSE_HAND_LIMIT } from './constants';
import { createInitialDrawPile, createContaminationStock, createResponseStock, shuffle } from './cards';

// ゲーム初期化
export function initGame(difficulty: Difficulty): GameState {
  return {
    phase: 'prepare',
    round: 1,
    maxRounds: MAX_ROUNDS,
    score: 0,
    targetScore: difficulty.targetScore,
    difficulty: difficulty.name,

    drawPile: createInitialDrawPile(),
    contaminationStock: createContaminationStock(),

    responseStock: createResponseStock(),
    responseDiscard: [],
    responseHand: [],

    currentRoundProfit: 0,
    currentRoundProducts: [],
    currentDefectPoints: 0,
    panicThreshold: PANIC_THRESHOLD,

    pendingDefect: null,

    snsFireActive: false,
    forcedDraws: 0,
    rookieNextRound: false,
    canPreviewFirstCard: false,
    waterInspectionActive: false,

    roundHistory: [],
    lastDrawnCard: null,
    drawnCardsThisRound: [],

    gameResult: 'playing',
  };
}

// 準備フェーズ: 汚染投入
export function prepareRound(state: GameState): GameState {
  const newState = { ...state };

  if (state.round === 1) {
    newState.phase = 'shipping';
    return newState;
  }

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
  newState.phase = 'shipping';
  newState.currentRoundProfit = 0;
  newState.currentRoundProducts = [];
  newState.currentDefectPoints = 0;
  newState.panicThreshold = PANIC_THRESHOLD;
  newState.pendingDefect = null;
  newState.lastDrawnCard = null;
  newState.drawnCardsThisRound = [];
  newState.snsFireActive = false;
  newState.forcedDraws = 0;
  newState.waterInspectionActive = false;

  return newState;
}

// カードを1枚めくる
export function drawCard(state: GameState): GameState {
  if (state.drawPile.length === 0) {
    return endGame(state);
  }

  const newDrawPile = [...state.drawPile];
  const card = newDrawPile.shift()!;
  const newState: GameState = {
    ...state,
    drawPile: newDrawPile,
    lastDrawnCard: card,
    drawnCardsThisRound: [...state.drawnCardsThisRound, card],
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
      waterInspectionActive: false, // 1枚分消費
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

  // 手札に対応カードがなければそのまま累積
  return applyDefectPoints(state, card);
}

// 不具合Ptを適用してパニック判定
function applyDefectPoints(state: GameState, card: DefectCard): GameState {
  let points = card.defectPoints;

  // リコール級（黒）は即パニック
  if (card.severity === 'black') {
    points = state.panicThreshold;
  }

  const newDefectPoints = state.currentDefectPoints + points;

  const newState: GameState = {
    ...state,
    currentDefectPoints: newDefectPoints,
    pendingDefect: null,
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
      // 応急処置: 不具合無効化 → 捨て山へ
      newState = {
        ...newState,
        responseDiscard: [...newState.responseDiscard, card],
      };
      break;
    }
    case 'root_cause': {
      // 原因調査: 無効化 + 山札から不具合1枚除外 → 捨て山へ
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
      // 水際検査: この不具合無効化 + 次の不具合も自動無効化 → 捨て山へ
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

  // 汚染ストックから最大2枚を永久除外
  const removeCount = Math.min(2, stockCopy.length);
  stockCopy.splice(0, removeCount);

  // 設計変更はゲームから除外（捨て山に行かない）
  return {
    ...state,
    responseHand: newHand,
    contaminationStock: stockCopy,
  };
}

function handleEventCard(state: GameState, _card: Card): GameState {
  // Phase 3で実装
  return state;
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
      if (currentDiscard.length === 0) break; // 全て尽きた
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

  // 対応カード入手枚数: 0〜2点→2枚, 3〜5点→1枚, 6点+→なし
  let responseDrawCount = 0;
  if (profit <= 2) responseDrawCount = 2;
  else if (profit <= 5) responseDrawCount = 1;

  // 手札上限を考慮
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
