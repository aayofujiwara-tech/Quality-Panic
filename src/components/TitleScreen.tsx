import { useState } from 'react';
import { DIFFICULTIES } from '../game/constants';
import type { Difficulty } from '../game/types';

export type GameMode = 'solo' | 'create_room' | 'join_room';

type Props = {
  onStart: (difficulty: Difficulty) => void;
  onMultiplayer?: (mode: 'create_room' | 'join_room') => void;
};

export function TitleScreen({ onStart, onMultiplayer }: Props) {
  const [screen, setScreen] = useState<'top' | 'solo_difficulty'>('top');
  const [showRules, setShowRules] = useState(false);

  if (screen === 'solo_difficulty') {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-6 sm:gap-8 px-4">
        <div className="text-center">
          <h1 className="text-3xl sm:text-5xl font-bold text-amber-400 mb-2">品証パニック</h1>
          <p className="text-gray-400 text-base sm:text-lg">ソロモード</p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-[280px]">
          <div className="text-sm text-gray-400 text-center mb-1">難易度を選択</div>
          {DIFFICULTIES.map((d) => (
            <button
              key={d.name}
              onClick={() => onStart(d)}
              className="px-6 py-3 min-h-[44px] bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-lg text-white font-medium transition-all cursor-pointer"
            >
              {d.name}
              <span className="text-gray-400 ml-2 text-sm">（目標{d.targetScore}点）</span>
            </button>
          ))}
          <button
            onClick={() => setScreen('top')}
            className="mt-2 px-6 py-2 min-h-[44px] text-gray-400 hover:text-white transition-colors cursor-pointer"
          >
            戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen gap-6 sm:gap-8 px-4">
      <div className="text-center">
        <h1 className="text-3xl sm:text-5xl font-bold text-amber-400 mb-2">品証パニック</h1>
        <p className="text-gray-400 text-base sm:text-lg">Quality Panic</p>
      </div>

      <p className="text-gray-500 text-xs sm:text-sm max-w-md text-center px-2">
        製品を出荷して利益を稼げ！ただし出荷するほど市場の不具合は増えていく。
        利益か出荷停止か——品質保証部としての判断が試される。
      </p>

      <div className="flex flex-col gap-3 w-full max-w-[280px]">
        <button
          onClick={() => setScreen('solo_difficulty')}
          className="px-6 py-4 min-h-[44px] bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-amber-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ソロプレイ
          <span className="block text-gray-400 text-xs mt-1">1人で目標スコアに挑戦</span>
        </button>

        <div className="text-sm text-gray-500 text-center my-1">── 2人対戦 ──</div>

        <button
          onClick={() => onMultiplayer?.('create_room')}
          className="px-6 py-4 min-h-[44px] bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ルームを作る
          <span className="block text-gray-400 text-xs mt-1">ルームコードを発行して対戦相手を待つ</span>
        </button>

        <button
          onClick={() => onMultiplayer?.('join_room')}
          className="px-6 py-4 min-h-[44px] bg-gray-800 hover:bg-gray-700 border border-gray-600 hover:border-blue-500 rounded-lg text-white font-medium transition-all cursor-pointer"
        >
          ルームに入る
          <span className="block text-gray-400 text-xs mt-1">ルームコードを入力して参加</span>
        </button>

        <button
          onClick={() => setShowRules(true)}
          className="mt-2 px-6 py-3 min-h-[44px] bg-gray-800/50 hover:bg-gray-700 border border-gray-700 hover:border-gray-500 rounded-lg text-gray-300 hover:text-white font-medium transition-all cursor-pointer"
        >
          遊び方
        </button>
      </div>

      {showRules && <RulesModal onClose={() => setShowRules(false)} />}
    </div>
  );
}

// ===== ルール説明モーダル =====

function RulesModal({ onClose }: { onClose: () => void }) {
  const closeButton = (
    <button
      onClick={onClose}
      className="px-6 py-3 min-h-[44px] bg-gray-700 hover:bg-gray-600 rounded-lg text-white font-bold transition-all cursor-pointer"
    >
      閉じる
    </button>
  );

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-6">
      <div className="bg-gray-900 border border-gray-700 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl">
        {/* ヘッダー */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-gray-700 shrink-0">
          <h2 className="text-lg sm:text-xl font-bold text-amber-400">遊び方</h2>
          {closeButton}
        </div>

        {/* スクロール領域 */}
        <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4 sm:py-6 space-y-5 sm:space-y-6">

          {/* ゲームの目的 */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">ゲームの目的</h3>
            <p className="text-sm sm:text-base text-gray-300 leading-relaxed">
              製品を出荷して利益を稼げ！ただし出荷するほど市場の不具合は増えていく。利益か出荷停止か——品質保証部としての判断が試される。
            </p>
          </section>

          {/* 基本ルール */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">基本ルール</h3>
            <ul className="space-y-1.5 text-sm sm:text-base text-gray-300">
              <li>・山札から製品を1枚ずつ出荷する</li>
              <li>・<span className="text-blue-400">製品カード</span>（青）を引くと利益になる：
                <ul className="ml-4 mt-1 space-y-0.5 text-blue-300">
                  <li>量産品（20枚）：+1点</li>
                  <li>高付加価値品（10枚）：+2点</li>
                  <li>大型案件（6枚）：+3点</li>
                </ul>
              </li>
              <li>・<span className="text-yellow-400">不具合</span><span className="text-red-400">カード</span>（<span className="text-yellow-400">黄</span>/<span className="text-red-400">赤</span>/<span className="text-gray-100">黒</span>）を引くと不具合ポイントが溜まる：
                <ul className="ml-4 mt-1 space-y-0.5">
                  <li><span className="text-yellow-400">軽微な不具合・黄</span>（初期6枚）：1ポイント</li>
                  <li><span className="text-red-400">重大な不具合・赤</span>（初期3枚）：2ポイント</li>
                  <li><span className="text-gray-100">リコール級・黒</span>（汚染ストックのみ、4枚）：3ポイント（<span className="text-red-400 font-bold">即パニック</span>）</li>
                </ul>
              </li>
              <li>・不具合ポイントが<span className="text-red-400 font-bold">3以上</span>になると<span className="text-red-400 font-bold">パニック発生！</span>そのラウンドの利益は全て失い、さらに山札が<span className="text-red-300">汚染+3枚</span></li>
              <li>・いつでも「出荷停止」を選んで利益を確定できる</li>
            </ul>
          </section>

          {/* 対応カード */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">対応カード<span className="text-gray-400 text-sm font-normal ml-2">（全10枚）</span></h3>
            <p className="text-sm sm:text-base text-gray-400 mb-1">
              ラウンドで利益を抑えて出荷停止すると対応カードがもらえる（0〜2点で2枚、3〜5点で1枚）
            </p>
            <p className="text-sm sm:text-base text-gray-400 mb-2">
              ゲーム開始時に1枚配られる。手札上限3枚
            </p>
            <ul className="space-y-1.5 text-sm sm:text-base text-gray-300">
              <li><span className="text-green-300">🩹 応急処置</span><span className="text-gray-500">（4枚）</span>：不具合1枚を無効化</li>
              <li><span className="text-green-300">🔍 原因調査</span><span className="text-gray-500">（3枚）</span>：無効化＋山札から不具合1枚除外</li>
              <li><span className="text-emerald-300">🛡️ 水際検査</span><span className="text-gray-500">（2枚）</span>：この不具合と次の不具合も無効化</li>
              <li><span className="text-cyan-300">⚙️ 設計変更</span><span className="text-gray-500">（1枚）</span>：汚染ストックから2枚を永久除外。使ったらゲームから消える</li>
            </ul>
            <p className="text-xs text-gray-500 mt-2">
              ※ストックが尽きたら捨て山をリサイクル（設計変更以外）
            </p>
          </section>

          {/* イベントカード */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">イベントカード<span className="text-gray-400 text-sm font-normal ml-2">（全10枚）</span></h3>
            <p className="text-sm sm:text-base text-gray-400 mb-2">
              山札に混ざっているイベントカードは出荷時に発動する：
            </p>
            <ul className="space-y-1.5 text-sm sm:text-base text-gray-300">
              <li><span className="text-orange-400">🔥 SNS炎上</span><span className="text-gray-500">（2枚）</span>：次の不具合ポイントが2倍</li>
              <li><span className="text-yellow-400">⏰ 納期プレッシャー</span><span className="text-gray-500">（2枚）</span>：あと2枚は出荷停止できない</li>
              <li><span className="text-red-400">👴 ベテラン退職</span><span className="text-gray-500">（1枚）</span>：パニック閾値が一時的に2に低下</li>
              <li><span className="text-green-400">💡 改善提案</span><span className="text-gray-500">（2枚）</span>：直前の不具合を取り消し</li>
              <li><span className="text-blue-400">📋 ISO監査</span><span className="text-gray-500">（1枚）</span>：不具合ポイント0ならボーナス3点</li>
              <li><span className="text-teal-400">🔍 抜き取り検査</span><span className="text-gray-500">（2枚）</span>：次ラウンドで山札の上3枚から1枚選べる</li>
            </ul>
          </section>

          {/* 汚染メカニクス */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-red-400 mb-2">汚染メカニクス</h3>
            <ul className="space-y-1.5 text-sm sm:text-base text-gray-300">
              <li>・毎ラウンド終了時、稼いだ利益に応じて不具合カードが山札に追加される（<span className="text-red-300">利益÷2枚、最大4枚</span>）</li>
              <li>・パニックするとさらに<span className="text-red-300">3枚追加</span>される</li>
              <li>・ゲームが進むほど山札が汚れていく。これが<span className="text-amber-400 font-bold">「品証パニック」</span>の核心！</li>
            </ul>
          </section>

          {/* ソロ / 2人対戦 */}
          <section>
            <h3 className="text-base sm:text-lg font-bold text-white mb-2">ソロ / 2人対戦</h3>
            <ul className="space-y-1.5 text-sm sm:text-base text-gray-300">
              <li>・<span className="text-amber-400">ソロ</span>：8ラウンド制。目標スコアを目指す（普通：35点）</li>
              <li>・<span className="text-blue-400">2人対戦</span>：7ラウンド制。同じ山札を交互に出荷し、スコアが高い方の勝ち。相手がパニックすると山が汚れて自分にも影響する</li>
            </ul>
          </section>

        </div>

        {/* フッター */}
        <div className="flex justify-center px-4 sm:px-6 py-3 sm:py-4 border-t border-gray-700 shrink-0">
          {closeButton}
        </div>
      </div>
    </div>
  );
}
