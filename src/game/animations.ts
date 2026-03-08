import { useState, useCallback, useRef, useEffect } from 'react';
import type { Card, EventCard } from './types';

export type AnimationState = {
  /** カードフリップ中 */
  flipping: boolean;
  /** フリップ中のカード */
  flippingCard: Card | null;
  /** パニック演出中 */
  panicking: boolean;
  /** 汚染投入テキスト（null=非表示） */
  contaminationText: string | null;
  /** スコアカウントアップ中 */
  scoreCounting: boolean;
  /** 対応カード使用中のインデックス */
  cardUsingIndex: number | null;
  /** イベントカードグロー中 */
  eventGlowing: boolean;
  /** イベントフラッシュタイプ */
  eventFlash: 'bad' | 'good' | null;
  /** 大量出荷テキスト表示中 */
  bigShipment: boolean;
  /** 全アニメーション中はtrue（ボタン無効化に使う） */
  busy: boolean;
};

const INITIAL: AnimationState = {
  flipping: false,
  flippingCard: null,
  panicking: false,
  contaminationText: null,
  scoreCounting: false,
  cardUsingIndex: null,
  eventGlowing: false,
  eventFlash: null,
  bigShipment: false,
  busy: false,
};

export function useAnimations() {
  const [anim, setAnim] = useState<AnimationState>(INITIAL);
  const timeoutRefs = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimeouts = useCallback(() => {
    timeoutRefs.current.forEach(clearTimeout);
    timeoutRefs.current = [];
  }, []);

  useEffect(() => clearTimeouts, [clearTimeouts]);

  const schedule = useCallback((fn: () => void, ms: number) => {
    const id = setTimeout(fn, ms);
    timeoutRefs.current.push(id);
    return id;
  }, []);

  /** カードフリップアニメーション。完了後にcallbackを呼びbusyを解除する */
  const flipCard = useCallback((card: Card, callback: () => void) => {
    setAnim(a => ({ ...a, flipping: true, flippingCard: card, busy: true }));
    schedule(() => {
      setAnim(a => ({ ...a, flipping: false, flippingCard: null, busy: false }));
      callback();
    }, 400);
  }, [schedule]);

  /** busy状態を解除する */
  const releaseBusy = useCallback(() => {
    setAnim(a => ({ ...a, busy: false }));
  }, []);

  /** 指定ミリ秒後にコールバックを実行する（タイマー管理付き） */
  const delay = useCallback((ms: number, fn: () => void) => {
    schedule(fn, ms);
  }, [schedule]);

  /** パニック演出。完了後にcallbackを呼ぶ */
  const playPanic = useCallback((callback: () => void) => {
    setAnim(a => ({ ...a, panicking: true, busy: true }));
    schedule(() => {
      setAnim(a => ({ ...a, panicking: false, busy: false }));
      callback();
    }, 1000);
  }, [schedule]);

  /** 汚染投入テキスト表示 */
  const showContamination = useCallback((count: number) => {
    const text = `+${count}枚汚染`;
    setAnim(a => ({ ...a, contaminationText: text }));
    schedule(() => {
      setAnim(a => ({ ...a, contaminationText: null }));
    }, 1500);
  }, [schedule]);

  /** スコアカウントアップ */
  const countUpScore = useCallback(() => {
    setAnim(a => ({ ...a, scoreCounting: true }));
    schedule(() => {
      setAnim(a => ({ ...a, scoreCounting: false }));
    }, 500);
  }, [schedule]);

  /** 大量出荷テキスト */
  const showBigShipment = useCallback(() => {
    setAnim(a => ({ ...a, bigShipment: true }));
    schedule(() => {
      setAnim(a => ({ ...a, bigShipment: false }));
    }, 1200);
  }, [schedule]);

  /** 対応カード使用演出 */
  const playCardUse = useCallback((index: number, callback: () => void) => {
    setAnim(a => ({ ...a, cardUsingIndex: index, busy: true }));
    schedule(() => {
      setAnim(a => ({ ...a, cardUsingIndex: null, busy: false }));
      callback();
    }, 500);
  }, [schedule]);

  /** イベントカード演出 */
  const playEventGlow = useCallback((event: EventCard) => {
    const badEvents = ['sns_fire', 'deadline_pressure', 'veteran_retire'];
    const isBad = badEvents.includes(event.eventType);
    setAnim(a => ({
      ...a,
      eventGlowing: true,
      eventFlash: isBad ? 'bad' : 'good',
    }));
    schedule(() => {
      setAnim(a => ({ ...a, eventGlowing: false, eventFlash: null }));
    }, 600);
  }, [schedule]);

  const reset = useCallback(() => {
    clearTimeouts();
    setAnim(INITIAL);
  }, [clearTimeouts]);

  return { anim, flipCard, releaseBusy, delay, playPanic, showContamination, countUpScore, showBigShipment, playCardUse, playEventGlow, reset };
}
