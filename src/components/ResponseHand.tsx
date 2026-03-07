import { useState, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import type { ResponseCard } from '../game/types';

type Props = {
  hand: ResponseCard[];
  onUseCard: (index: number) => void;
  disabled?: boolean;
  highlightUsable?: boolean; // 不具合対応時にtrue
  cardUsingIndex?: number | null;
};

const cardColor: Record<string, string> = {
  first_aid: 'bg-green-900 border-green-500 text-green-200 hover:bg-green-800',
  root_cause: 'bg-teal-900 border-teal-500 text-teal-200 hover:bg-teal-800',
  inspection: 'bg-emerald-900 border-emerald-500 text-emerald-200 hover:bg-emerald-800',
  design_change: 'bg-cyan-900 border-cyan-400 text-cyan-200 hover:bg-cyan-800',
};

const cardIcon: Record<string, string> = {
  first_aid: '🩹',
  root_cause: '🔍',
  inspection: '🛡️',
  design_change: '⚙️',
};

const cardTooltip: Record<string, string> = {
  first_aid: '不具合1枚を無効化する（ポイント加算なし）',
  root_cause: '不具合を無効化し、さらに山札から不具合1枚を除外する',
  inspection: 'この不具合と次の不具合も自動で無効化する（2枚分）',
  design_change: '汚染ストックから2枚を永久除外する。このカード自身もゲームから除外される（リサイクルされない）',
};

const TOOLTIP_WIDTH = 250;
const SCREEN_PADDING = 8;

function useTooltipPosition(buttonRef: React.RefObject<HTMLButtonElement | null>, visible: boolean) {
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [arrowOffset, setArrowOffset] = useState<number>(0);

  useLayoutEffect(() => {
    if (!visible || !buttonRef.current) return;
    const btn = buttonRef.current.getBoundingClientRect();
    const btnCenterX = btn.left + btn.width / 2;

    // ツールチップの理想的な左端（中央揃え）
    let left = btnCenterX - TOOLTIP_WIDTH / 2;

    // 画面左端からはみ出す場合
    if (left < SCREEN_PADDING) {
      left = SCREEN_PADDING;
    }
    // 画面右端からはみ出す場合
    if (left + TOOLTIP_WIDTH > window.innerWidth - SCREEN_PADDING) {
      left = window.innerWidth - SCREEN_PADDING - TOOLTIP_WIDTH;
    }

    // 矢印のオフセット: ボタン中央 - ツールチップ左端（ツールチップ内での相対位置）
    const arrow = btnCenterX - left;

    setStyle({
      position: 'fixed',
      bottom: window.innerHeight - btn.top + 8,
      left,
      width: TOOLTIP_WIDTH,
    });
    setArrowOffset(arrow);
  }, [visible, buttonRef]);

  return { style, arrowOffset };
}

function Tooltip({ buttonRef, visible, responseType, name }: {
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  visible: boolean;
  responseType: string;
  name: string;
}) {
  const { style, arrowOffset } = useTooltipPosition(buttonRef, visible);

  if (!visible) return null;

  return (
    <div style={style} className="z-50 pointer-events-none">
      <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-xs">
        <div className="font-bold text-white mb-1">{cardIcon[responseType]} {name}</div>
        <div className="text-gray-300 leading-relaxed">{cardTooltip[responseType]}</div>
      </div>
      <div
        className="w-2 h-2 bg-gray-800 border-r border-b border-gray-600 rotate-45 -mt-1"
        style={{ marginLeft: arrowOffset - 4 }}
      />
    </div>
  );
}

function CardWithTooltip({ card, index, onUseCard, disabled, isHighlighted, tooltipIndex, setTooltipIndex }: {
  card: ResponseCard;
  index: number;
  onUseCard: (i: number) => void;
  disabled?: boolean;
  isHighlighted: boolean;
  tooltipIndex: number | null;
  setTooltipIndex: (i: number | null) => void;
}) {
  const buttonRef = useRef<HTMLButtonElement | null>(null);
  const [hovered, setHovered] = useState(false);
  const showTooltip = tooltipIndex === index || hovered;

  const handleTap = useCallback((e: React.MouseEvent) => {
    if ('ontouchstart' in window) {
      if (tooltipIndex === index) {
        setTooltipIndex(null);
      } else {
        e.preventDefault();
        setTooltipIndex(index);
      }
    }
  }, [tooltipIndex, index, setTooltipIndex]);

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={(e) => {
          handleTap(e);
          if (!('ontouchstart' in window)) {
            onUseCard(index);
          }
        }}
        onDoubleClick={() => {
          if ('ontouchstart' in window) {
            onUseCard(index);
          }
        }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        disabled={disabled}
        className={`px-2 sm:px-3 py-2 min-h-[44px] rounded border text-xs sm:text-sm font-medium transition-all cursor-pointer
          ${cardColor[card.responseType]}
          ${isHighlighted ? 'ring-2 ring-yellow-400 scale-105' : ''}
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <span className="mr-0.5 sm:mr-1">{cardIcon[card.responseType]}</span>
        {card.name}
      </button>

      <Tooltip
        buttonRef={buttonRef}
        visible={showTooltip}
        responseType={card.responseType}
        name={card.name}
      />
    </div>
  );
}

export function ResponseHand({ hand, onUseCard, disabled, highlightUsable, cardUsingIndex }: Props) {
  const [tooltipIndex, setTooltipIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // カード外タップで閉じる
  useEffect(() => {
    if (tooltipIndex === null) return;
    const handleTouch = (e: TouchEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setTooltipIndex(null);
      }
    };
    document.addEventListener('touchstart', handleTouch);
    return () => document.removeEventListener('touchstart', handleTouch);
  }, [tooltipIndex]);

  if (hand.length === 0) return null;

  return (
    <div className="border-t border-gray-700 px-3 sm:px-6 py-2 sm:py-3" ref={containerRef}>
      <div className="text-xs text-gray-500 mb-1.5 sm:mb-2">対応カード手札 ({hand.length}/3)</div>
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {hand.map((card, i) => {
          const isDefectResponse = card.responseType !== 'design_change';
          const isHighlighted = highlightUsable === true && isDefectResponse;
          return (
            <div key={i} className={cardUsingIndex === i ? 'card-use-glow' : ''}>
              <CardWithTooltip
                card={card}
                index={i}
                onUseCard={onUseCard}
                disabled={disabled}
                isHighlighted={isHighlighted}
                tooltipIndex={tooltipIndex}
                setTooltipIndex={setTooltipIndex}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
}
