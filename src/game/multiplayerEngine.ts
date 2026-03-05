import type {
  Card, DefectCard, EventCard, ProductCard, ResponseCard,
  MultiplayerGameState, TurnState,
} from './types';
import {
  MAX_ROUNDS_MULTI, PANIC_THRESHOLD, MAX_CONTAMINATION_PER_ROUND,
  PANIC_CONTAMINATION_PENALTY, RESPONSE_HAND_LIMIT,
} from './constants';
import { createInitialDrawPile, createContaminationStock, createResponseStock, shuffle } from './cards';

// ===== カードID管理 =====

let cardIdCounter = 0;

function nextCardId(): string {
  return `c${cardIdCounter++}`;
}

/** カードにIDを振ってマスタとIDリストを返す */
function indexCards(cards: Card[]): { ids: string[]; master: Record<string, Card> } {
  const ids: string[] = [];
  const master: Record<string, Card> = {};
  for (const card of cards) {
    const id = nextCardId();
    ids.push(id);
    master[id] = card;
  }
  return { ids, master };
}

function indexResponseCards(cards: ResponseCard[]): { ids: string[]; master: Record<string, Card> } {
  const ids: string[] = [];
  const master: Record<string, Card> = {};
  for (const card of cards) {
    const id = nextCardId();
    ids.push(id);
    // ResponseCard を CardMaster に格納する際は特殊扱い
    // （型としてはCardではないが、IDで引けるようにする）
    master[id] = card as unknown as Card;
  }
  return { ids, master };
}

// ===== ゲーム初期化 =====

export type MultiplayerInit = {
  gameState: MultiplayerGameState;
  cardMaster: Record<string, Card>;
  playerResponseHands: Record<string, ResponseCard[]>;
};

export function initMultiplayerGame(playerOrder: string[]): MultiplayerInit {
  cardIdCounter = 0;

  const drawPileCards = createInitialDrawPile();
  const contaminationCards = createContaminationStock();
  const responseCards = createResponseStock();

  const { ids: drawIds, master: drawMaster } = indexCards(drawPileCards);
  const { ids: contIds, master: contMaster } = indexCards(contaminationCards);
  const { ids: respIds, master: respMaster } = indexResponseCards(responseCards);

  const cardMaster = { ...drawMaster, ...contMaster, ...respMaster };

  // 各プレイヤーに対応カード1枚配布
  const playerResponseHands: Record<string, ResponseCard[]> = {};
  const remainingResp = [...respIds];

  for (const uid of playerOrder) {
    const cardId = remainingResp.shift();
    if (cardId) {
      playerResponseHands[uid] = [cardMaster[cardId] as unknown as ResponseCard];
    } else {
      playerResponseHands[uid] = [];
    }
  }

  const gameState: MultiplayerGameState = {
    phase: 'prepare',
    round: 1,
    maxRounds: MAX_ROUNDS_MULTI,

    drawPile: drawIds,
    contaminationStock: contIds,

    responseStock: remainingResp,
    responseDiscard: [],

    currentPlayerUid: playerOrder[0],
    currentPlayerIndex: 0,

    turnState: null,

    roundResults: {},
    lastContamination: null,
  };

  return { gameState, cardMaster, playerResponseHands };
}

// ===== ターン開始 =====

export function startTurn(gameState: MultiplayerGameState): MultiplayerGameState {
  return {
    ...gameState,
    phase: 'shipping',
    turnState: {
      drawnCards: [],
      currentProfit: 0,
      currentDefectPoints: 0,
      panicThreshold: PANIC_THRESHOLD,
      snsFireActive: false,
      forcedDraws: 0,
      waterInspectionActive: false,
      isPanicked: false,
    },
  };
}

// ===== カードを引く =====

export type DrawResult = {
  gameState: MultiplayerGameState;
  drawnCard: Card;
  needsDefectResponse: boolean;
  eventTriggered: EventCard | null;
  panicked: boolean;
};

export function multiDrawCard(
  gameState: MultiplayerGameState,
  cardMaster: Record<string, Card>,
  responseHand: ResponseCard[],
): DrawResult | null {
  if (gameState.drawPile.length === 0 || !gameState.turnState) return null;

  const newDrawPile = [...gameState.drawPile];
  const cardId = newDrawPile.shift()!;
  const card = cardMaster[cardId];

  const turn = { ...gameState.turnState };
  turn.drawnCards = [...turn.drawnCards, cardId];

  if (turn.forcedDraws > 0) {
    turn.forcedDraws--;
  }

  let newState = { ...gameState, drawPile: newDrawPile, turnState: turn };
  let needsDefectResponse = false;
  let eventTriggered: EventCard | null = null;
  let panicked = false;

  switch (card.type) {
    case 'product': {
      const pc = card as ProductCard;
      turn.currentProfit += pc.value;
      break;
    }
    case 'defect': {
      const dc = card as DefectCard;
      if (turn.waterInspectionActive) {
        turn.waterInspectionActive = false;
      } else {
        // 対応カードがあるか確認
        const usable = responseHand.filter(
          r => r.responseType === 'first_aid' || r.responseType === 'root_cause' || r.responseType === 'inspection'
        );
        if (usable.length > 0) {
          needsDefectResponse = true;
        } else {
          // 不具合Pt適用
          const result = applyDefectToTurn(turn, dc);
          panicked = result.panicked;
        }
      }
      break;
    }
    case 'event': {
      const ec = card as EventCard;
      applyEventToTurn(turn, ec, cardMaster);
      eventTriggered = ec;

      if (ec.eventType === 'veteran_retire' && turn.currentDefectPoints >= turn.panicThreshold) {
        turn.isPanicked = true;
        panicked = true;
      }
      break;
    }
  }

  newState.turnState = turn;

  return { gameState: newState, drawnCard: card, needsDefectResponse, eventTriggered, panicked };
}

function applyDefectToTurn(turn: TurnState, card: DefectCard): { panicked: boolean } {
  let points = card.defectPoints;

  if (card.severity === 'black') {
    points = turn.panicThreshold;
  }

  if (turn.snsFireActive) {
    points *= 2;
    turn.snsFireActive = false;
  }

  turn.currentDefectPoints += points;

  if (turn.currentDefectPoints >= turn.panicThreshold) {
    turn.isPanicked = true;
    return { panicked: true };
  }
  return { panicked: false };
}

function applyEventToTurn(turn: TurnState, card: EventCard, _cardMaster: Record<string, Card>): void {
  switch (card.eventType) {
    case 'sns_fire':
      turn.snsFireActive = true;
      break;
    case 'deadline_pressure':
      turn.forcedDraws = 2;
      break;
    case 'veteran_retire':
      turn.panicThreshold = 2;
      break;
    case 'kaizen':
      if (turn.currentDefectPoints > 0) {
        // 簡易実装: 不具合1pt分を回復
        turn.currentDefectPoints = Math.max(0, turn.currentDefectPoints - 1);
      }
      break;
    case 'iso_audit':
      if (turn.currentDefectPoints === 0) {
        turn.currentProfit += 3;
      }
      break;
    case 'sampling_inspection':
      // 対戦モードでは抜き取り検査は簡易化（ボーナスなし）
      break;
  }
}

// ===== 不具合対応カード使用 =====

export function multiUseResponseCard(
  gameState: MultiplayerGameState,
  cardMaster: Record<string, Card>,
  responseHand: ResponseCard[],
  cardIndex: number,
  _pendingDefect: DefectCard,
): {
  gameState: MultiplayerGameState;
  newResponseHand: ResponseCard[];
} {
  const card = responseHand[cardIndex];
  if (!card || !gameState.turnState) {
    return { gameState, newResponseHand: responseHand };
  }

  const newHand = responseHand.filter((_, i) => i !== cardIndex);
  const turn = { ...gameState.turnState };
  let newState = { ...gameState };

  switch (card.responseType) {
    case 'first_aid':
      // 不具合無効化
      break;
    case 'root_cause': {
      // 不具合無効化 + 山札から不具合1枚除外
      const drawPileCopy = [...newState.drawPile];
      const defIdx = drawPileCopy.findIndex(id => cardMaster[id]?.type === 'defect');
      if (defIdx >= 0) {
        drawPileCopy.splice(defIdx, 1);
      }
      newState = { ...newState, drawPile: drawPileCopy };
      break;
    }
    case 'inspection':
      turn.waterInspectionActive = true;
      break;
  }

  newState.turnState = turn;
  return { gameState: newState, newResponseHand: newHand };
}

// ===== 不具合をスキップ（対応カードを使わない） =====

export function multiSkipDefectResponse(
  gameState: MultiplayerGameState,
  defect: DefectCard,
): { gameState: MultiplayerGameState; panicked: boolean } {
  if (!gameState.turnState) return { gameState, panicked: false };

  const turn = { ...gameState.turnState };
  const { panicked } = applyDefectToTurn(turn, defect);

  return {
    gameState: { ...gameState, turnState: turn },
    panicked,
  };
}

// ===== ストップ（利益確定） =====

export function multiStopDrawing(
  gameState: MultiplayerGameState,
  uid: string,
  cardMaster: Record<string, Card>,
  responseHand: ResponseCard[],
): {
  gameState: MultiplayerGameState;
  newResponseHand: ResponseCard[];
  profit: number;
} {
  if (!gameState.turnState) {
    return { gameState, newResponseHand: responseHand, profit: 0 };
  }

  const turn = gameState.turnState;
  const profit = turn.currentProfit;

  // 対応カードドロー
  let responseDrawCount = 0;
  if (profit <= 2) responseDrawCount = 2;
  else if (profit <= 5) responseDrawCount = 1;

  const handSpace = RESPONSE_HAND_LIMIT - responseHand.length;
  responseDrawCount = Math.min(responseDrawCount, handSpace);

  let newRespStock = [...gameState.responseStock];
  let newRespDiscard = [...gameState.responseDiscard];
  const drawnResp: ResponseCard[] = [];

  for (let i = 0; i < responseDrawCount; i++) {
    if (newRespStock.length === 0) {
      if (newRespDiscard.length === 0) break;
      newRespStock = shuffle(newRespDiscard);
      newRespDiscard = [];
    }
    const respId = newRespStock.shift()!;
    const respCard = cardMaster[respId] as unknown as ResponseCard;
    if (respCard) drawnResp.push(respCard);
  }

  const newHand = [...responseHand, ...drawnResp];

  // ラウンド結果記録
  const roundResults = { ...gameState.roundResults };
  if (!roundResults[gameState.round]) {
    roundResults[gameState.round] = {};
  }
  roundResults[gameState.round] = {
    ...roundResults[gameState.round],
    [uid]: {
      profit,
      panicked: false,
      cardsDrawn: turn.drawnCards.length,
    },
  };

  const newState: MultiplayerGameState = {
    ...gameState,
    turnState: null,
    responseStock: newRespStock,
    responseDiscard: newRespDiscard,
    roundResults,
  };

  return { gameState: newState, newResponseHand: newHand, profit };
}

// ===== パニック処理 =====

export function multiHandlePanic(
  gameState: MultiplayerGameState,
  uid: string,
): MultiplayerGameState {
  if (!gameState.turnState) return gameState;

  const turn = gameState.turnState;

  // 汚染ペナルティ
  const contStock = [...gameState.contaminationStock];
  const drawPile = [...gameState.drawPile];
  const penaltyCount = Math.min(PANIC_CONTAMINATION_PENALTY, contStock.length);
  for (let i = 0; i < penaltyCount; i++) {
    drawPile.push(contStock.shift()!);
  }

  // ラウンド結果記録
  const roundResults = { ...gameState.roundResults };
  if (!roundResults[gameState.round]) {
    roundResults[gameState.round] = {};
  }
  roundResults[gameState.round] = {
    ...roundResults[gameState.round],
    [uid]: {
      profit: 0,
      panicked: true,
      cardsDrawn: turn.drawnCards.length,
    },
  };

  return {
    ...gameState,
    drawPile: shuffle(drawPile),
    contaminationStock: contStock,
    turnState: null,
    roundResults,
  };
}

// ===== ターン交代 =====

export function advanceTurn(
  gameState: MultiplayerGameState,
  playerOrder: string[],
): MultiplayerGameState {
  const currentIdx = gameState.currentPlayerIndex;
  const roundResults = gameState.roundResults[gameState.round];

  // 両プレイヤーがこのラウンドを終えたか
  const bothDone = roundResults && playerOrder.every(uid => uid in roundResults);

  if (bothDone) {
    // ラウンド終了 → 次ラウンドへ
    return advanceRound(gameState, playerOrder);
  }

  // 次のプレイヤーへ
  const nextIdx = (currentIdx + 1) % 2;
  return {
    ...gameState,
    currentPlayerUid: playerOrder[nextIdx],
    currentPlayerIndex: nextIdx,
    phase: 'prepare',
  };
}

// ===== ラウンド進行 =====

function advanceRound(
  gameState: MultiplayerGameState,
  playerOrder: string[],
): MultiplayerGameState {
  const nextRound = gameState.round + 1;

  if (nextRound > gameState.maxRounds || gameState.drawPile.length === 0) {
    return { ...gameState, phase: 'game_over' };
  }

  // 汚染投入: 前ラウンドの合計利益で計算
  const roundResult = gameState.roundResults[gameState.round];
  let totalProfit = 0;
  if (roundResult) {
    for (const uid of playerOrder) {
      totalProfit += roundResult[uid]?.profit ?? 0;
    }
  }

  let contaminationCount = Math.ceil(totalProfit / 2);
  contaminationCount = Math.min(contaminationCount, MAX_CONTAMINATION_PER_ROUND);

  const contStock = [...gameState.contaminationStock];
  const drawPile = [...gameState.drawPile];
  const toAdd = Math.min(contaminationCount, contStock.length);
  for (let i = 0; i < toAdd; i++) {
    drawPile.push(contStock.shift()!);
  }

  return {
    ...gameState,
    phase: 'prepare',
    round: nextRound,
    drawPile: shuffle(drawPile),
    contaminationStock: contStock,
    currentPlayerUid: playerOrder[0],
    currentPlayerIndex: 0,
    turnState: null,
    lastContamination: toAdd > 0 ? { count: toAdd, round: nextRound } : null,
  };
}

// ===== ストップ可能チェック =====

export function multiCanStop(turnState: TurnState | null): boolean {
  if (!turnState) return false;
  if (turnState.drawnCards.length === 0) return false;
  if (turnState.forcedDraws > 0) return false;
  return true;
}

// ===== 設計変更カード使用 =====

export function multiUseDesignChange(
  gameState: MultiplayerGameState,
  responseHand: ResponseCard[],
  cardIndex: number,
): {
  gameState: MultiplayerGameState;
  newResponseHand: ResponseCard[];
} {
  const card = responseHand[cardIndex];
  if (!card || card.responseType !== 'design_change') {
    return { gameState, newResponseHand: responseHand };
  }

  const newHand = responseHand.filter((_, i) => i !== cardIndex);
  const contStock = [...gameState.contaminationStock];
  const removeCount = Math.min(2, contStock.length);
  contStock.splice(0, removeCount);

  return {
    gameState: { ...gameState, contaminationStock: contStock },
    newResponseHand: newHand,
  };
}
