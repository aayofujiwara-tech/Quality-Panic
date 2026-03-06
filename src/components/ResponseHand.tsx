import { useState, useCallback, useRef, useEffect } from 'react';
import type { ResponseCard } from '../game/types';

type Props = {
  hand: ResponseCard[];
  onUseCard: (index: number) => void;
  disabled?: boolean;
  highlightUsable?: boolean; // 不具合対応時にtrue
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

export function ResponseHand({ hand, onUseCard, disabled, highlightUsable }: Props) {
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

  const handleTap = useCallback((i: number, e: React.MouseEvent | React.TouchEvent) => {
    // タッチデバイスでツールチップ表示を切り替え
    if ('ontouchstart' in window) {
      if (tooltipIndex === i) {
        setTooltipIndex(null);
      } else {
        e.preventDefault();
        setTooltipIndex(i);
      }
    }
  }, [tooltipIndex]);

  if (hand.length === 0) return null;

  return (
    <div className="border-t border-gray-700 px-3 sm:px-6 py-2 sm:py-3" ref={containerRef}>
      <div className="text-xs text-gray-500 mb-1.5 sm:mb-2">対応カード手札 ({hand.length}/3)</div>
      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        {hand.map((card, i) => {
          const isDefectResponse = card.responseType !== 'design_change';
          const isHighlighted = highlightUsable && isDefectResponse;
          const showTooltip = tooltipIndex === i;
          return (
            <div key={i} className="relative group">
              <button
                onClick={(e) => {
                  handleTap(i, e);
                  if (!('ontouchstart' in window)) {
                    onUseCard(i);
                  }
                }}
                onDoubleClick={() => {
                  if ('ontouchstart' in window) {
                    onUseCard(i);
                  }
                }}
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

              {/* PC: ホバーツールチップ */}
              <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 sm:w-56 pointer-events-none z-50">
                <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-xs">
                  <div className="font-bold text-white mb-1">{cardIcon[card.responseType]} {card.name}</div>
                  <div className="text-gray-300 leading-relaxed">{cardTooltip[card.responseType]}</div>
                </div>
                <div className="w-2 h-2 bg-gray-800 border-r border-b border-gray-600 rotate-45 mx-auto -mt-1" />
              </div>

              {/* スマホ: タップツールチップ */}
              {showTooltip && (
                <div className="block sm:hidden absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 z-50">
                  <div className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 shadow-xl text-xs">
                    <div className="font-bold text-white mb-1">{cardIcon[card.responseType]} {card.name}</div>
                    <div className="text-gray-300 leading-relaxed">{cardTooltip[card.responseType]}</div>
                  </div>
                  <div className="w-2 h-2 bg-gray-800 border-r border-b border-gray-600 rotate-45 mx-auto -mt-1" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
