const STORAGE_KEY = 'quality-panic-highscore';

export type HighScoreData = {
  score: number;
  date: string; // ISO 8601
};

export function getHighScore(): HighScoreData | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as HighScoreData;
    if (typeof data.score !== 'number' || typeof data.date !== 'string') return null;
    return data;
  } catch {
    return null;
  }
}

/** スコアを記録し、ハイスコア更新なら true を返す */
export function saveHighScore(score: number): boolean {
  const current = getHighScore();
  if (current && current.score >= score) return false;

  const data: HighScoreData = {
    score,
    date: new Date().toISOString(),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  return true;
}
