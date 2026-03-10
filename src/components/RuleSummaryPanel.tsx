import { useState } from 'react';
import type { DefectCard } from '../game/types';

type ContaminationInfo = {
  total: number;
  yellow: number;
  red: number;
  black: number;
  nextSeverity: string | null;
};

type ActiveEffect = {
  icon: string;
  text: string;
  color: string;
};

type Props = {
  contaminationStock: ContaminationInfo;
  responseStockCount: number;
  responseDiscardCount: number;
  activeEffects: ActiveEffect[];
};

function countBySeverity(stocks: DefectCard[]): ContaminationInfo {
  let yellow = 0, red = 0, black = 0;
  for (const c of stocks) {
    if (c.severity === 'yellow') yellow++;
    else if (c.severity === 'red') red++;
    else if (c.severity === 'black') black++;
  }
  const next = stocks.length > 0 ? stocks[0].severity : null;
  const severityLabel: Record<string, string> = { yellow: '黄', red: '赤', black: '黒' };
  return {
    total: stocks.length,
    yellow,
    red,
    black,
    nextSeverity: next ? severityLabel[next] ?? null : null,
  };
}

function countBySeverityIds(ids: string[], cardMaster: Record<string, unknown>): ContaminationInfo {
  let yellow = 0, red = 0, black = 0;
  let firstSeverity: string | null = null;
  for (const id of ids) {
    const c = cardMaster[id] as DefectCard | undefined;
    if (!c) continue;
    if (!firstSeverity) firstSeverity = c.severity;
    if (c.severity === 'yellow') yellow++;
    else if (c.severity === 'red') red++;
    else if (c.severity === 'black') black++;
  }
  const severityLabel: Record<string, string> = { yellow: '黄', red: '赤', black: '黒' };
  return {
    total: ids.length,
    yellow,
    red,
    black,
    nextSeverity: firstSeverity ? severityLabel[firstSeverity] ?? null : null,
  };
}

// ソロ用ヘルパー
export function buildSoloProps(state: {
  contaminationStock: DefectCard[];
  responseStock: unknown[];
  responseDiscard: unknown[];
  snsFireActive: boolean;
  waterInspectionActive: boolean;
  forcedDraws: number;
}): Props {
  return {
    contaminationStock: countBySeverity(state.contaminationStock),
    responseStockCount: state.responseStock.length,
    responseDiscardCount: state.responseDiscard.length,
    activeEffects: buildActiveEffects(
      state.snsFireActive,
      state.waterInspectionActive,
      state.forcedDraws,
    ),
  };
}

// マルチ用ヘルパー
export function buildMultiProps(
  gameState: {
    contaminationStock: string[];
    responseStock: string[];
    responseDiscard: string[];
    turnState: {
      snsFireActive: boolean;
      waterInspectionActive: boolean;
      forcedDraws: number;
    } | null;
  },
  cardMaster: Record<string, unknown>,
): Props {
  return {
    contaminationStock: countBySeverityIds(
      gameState.contaminationStock ?? [],
      cardMaster,
    ),
    responseStockCount: (gameState.responseStock ?? []).length,
    responseDiscardCount: (gameState.responseDiscard ?? []).length,
    activeEffects: buildActiveEffects(
      gameState.turnState?.snsFireActive ?? false,
      gameState.turnState?.waterInspectionActive ?? false,
      gameState.turnState?.forcedDraws ?? 0,
    ),
  };
}

function buildActiveEffects(
  snsFireActive: boolean,
  waterInspectionActive: boolean,
  forcedDraws: number,
): ActiveEffect[] {
  const effects: ActiveEffect[] = [];
  if (snsFireActive) {
    effects.push({ icon: '🔥', text: 'SNS炎上中 — 次の不具合Ptが2倍', color: 'text-orange-400 bg-orange-900/30 border-orange-700' });
  }
  if (waterInspectionActive) {
    effects.push({ icon: '🛡️', text: '水際検査有効 — 次の不具合も無効化', color: 'text-emerald-400 bg-emerald-900/30 border-emerald-700' });
  }
  if (forcedDraws > 0) {
    effects.push({ icon: '⏰', text: `強制出荷 — あと${forcedDraws}枚出荷必須`, color: 'text-yellow-400 bg-yellow-900/30 border-yellow-700' });
  }
  return effects;
}

// パネル内容（共通）
function PanelContent({ contaminationStock, responseStockCount, responseDiscardCount, activeEffects }: Props) {
  return (
    <div className="space-y-0">
      {/* セクション1: 対応カード取得条件 */}
      <Section title="対応カード取得条件">
        <table className="w-full text-xs">
          <tbody>
            <Row label="利益 0~2点" value="2枚" />
            <Row label="利益 3~5点" value="1枚" />
            <Row label="利益 6点~" value="なし" dim />
            <Row label="パニック時" value="なし" dim />
          </tbody>
        </table>
      </Section>

      {/* セクション2: 汚染ルール */}
      <Section title="汚染ルール">
        <div className="text-xs space-y-1.5">
          <div>
            <span className="text-gray-400">通常汚染</span>
            <span className="text-gray-500 text-[10px] ml-1">(毎ラウンド)</span>
          </div>
          <div className="pl-2 text-gray-300">前ラウンド利益 ÷ 2（切り上げ）</div>
          <div className="pl-2 text-gray-500">最大4枚/ラウンド</div>
          <div className="mt-1.5">
            <span className="text-red-400">パニック汚染</span>
            <span className="text-gray-500 text-[10px] ml-1">(発生時)</span>
          </div>
          <div className="pl-2 text-red-300">即座に+3枚（上限なし）</div>
        </div>
      </Section>

      {/* セクション3: パニック条件 */}
      <Section title="パニック条件">
        <div className="text-xs text-gray-300">
          不具合Pt <span className="text-red-400 font-bold">3以上</span> でパニック
        </div>
        <div className="text-[10px] text-gray-500 mt-0.5">
          ※ ベテラン退職時は <span className="text-red-400">2以上</span>
        </div>
      </Section>

      {/* セクション4: 汚染ストック情報（動的） */}
      <Section title="汚染ストック情報">
        <div className="text-xs space-y-1">
          <div className="text-gray-300">
            残り: <span className="text-white font-bold">{contaminationStock.total}枚</span>
          </div>
          <div className="flex gap-2 text-[10px]">
            <span className="text-yellow-400">黄(1pt): {contaminationStock.yellow}</span>
            <span className="text-red-400">赤(2pt): {contaminationStock.red}</span>
            <span className="text-gray-200">黒(3pt): {contaminationStock.black}</span>
          </div>
          {contaminationStock.nextSeverity && (
            <div className="text-[10px] text-gray-400">
              次の投入: <span className={
                contaminationStock.nextSeverity === '黄' ? 'text-yellow-400' :
                contaminationStock.nextSeverity === '赤' ? 'text-red-400' :
                'text-gray-200 font-bold'
              }>{contaminationStock.nextSeverity}</span>
            </div>
          )}
        </div>
      </Section>

      {/* セクション5: 対応カード残り（動的） */}
      <Section title="対応カード残り">
        <div className="text-xs space-y-0.5">
          <div className="text-gray-300">
            ストック: <span className="text-white font-bold">{responseStockCount}枚</span>
          </div>
          <div className="text-gray-400">
            捨て山: <span className="text-gray-300">{responseDiscardCount}枚</span>
          </div>
        </div>
      </Section>

      {/* セクション6: アクティブ効果（動的） */}
      {activeEffects.length > 0 && (
        <Section title="アクティブ効果">
          <div className="space-y-1.5">
            {activeEffects.map((e, i) => (
              <div key={i} className={`text-xs px-2 py-1.5 rounded border ${e.color}`}>
                {e.icon} {e.text}
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-gray-700/50 py-2.5 first:pt-0 last:border-b-0">
      <div className="text-[10px] font-bold text-amber-400/80 uppercase tracking-wider mb-1.5">{title}</div>
      {children}
    </div>
  );
}

function Row({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <tr>
      <td className={`py-0.5 ${dim ? 'text-gray-500' : 'text-gray-300'}`}>{label}</td>
      <td className={`py-0.5 text-right font-bold ${dim ? 'text-gray-500' : 'text-white'}`}>{value}</td>
    </tr>
  );
}

// PC用サイドパネル（md以上で表示）
export function RuleSidePanel(props: Props) {
  return (
    <aside className="hidden md:block w-[260px] flex-shrink-0 bg-gray-800/60 border-l border-gray-700 px-3 py-3 overflow-y-auto max-h-[calc(100vh-56px)]">
      <div className="text-xs font-bold text-gray-400 mb-2">ルールサマリー</div>
      <PanelContent {...props} />
    </aside>
  );
}

// スマホ用フローティングボタン＋スライドインパネル（md未満で表示）
export function RuleMobilePanel(props: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      {/* フローティングボタン */}
      <button
        onClick={() => setOpen(true)}
        className="md:hidden fixed bottom-4 right-4 z-50 w-11 h-11 rounded-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-lg shadow-lg flex items-center justify-center cursor-pointer transition-all"
        aria-label="ルールを表示"
      >
        ?
      </button>

      {/* オーバーレイ＋スライドパネル */}
      {open && (
        <div className="md:hidden fixed inset-0 z-[60]" onClick={() => setOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute right-0 top-0 bottom-0 w-[280px] bg-gray-900 border-l border-gray-700 overflow-y-auto animate-slide-in-right"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700">
              <span className="text-sm font-bold text-amber-400">ルールサマリー</span>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-white text-lg cursor-pointer px-1"
                aria-label="閉じる"
              >
                ✕
              </button>
            </div>
            <div className="px-3 py-2">
              <PanelContent {...props} />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
