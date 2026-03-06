import { ref, push, query, orderByChild, limitToLast, get } from 'firebase/database';
import { db } from './config';

export type RankingEntry = {
  playerName: string;
  score: number;
  difficulty: string;
  date: string; // ISO 8601
};

export type RankedEntry = RankingEntry & {
  rank: number;
  id: string;
};

/** プレイヤー名のバリデーション（英数字・ひらがな・カタカナ・漢字のみ、最大10文字） */
export function isValidPlayerName(name: string): boolean {
  if (name.length === 0 || name.length > 10) return false;
  // 英数字、ひらがな、カタカナ、漢字、長音符のみ許可
  return /^[a-zA-Z0-9\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF\u3005\u30FC]+$/.test(name);
}

/** ランキング登録 */
export async function submitRanking(entry: RankingEntry): Promise<void> {
  await push(ref(db, 'rankings'), entry);
}

/** トップ20を取得（スコア降順、同スコアは先に登録した方が上） */
export async function fetchTopRankings(): Promise<RankedEntry[]> {
  const q = query(
    ref(db, 'rankings'),
    orderByChild('score'),
    limitToLast(20),
  );
  const snapshot = await get(q);
  if (!snapshot.exists()) return [];

  const entries: { id: string; entry: RankingEntry }[] = [];
  snapshot.forEach((child) => {
    entries.push({ id: child.key!, entry: child.val() as RankingEntry });
  });

  // Firebase の limitToLast + orderByChild は昇順なので逆順にする
  // 同スコアは先に登録した方（date が早い方）が上
  entries.sort((a, b) => {
    if (b.entry.score !== a.entry.score) return b.entry.score - a.entry.score;
    return a.entry.date.localeCompare(b.entry.date);
  });

  return entries.map((e, i) => ({
    ...e.entry,
    id: e.id,
    rank: i + 1,
  }));
}
