import {
  ref, set, get, onValue, onDisconnect, remove, serverTimestamp,
  type Unsubscribe,
} from 'firebase/database';
import { db } from './config';
import { ROOM_CODE_LENGTH } from '../game/constants';
import type { Room, PlayerInfo } from '../game/types';

// ===== ルームコード生成 =====

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 紛らわしい文字を除外

function generateRoomCode(): string {
  let code = '';
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)];
  }
  return code;
}

// ===== ルーム参照ヘルパー =====

function roomRef(roomCode: string) {
  return ref(db, `rooms/${roomCode}`);
}

function playerRef(roomCode: string, uid: string) {
  return ref(db, `rooms/${roomCode}/players/${uid}`);
}

// ===== ルーム作成 =====

export async function createRoom(uid: string, playerName: string): Promise<string> {
  // 重複しないコードを生成（最大10回試行）
  for (let attempt = 0; attempt < 10; attempt++) {
    const code = generateRoomCode();
    const snapshot = await get(roomRef(code));
    if (snapshot.exists()) continue;

    const player: PlayerInfo = {
      name: playerName,
      ready: true,
      score: 0,
      responseHand: [],
      connected: true,
    };

    const roomData = {
      roomCode: code,
      status: 'waiting' as const,
      createdAt: serverTimestamp(),
      players: { [uid]: player },
      hostUid: uid,
      playerOrder: [uid],
    };

    await set(roomRef(code), roomData);

    // 切断時に connected を false にする
    await setupDisconnect(code, uid);

    return code;
  }
  throw new Error('ルームコードの生成に失敗しました。もう一度お試しください。');
}

// ===== ルーム参加 =====

export async function joinRoom(roomCode: string, uid: string, playerName: string): Promise<Room> {
  const upperCode = roomCode.toUpperCase();
  const snapshot = await get(roomRef(upperCode));

  if (!snapshot.exists()) {
    throw new Error('ルームが見つかりません');
  }

  const room = snapshot.val() as Room;

  if (room.status !== 'waiting') {
    throw new Error('このルームは既にゲーム中です');
  }

  const playerCount = room.players ? Object.keys(room.players).length : 0;
  if (playerCount >= 2) {
    throw new Error('ルームが満員です');
  }

  // 自分が既に参加済みなら再接続
  if (room.players?.[uid]) {
    await set(ref(db, `rooms/${upperCode}/players/${uid}/connected`), true);
    await setupDisconnect(upperCode, uid);
    return { ...room, players: { ...room.players, [uid]: { ...room.players[uid], connected: true } } };
  }

  const player: PlayerInfo = {
    name: playerName,
    ready: true,
    score: 0,
    responseHand: [],
    connected: true,
  };

  const currentOrder = Array.isArray(room.playerOrder) ? room.playerOrder : (room.playerOrder ? Object.values(room.playerOrder) as string[] : []);

  await set(playerRef(upperCode, uid), player);
  await set(ref(db, `rooms/${upperCode}/playerOrder`), [...currentOrder, uid]);

  // 切断時に connected を false にする
  await setupDisconnect(upperCode, uid);

  return { ...room, players: { ...room.players, [uid]: player }, playerOrder: [...currentOrder, uid] };
}

// ===== 切断検知 =====

async function setupDisconnect(roomCode: string, uid: string) {
  const connectedRef = ref(db, `rooms/${roomCode}/players/${uid}/connected`);
  await onDisconnect(connectedRef).set(false);
}

// ===== ルーム監視 =====

/** Firebaseから取得したルームデータの配列フィールドを正規化する */
function normalizeRoom(raw: Room): Room {
  const room = { ...raw };
  // playerOrderがFirebaseで消える（空配列→null）場合のガード
  if (!Array.isArray(room.playerOrder)) {
    room.playerOrder = room.playerOrder ? Object.values(room.playerOrder) : [];
  }
  // gameState内の配列フィールドも正規化
  if (room.gameState) {
    const gs = { ...room.gameState };
    gs.drawPile = Array.isArray(gs.drawPile) ? gs.drawPile : [];
    gs.contaminationStock = Array.isArray(gs.contaminationStock) ? gs.contaminationStock : [];
    gs.responseStock = Array.isArray(gs.responseStock) ? gs.responseStock : [];
    gs.responseDiscard = Array.isArray(gs.responseDiscard) ? gs.responseDiscard : [];
    if (gs.turnState) {
      gs.turnState = {
        ...gs.turnState,
        drawnCards: Array.isArray(gs.turnState.drawnCards) ? gs.turnState.drawnCards : [],
      };
    }
    room.gameState = gs;
  }
  return room;
}

export function listenRoom(roomCode: string, callback: (room: Room | null) => void): Unsubscribe {
  return onValue(roomRef(roomCode), (snapshot) => {
    if (!snapshot.exists()) {
      callback(null);
      return;
    }
    callback(normalizeRoom(snapshot.val() as Room));
  });
}

// ===== ルーム検索（コードで） =====

export async function findRoom(roomCode: string): Promise<Room | null> {
  const upperCode = roomCode.toUpperCase();
  const snapshot = await get(roomRef(upperCode));
  return snapshot.exists() ? normalizeRoom(snapshot.val() as Room) : null;
}

// ===== ルーム退出 =====

export async function leaveRoom(roomCode: string, uid: string, isHost: boolean): Promise<void> {
  if (isHost) {
    // ホストが退出したらルーム削除
    await remove(roomRef(roomCode));
  } else {
    // ゲストが退出したらプレイヤー情報だけ削除
    await remove(playerRef(roomCode, uid));
    const snapshot = await get(ref(db, `rooms/${roomCode}/playerOrder`));
    if (snapshot.exists()) {
      const raw = snapshot.val();
      const orderArr: string[] = Array.isArray(raw) ? raw : (raw ? Object.values(raw) : []);
      const order = orderArr.filter((id) => id !== uid);
      await set(ref(db, `rooms/${roomCode}/playerOrder`), order);
    }
  }
}

// ===== ルームステータス更新 =====

export async function updateRoomStatus(roomCode: string, status: Room['status']): Promise<void> {
  await set(ref(db, `rooms/${roomCode}/status`), status);
}
