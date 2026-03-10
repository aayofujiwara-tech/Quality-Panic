type Props = {
  onDraw: () => void;
  onStop: () => void;
  canDraw: boolean;
  canStop: boolean;
  cardsDrawn: number;
};

export function ActionButtons({ onDraw, onStop, canDraw, canStop, cardsDrawn }: Props) {
  return (
    <div className="flex gap-3 sm:gap-4 justify-center mt-2 sm:mt-3">
      <button
        onClick={onDraw}
        disabled={!canDraw}
        className={`flex-1 sm:flex-none px-4 sm:px-8 min-h-[40px] sm:min-h-[44px] py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-lg transition-all ${
          canDraw
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:shadow-amber-500/30 cursor-pointer'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        出荷する
      </button>
      <button
        onClick={onStop}
        disabled={!canStop}
        className={`flex-1 sm:flex-none px-4 sm:px-8 min-h-[40px] sm:min-h-[44px] py-2 sm:py-3 rounded-lg font-bold text-sm sm:text-lg transition-all ${
          canStop
            ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg hover:shadow-green-500/30 cursor-pointer'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        出荷停止{cardsDrawn > 0 ? '' : ''}
      </button>
    </div>
  );
}
