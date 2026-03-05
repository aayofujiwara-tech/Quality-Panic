import { ref, set, get, onValue, type Unsubscribe } from 'firebase/database';
import { db } from './config';
import type { Room, MultiplayerGameState, PlayerInfo, ResponseCard, Card } from '../game/types';

// ===== ゲーム状態の書き込み =====

export async function writeGameState(roomCode: string, gameState: MultiplayerGameState): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/gameState`), gameState);
}

export async function writeCardMaster(roomCode: string, cardMaster: Record<string, Card>): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/cardMaster`), cardMaster);
}

export async function writePlayerInfo(
  roomCode: string,
  uid: string,
  updates: Partial<PlayerInfo>,
): Promise<void> {
  const playerRef = ref(db, `rooms/${roomCode}/players/${uid}`);
  const snapshot = await get(playerRef);
  if (snapshot.exists()) {
    const current = snapshot.val() as PlayerInfo;
    await set(playerRef, { ...current, ...updates });
  }
}

export async function writePlayerResponseHand(
  roomCode: string,
  uid: string,
  hand: ResponseCard[],
): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/players/${uid}/responseHand`), hand);
}

export async function writePlayerScore(
  roomCode: string,
  uid: string,
  score: number,
): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/players/${uid}/score`), score);
}

// ===== ゲーム状態の監視 =====

export function listenGameState(
  roomCode: string,
  callback: (gameState: MultiplayerGameState | null) => void,
): Unsubscribe {
  return onValue(ref(db, `rooms/${roomCode}/gameState`), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(normalizeGameState(snapshot.val() as MultiplayerGameState));
  });
}

// ===== ルーム全体の読み込み =====

/** Firebaseから取得したGameStateの配列フィールドを正規化する */
function normalizeGameState(gs: MultiplayerGameState): MultiplayerGameState {
  return {
    ...gs,
    drawPile: Array.isArray(gs.drawPile) ? gs.drawPile : [],
    contaminationStock: Array.isArray(gs.contaminationStock) ? gs.contaminationStock : [],
    responseStock: Array.isArray(gs.responseStock) ? gs.responseStock : [],
    responseDiscard: Array.isArray(gs.responseDiscard) ? gs.responseDiscard : [],
    turnState: gs.turnState ? {
      ...gs.turnState,
      drawnCards: Array.isArray(gs.turnState.drawnCards) ? gs.turnState.drawnCards : [],
    } : null,
  };
}

export async function readRoom(roomCode: string): Promise<Room | null> {
  const snapshot = await get(ref(db, `rooms/${roomCode}`));
  if (!snapshot.exists()) return null;
  const room = snapshot.val() as Room;
  if (room.gameState) {
    room.gameState = normalizeGameState(room.gameState);
  }
  return room;
}

// ===== ルームステータス更新 =====

export async function writeRoomStatus(roomCode: string, status: Room['status']): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/status`), status);
}

// ===== 一括初期化（ゲーム開始時） =====

export async function initializeGameInRoom(
  roomCode: string,
  gameState: MultiplayerGameState,
  cardMaster: Record<string, Card>,
  playerResponseHands: Record<string, ResponseCard[]>,
): Promise<void> {
  // ゲーム状態とカードマスタを書き込み
  await Promise.all([
    writeGameState(roomCode, gameState),
    writeCardMaster(roomCode, cardMaster),
    writeRoomStatus(roomCode, 'playing'),
  ]);

  // 各プレイヤーの対応カード手札を設定
  await Promise.all(
    Object.entries(playerResponseHands).map(([uid, hand]) =>
      writePlayerResponseHand(roomCode, uid, hand)
    )
  );
}
