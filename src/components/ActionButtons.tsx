type Props = {
  onDraw: () => void;
  onStop: () => void;
  canDraw: boolean;
  canStop: boolean;
  cardsDrawn: number;
};

export function ActionButtons({ onDraw, onStop, canDraw, canStop, cardsDrawn }: Props) {
  return (
    <div className="flex gap-4 justify-center mt-4">
      <button
        onClick={onDraw}
        disabled={!canDraw}
        className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
          canDraw
            ? 'bg-amber-600 hover:bg-amber-500 text-white shadow-lg hover:shadow-amber-500/30 cursor-pointer'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        もう1枚めくる
      </button>
      <button
        onClick={onStop}
        disabled={!canStop}
        className={`px-8 py-3 rounded-lg font-bold text-lg transition-all ${
          canStop
            ? 'bg-green-700 hover:bg-green-600 text-white shadow-lg hover:shadow-green-500/30 cursor-pointer'
            : 'bg-gray-700 text-gray-500 cursor-not-allowed'
        }`}
      >
        ここで止める{cardsDrawn > 0 ? '' : ''}
      </button>
    </div>
  );
}
