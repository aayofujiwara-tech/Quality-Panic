import type { Card, DefectCard, ResponseCard } from './types';
import {
  INITIAL_PRODUCTS,
  INITIAL_DEFECTS,
  INITIAL_EVENTS,
  CONTAMINATION_STOCK,
  RESPONSE_CARDS,
} from './constants';

// Fisher-Yatesシャッフル
export function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// 出荷山札の初期生成
export function createInitialDrawPile(): Card[] {
  const cards: Card[] = [];

  // 製品カード
  for (const [, config] of Object.entries(INITIAL_PRODUCTS)) {
    for (let i = 0; i < config.count; i++) {
      cards.push({ type: 'product', name: config.name, value: config.value });
    }
  }

  // 不具合カード（初期）
  for (const [severity, config] of Object.entries(INITIAL_DEFECTS)) {
    for (let i = 0; i < config.count; i++) {
      cards.push({
        type: 'defect',
        severity: severity as 'yellow' | 'red',
        name: config.name,
        defectPoints: config.defectPoints,
      });
    }
  }

  // イベントカード
  for (const [eventType, config] of Object.entries(INITIAL_EVENTS)) {
    for (let i = 0; i < config.count; i++) {
      cards.push({
        type: 'event',
        eventType: eventType as Card extends { eventType: infer E } ? E : never,
        name: config.name,
        description: config.description,
      } as Card);
    }
  }

  return shuffle(cards);
}

// 汚染ストック生成（上から順に投入される）
export function createContaminationStock(): DefectCard[] {
  const cards: DefectCard[] = [];

  // 1〜8: 軽微（黄）
  for (let i = 0; i < CONTAMINATION_STOCK.yellow.count; i++) {
    cards.push({
      type: 'defect',
      severity: 'yellow',
      name: CONTAMINATION_STOCK.yellow.name,
      defectPoints: CONTAMINATION_STOCK.yellow.defectPoints,
    });
  }

  // 9〜14: 重大（赤）
  for (let i = 0; i < CONTAMINATION_STOCK.red.count; i++) {
    cards.push({
      type: 'defect',
      severity: 'red',
      name: CONTAMINATION_STOCK.red.name,
      defectPoints: CONTAMINATION_STOCK.red.defectPoints,
    });
  }

  // 15〜18: リコール級（黒）
  for (let i = 0; i < CONTAMINATION_STOCK.black.count; i++) {
    cards.push({
      type: 'defect',
      severity: 'black',
      name: CONTAMINATION_STOCK.black.name,
      defectPoints: CONTAMINATION_STOCK.black.defectPoints,
    });
  }

  return cards; // 順番固定（シャッフルしない）
}

// 対応カード山の生成
export function createResponseStock(): ResponseCard[] {
  const cards: ResponseCard[] = [];

  for (const [responseType, config] of Object.entries(RESPONSE_CARDS)) {
    for (let i = 0; i < config.count; i++) {
      cards.push({
        responseType: responseType as ResponseCard['responseType'],
        name: config.name,
        description: config.description,
      });
    }
  }

  return shuffle(cards);
}
