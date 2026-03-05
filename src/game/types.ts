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

// ===== 2人対戦用の型定義 =====

export type RoomStatus = 'waiting' | 'playing' | 'finished';

export type MultiplayerPhase = 'waiting' | 'prepare' | 'shipping' | 'result' | 'game_over';

export type PlayerInfo = {
  name: string;
  ready: boolean;
  score: number;
  responseHand: ResponseCard[];
  connected: boolean;
};

export type TurnState = {
  drawnCards: string[];       // カードIDの配列
  currentProfit: number;
  currentDefectPoints: number;
  panicThreshold: number;
  snsFireActive: boolean;
  forcedDraws: number;
  waterInspectionActive: boolean;
  isPanicked: boolean;
};

export type RoundResultMulti = {
  [uid: string]: {
    profit: number;
    panicked: boolean;
    cardsDrawn: number;
  };
};

export type MultiplayerGameState = {
  phase: MultiplayerPhase;
  round: number;
  maxRounds: number;

  // 山札（カードIDの配列）
  drawPile: string[];
  contaminationStock: string[];

  // 対応カード（共有ストック）
  responseStock: string[];
  responseDiscard: string[];

  // 現在の手番
  currentPlayerUid: string;
  currentPlayerIndex: number;  // 0 or 1

  // 手番中の状態
  turnState: TurnState | null;

  // ラウンド結果
  roundResults: {
    [round: number]: RoundResultMulti;
  };

  // 汚染情報（演出用）
  lastContamination: {
    count: number;
    round: number;
  } | null;
};

export type Room = {
  roomCode: string;
  status: RoomStatus;
  createdAt: number;

  players: {
    [uid: string]: PlayerInfo;
  };
  hostUid: string;
  playerOrder: string[];  // [hostUid, guestUid]

  gameState: MultiplayerGameState;

  // カードマスタデータ（ルーム作成時にホストが生成）
  cardMaster: {
    [cardId: string]: Card;
  };
};
