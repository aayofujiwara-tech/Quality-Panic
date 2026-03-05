import type { Difficulty } from './types';

export const MAX_ROUNDS = 8;
export const PANIC_THRESHOLD = 3;
export const RESPONSE_HAND_LIMIT = 3;
export const MAX_CONTAMINATION_PER_ROUND = 4;
export const PANIC_CONTAMINATION_PENALTY = 3;

export const DIFFICULTIES: Difficulty[] = [
  { name: '簡単', targetScore: 25 },
  { name: '普通', targetScore: 35 },
  { name: '難しい', targetScore: 45 },
  { name: '品証の神', targetScore: 55 },
];

// 出荷山札の初期構成
export const INITIAL_PRODUCTS = {
  standard: { count: 20, value: 1, name: '量産品' },
  premium: { count: 10, value: 2, name: '高付加価値品' },
  large: { count: 6, value: 3, name: '大型案件' },
};

export const INITIAL_DEFECTS = {
  yellow: { count: 8, defectPoints: 1, name: '軽微な不具合' },
  red: { count: 3, defectPoints: 2, name: '重大な不具合' },
};

// イベントカード枚数
export const INITIAL_EVENTS = {
  sns_fire: { count: 2, name: 'SNS炎上', description: '次の不具合Ptが2倍' },
  deadline_pressure: { count: 2, name: '納期プレッシャー', description: 'あと最低2枚めくらないといけない' },
  veteran_retire: { count: 1, name: 'ベテラン退職', description: 'パニック閾値が一時的に2に下がる' },
  kaizen: { count: 2, name: '改善提案', description: '不具合1枚を無効化' },
  iso_audit: { count: 1, name: 'ISO監査', description: '不具合Pt=0ならボーナス3点' },
  sampling_inspection: { count: 2, name: '抜き取り検査', description: '次ラウンド開始時、山札から3枚を抜き取り検査。1枚を選んで確保できる' },
};

// 汚染ストック構成
export const CONTAMINATION_STOCK = {
  yellow: { count: 8, defectPoints: 1, name: '軽微な不具合' },
  red: { count: 6, defectPoints: 2, name: '重大な不具合' },
  black: { count: 4, defectPoints: 3, name: 'リコール級' },
};

// 対応カード構成
export const RESPONSE_CARDS = {
  first_aid: { count: 4, name: '応急処置', description: '不具合1枚を無効化（Pt加算なし）' },
  root_cause: { count: 3, name: '原因調査', description: '無効化 + 山札から不具合1枚除外' },
  inspection: { count: 2, name: '水際検査', description: '次の不具合も自動無効化（2枚分）' },
  design_change: { count: 1, name: '設計変更', description: '汚染ストックから2枚を永久除外' },
};
