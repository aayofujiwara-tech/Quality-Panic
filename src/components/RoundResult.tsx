import type { RoundResult as RoundResultType, Card, DefectPointChange } from '../game/types';

type Props = {
  result: RoundResultType;
  totalScore: number;
  targetScore: number;
  responseCardsGained: number;
  onNext: () => void;
  drawnCards?: Card[];
  defectPointsLog?: DefectPointChange[];
};

function cardStyle(card: Card): string {
  switch (card.type) {
    case 'product':
      return 'bg-blue-900 border-blue-500 text-blue-200';
    case 'defect':
      if (card.severity === 'black') return 'bg-gray-900 border-gray-400 text-gray-200';
      if (card.severity === 'red') return 'bg-red-900 border-red-500 text-red-200';
      return 'bg-yellow-900 border-yellow-500 text-yellow-200';
    case 'event':
      return 'bg-purple-900 border-purple-500 text-purple-200';
  }
}

function cardIcon(card: Card): string {
  switch (card.type) {
    case 'product':
      return card.value >= 3 ? '💎' : card.value >= 2 ? '⭐' : '📋';
    case 'defect':
      return card.severity === 'black' ? '💀' : card.severity === 'red' ? '🔴' : '🟡';
    case 'event':
      return '⚡';
  }
}

function cardLabel(card: Card): string {
  switch (card.type) {
    case 'product':
      return `${card.name} +${card.value}`;
    case 'defect':
      return `${card.name} (${card.defectPoints}pt)`;
    case 'event':
      return card.name;
  }
}

/** 不具合Pt変動の1エントリのアイコン */
function changeIcon(changeType: DefectPointChange['changeType']): string {
  switch (changeType) {
    case 'increase': return '';
    case 'decrease': return '✨';
    case 'nullified': return '🩹';
  }
}

/** パニック時のカード履歴＋不具合Pt推移 */
export function PanicCardHistory({ cards, defectPointsLog }: { cards: Card[]; defectPointsLog?: DefectPointChange[] }) {
  // パニック原因カードのインデックスを特定（最後の不具合カード）
  let panicCauseIndex = -1;
  for (let i = cards.length - 1; i >= 0; i--) {
    if (cards[i].type === 'defect') {
      panicCauseIndex = i;
      break;
    }
  }

  // ログがある場合はログベースで推移表示、なければカードから推定
  const hasLog = defectPointsLog && defectPointsLog.length > 0;

  return (
    <div className="w-full max-w-md mt-2">
      {/* 不具合Pt推移 */}
      <div className="flex items-center justify-center gap-1 text-xs sm:text-sm mb-3 flex-wrap">
        <span className="text-gray-400">不具合Pt:</span>
        {hasLog ? (
          <>
            <span className="text-green-400">0</span>
            {defectPointsLog.map((entry, i) => (
              <span key={i} className="flex items-center">
                <span className="text-gray-600 mx-0.5">→</span>
                {entry.changeType !== 'increase' && (
                  <span className="mr-0.5" title={entry.reason}>{changeIcon(entry.changeType)}</span>
                )}
                <span
                  className={
                    i === defectPointsLog.length - 1
                      ? 'text-red-400 font-bold'
                      : entry.changeType === 'decrease'
                        ? 'text-emerald-400'
                        : entry.changeType === 'nullified'
                          ? 'text-blue-400'
                          : entry.points === 0
                            ? 'text-green-400'
                            : 'text-yellow-400'
                  }
                  title={entry.reason}
                >
                  {entry.points}
                </span>
              </span>
            ))}
          </>
        ) : (
          <>
            {(() => {
              const progression: number[] = [0];
              let cum = 0;
              for (const card of cards) {
                if (card.type === 'defect') {
                  cum += card.defectPoints;
                  progression.push(cum);
                }
              }
              return progression.map((pt, i) => (
                <span key={i} className="flex items-center">
                  {i > 0 && <span className="text-gray-600 mx-0.5">→</span>}
                  <span className={
                    i === progression.length - 1
                      ? 'text-red-400 font-bold'
                      : pt === 0
                        ? 'text-green-400'
                        : 'text-yellow-400'
                  }>
                    {pt}
                  </span>
                </span>
              ));
            })()}
          </>
        )}
        <span className="text-red-400 font-bold ml-1">パニック！</span>
      </div>

      {/* カード履歴 */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        {cards.map((card, i) => {
          const isPanicCause = i === panicCauseIndex;
          return (
            <div
              key={i}
              className={`px-2 py-1 rounded border text-xs font-medium ${cardStyle(card)}
                ${isPanicCause ? 'ring-2 ring-red-500 animate-pulse' : ''}
              `}
            >
              <span className="mr-0.5">{cardIcon(card)}</span>
              {cardLabel(card)}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function RoundResultView({ result, totalScore, targetScore, responseCardsGained, onNext, drawnCards, defectPointsLog }: Props) {
  return (
    <div className="flex flex-col items-center justify-center gap-6 py-12">
      {result.panicked ? (
        <>
          <div className="text-4xl font-bold text-red-400">パニック発生！</div>
          <div className="text-gray-400">このラウンドの利益は全て失われました...</div>
          <div className="text-sm text-red-300">汚染ストックから3枚が山札に追加投入されました</div>
          <div className="text-sm text-gray-500 mt-1">対応カードは入手できません</div>
          {drawnCards && drawnCards.length > 0 && (
            <PanicCardHistory cards={drawnCards} defectPointsLog={defectPointsLog} />
          )}
        </>
      ) : (
        <>
          <div className="text-4xl font-bold text-green-400">出荷完了！</div>
          <div className="text-2xl text-white">
            +{result.profit}点 獲得
          </div>
          {responseCardsGained > 0 && (
            <div className="text-sm text-green-300">
              対応カードを{responseCardsGained}枚入手しました
            </div>
          )}
        </>
      )}

      <div className="text-gray-300 mt-4">
        累計スコア: <span className="text-xl font-bold text-white">{totalScore}</span>
        <span className="text-gray-500">/{targetScore}</span>
      </div>

      <div className="text-sm text-gray-500">
        {result.cardsDrawn}枚出荷しました
      </div>

      <button
        onClick={onNext}
        className="mt-4 px-8 py-3 bg-amber-600 hover:bg-amber-500 text-white font-bold rounded-lg text-lg cursor-pointer transition-all"
      >
        次のラウンドへ
      </button>
    </div>
  );
}
