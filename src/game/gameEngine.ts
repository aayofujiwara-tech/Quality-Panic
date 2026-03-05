import type { GameState, Card, ProductCard, DefectCard, Difficulty, RoundResult } from './types';
import { MAX_ROUNDS, PANIC_THRESHOLD, MAX_CONTAMINATION_PER_ROUND, PANIC_CONTAMINATION_PENALTY } from './constants';
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
    // R1は汚染なし
    newState.phase = 'shipping';
    return newState;
  }

  // 前ラウンドの確定利益から投入枚数を計算
  const prevResult = state.roundHistory[state.roundHistory.length - 1];
  const prevProfit = prevResult ? prevResult.profit : 0;
  let contaminationCount = Math.ceil(prevProfit / 2);
  contaminationCount = Math.min(contaminationCount, MAX_CONTAMINATION_PER_ROUND);

  // 汚染ストックから取り出して山札に追加
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
  // Phase 1: 不具合はそのまま累積（対応カードはPhase 2で実装）
  let points = card.defectPoints;

  // リコール級（黒）は即パニック
  if (card.severity === 'black') {
    points = state.panicThreshold; // 即パニック
  }

  const newDefectPoints = state.currentDefectPoints + points;

  const newState: GameState = {
    ...state,
    currentDefectPoints: newDefectPoints,
  };

  // パニック判定
  if (newDefectPoints >= state.panicThreshold) {
    return handlePanic(newState);
  }

  return newState;
}

function handleEventCard(state: GameState, _card: Card): GameState {
  // Phase 1: イベントカードはめくるだけ（効果はPhase 3で実装）
  return state;
}

// パニック発生
function handlePanic(state: GameState): GameState {
  // パニック時: そのラウンドの利益全損失 + 汚染3枚追加投入
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

  const newState: GameState = {
    ...state,
    phase: 'result',
    contaminationStock: stockCopy,
    drawPile: shuffle(drawPileCopy),
    roundHistory: [...state.roundHistory, roundResult],
    currentRoundProfit: 0,
    currentRoundProducts: [],
  };

  return newState;
}

// 自分で止める → 利益確定
export function stopDrawing(state: GameState): GameState {
  const profit = state.currentRoundProfit;

  const roundResult: RoundResult = {
    round: state.round,
    profit,
    panicked: false,
    cardsDrawn: state.drawnCardsThisRound.length,
  };

  // 対応カード入手（Phase 2で本格実装、ここでは計算のみ）
  // 0〜2点 → 2枚, 3〜5点 → 1枚, 6点+ → なし

  const newState: GameState = {
    ...state,
    phase: 'result',
    score: state.score + profit,
    roundHistory: [...state.roundHistory, roundResult],
  };

  return newState;
}

// 次のラウンドへ
export function nextRound(state: GameState): GameState {
  const nextRoundNum = state.round + 1;

  if (nextRoundNum > state.maxRounds || state.drawPile.length === 0) {
    return endGame(state);
  }

  const newState: GameState = {
    ...state,
    phase: 'prepare',
    round: nextRoundNum,
    currentRoundProfit: 0,
    currentRoundProducts: [],
    currentDefectPoints: 0,
    panicThreshold: PANIC_THRESHOLD,
    lastDrawnCard: null,
    drawnCardsThisRound: [],
    snsFireActive: false,
    forcedDraws: 0,
    waterInspectionActive: false,
  };

  return newState;
}

// ゲーム終了判定
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
