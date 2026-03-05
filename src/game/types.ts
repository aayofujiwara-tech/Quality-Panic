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
  | 'kaizen' | 'iso_audit' | 'sampling_inspection';
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
// 'event_display': イベントカード発動表示中
// 'sampling': 抜き取り検査で3枚から1枚を選択中
export type GamePhase = 'title' | 'prepare' | 'shipping' | 'defect_response' | 'event_display' | 'sampling' | 'result' | 'game_over';

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

  // イベント表示待ち
  pendingEvent: EventCard | null;

  // イベント効果フラグ
  snsFireActive: boolean;
  forcedDraws: number;
  samplingNextRound: boolean;
  samplingCards: Card[];
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
