// カードの種類
export type CardType = 'product' | 'defect' | 'event';

// 製品カード
export type ProductCard = {
  type: 'product';
  name: string;
  value: number;
};

// 不具合カード
export type DefectCard = {
  type: 'defect';
  severity: 'yellow' | 'red' | 'black';
  name: string;
  defectPoints: number;
};

// イベントカード
export type EventType = 'sns_fire' | 'deadline_pressure' | 'veteran_retire'
  | 'kaizen' | 'iso_audit' | 'rookie';
export type EventCard = {
  type: 'event';
  eventType: EventType;
  name: string;
  description: string;
};

export type Card = ProductCard | DefectCard | EventCard;

// 対応カード
export type ResponseType = 'first_aid' | 'root_cause' | 'inspection' | 'design_change';
export type ResponseCard = {
  responseType: ResponseType;
  name: string;
  description: string;
};

// ゲームフェーズ
// 'defect_response': 不具合カードが出て対応カード使用を判断中
export type GamePhase = 'title' | 'prepare' | 'shipping' | 'defect_response' | 'result' | 'game_over';

// ゲーム状態
export type GameState = {
  phase: GamePhase;
  round: number;
  maxRounds: number;
  score: number;
  targetScore: number;
  difficulty: string;

  // 山札
  drawPile: Card[];
  contaminationStock: DefectCard[];

  // 対応カード（Phase 2で本格利用）
  responseStock: ResponseCard[];
  responseDiscard: ResponseCard[];
  responseHand: ResponseCard[];

  // 現在のラウンド状態
  currentRoundProfit: number;
  currentRoundProducts: ProductCard[];
  currentDefectPoints: number;
  panicThreshold: number;

  // 不具合対応待ち
  pendingDefect: DefectCard | null;

  // イベント効果フラグ（Phase 3で本格利用）
  snsFireActive: boolean;
  forcedDraws: number;
  rookieNextRound: boolean;
  canPreviewFirstCard: boolean;
  waterInspectionActive: boolean;

  // 履歴
  roundHistory: RoundResult[];
  lastDrawnCard: Card | null;
  drawnCardsThisRound: Card[];

  // ゲーム終了
  gameResult: 'playing' | 'clear' | 'failed';
};

export type RoundResult = {
  round: number;
  profit: number;
  panicked: boolean;
  cardsDrawn: number;
};

export type Difficulty = {
  name: string;
  targetScore: number;
};
