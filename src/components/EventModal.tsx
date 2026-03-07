import type { EventCard, DefectCard, GameState } from '../game/types';

type Props = {
  event: EventCard;
  state: GameState;
  onDismiss: () => void;
  glowing?: boolean;
};

const eventIcons: Record<string, string> = {
  sns_fire: '🔥',
  deadline_pressure: '⏰',
  veteran_retire: '👴',
  kaizen: '💡',
  iso_audit: '📋',
  sampling_inspection: '🔍',
};

const eventColors: Record<string, string> = {
  sns_fire: 'border-orange-500 bg-orange-900/40',
  deadline_pressure: 'border-yellow-500 bg-yellow-900/40',
  veteran_retire: 'border-red-500 bg-red-900/40',
  kaizen: 'border-green-500 bg-green-900/40',
  iso_audit: 'border-blue-500 bg-blue-900/40',
  sampling_inspection: 'border-teal-500 bg-teal-900/40',
};

function getEffectDescription(event: EventCard, state: GameState): string {
  switch (event.eventType) {
    case 'sns_fire':
      return '次に出荷する不具合カードのPtが2倍になります！';
    case 'deadline_pressure':
      return 'あと最低2枚は出荷しないといけません！';
    case 'veteran_retire':
      return `パニック閾値が3→2に低下！（このラウンドのみ）${
        state.currentDefectPoints >= 2 ? '\n現在の不具合Ptが閾値以上のため、パニック発生！' : ''
      }`;
    case 'kaizen': {
      // エンジンが既にPt減算済みなので、drawnCardsから直近不具合を見て判定
      const drawnDefects = state.drawnCardsThisRound.filter(
        (c): c is DefectCard => c.type === 'defect'
      );
      if (drawnDefects.length > 0) {
        const last = drawnDefects[drawnDefects.length - 1];
        return `直近の不具合「${last.name}」(${last.defectPoints}Pt)が無効化されました！`;
      }
      return '現在不具合がないため、効果なし';
    }
    case 'iso_audit':
      return state.currentDefectPoints === 0
        ? 'ボーナス3点獲得！不具合ゼロの品質管理が評価されました！'
        : '不具合が検出されており、ボーナスなし';
    case 'sampling_inspection':
      return '次ラウンド開始時、山札から3枚を抜き取り検査。1枚を選んで確保できます';
    default:
      return event.description;
  }
}

export function EventModal({ event, state, onDismiss, glowing }: Props) {
  const icon = eventIcons[event.eventType] ?? '⚡';
  const colorClass = eventColors[event.eventType] ?? 'border-purple-500 bg-purple-900/40';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50">
      <div className={`border-2 rounded-t-xl sm:rounded-xl p-4 sm:p-6 max-w-md w-full sm:mx-4 shadow-2xl ${colorClass} ${glowing ? 'event-glow' : ''}`}>
        <div className="text-center">
          <div className="text-4xl sm:text-5xl mb-2 sm:mb-3">{icon}</div>
          <div className="text-lg sm:text-xl font-bold text-white mb-2">{event.name}</div>
          <div className="text-sm sm:text-base text-gray-300 whitespace-pre-line mb-4 sm:mb-6">
            {getEffectDescription(event, state)}
          </div>
        </div>

        <button
          onClick={onDismiss}
          className="w-full px-4 py-3 min-h-[44px] bg-purple-700 hover:bg-purple-600 border border-purple-500
            rounded-lg text-white font-bold transition-all cursor-pointer"
        >
          了解
        </button>
      </div>
    </div>
  );
}
