import { useMemo, useState } from 'react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate, calcProductionStats } from '../../utils/math';
import type { Item, Recipe } from '../../types/game.types';
import type { CalculationNode } from '../../types/calculation.types';

// ── 定数 ──────────────────────────────────────────────────────────────────────

/** カテゴリ → 絵文字のマッピング */
const categoryEmoji: Record<string, string> = {
  ore: '⛏️', fluid: '💧', ingot: '🔩', standard_part: '🔧', electronic: '⚡',
  industrial: '⚙️', communication: '💻', petroleum: '🧴', fuel: '🔥',
  mineral: '🪨', advanced: '🧪', nuclear: '☢️', space_elevator: '🚀',
  equipment: '🛡️', special: '✨',
};

/** グループ内アイテムのカテゴリ表示順 */
const categoryOrder = [
  'mineral', 'standard_part', 'electronic', 'industrial', 'communication',
  'petroleum', 'fuel', 'advanced', 'nuclear', 'space_elevator',
  'equipment', 'fluid', 'special',
];

/** カテゴリ → 日本語ラベルのマッピング */
const categoryLabelJa: Record<string, string> = {
  mineral: '鉱物', standard_part: '標準パーツ', electronic: '電子部品',
  industrial: '工業部品', communication: '通信機器', petroleum: '石油製品',
  fuel: '燃料', advanced: '高度精製品', nuclear: '核材料',
  space_elevator: '宇宙エレベーター', equipment: '装備', fluid: '液体', special: 'その他',
};

// ── 型定義 ────────────────────────────────────────────────────────────────────

/** グループ内の各アイテムエントリ */
interface ItemEntry {
  itemId: string;
  machineId: string | undefined;
  machineCount: number;
  machineCountExact: number;
  requiredPerMinute: number;
}

/** インゴット（または raw 流体）の組み合わせ別グループ */
interface IngotGroup {
  /** ソート済みのベースリソース ID 一覧（インゴット + raw 流体、グループキー） */
  baseIds: string[];
  items: ItemEntry[];
}

// ── アルゴリズム ──────────────────────────────────────────────────────────────
//
// 計算ツリーの各アイテムに対して:
//   1. 依存チェーンを辿り、インゴット（category='ingot'）または
//      raw 流体（category='fluid' かつ isRawResource=true）で停止する。
//   2. どこかの依存パスがインゴットでも raw 流体でもない raw リソース
//      （鉱石・鉱物など）に到達した場合 → そのアイテムを除外する。
//   3. それ以外は、ベースの組み合わせをキーとするグループに属する。
//
// 例: 鉄インゴット + 水 を必要とするアイテムは「鉄インゴット + 水」グループに表示される。

/**
 * 計算ツリーからインゴット・raw 流体ベース別のグループを構築する。
 *
 * @param roots - 計算ツリーのルートノード配列
 * @param items - アイテム辞書
 * @param recipes - レシピ辞書
 * @returns インゴット組み合わせ別にグループ化されたアイテム配列
 */
function buildIngotGroups(
  roots: CalculationNode[],
  items: Record<string, Item>,
  recipes: Record<string, Recipe>,
): IngotGroup[] {
  if (roots.length === 0) return [];

  // Step 1: ツリーをフラット化して nodeMap を構築（重複時は最初の出現を優先）
  const nodeMap = new Map<string, CalculationNode>();
  function collectNodes(nodes: CalculationNode[]) {
    nodes.forEach(n => {
      if (!nodeMap.has(n.itemId)) nodeMap.set(n.itemId, n);
      collectNodes(n.children);
    });
  }
  collectNodes(roots);

  // Step 2: 各アイテムが推移的に依存するベースリソース（インゴット + raw 流体）を求める。
  //         hasNonIngotBase = true の場合、インゴットでも raw 流体でもない
  //         raw リソース（鉱石など）に到達したことを示す。
  type DepResult = { ingots: Set<string>; hasNonIngotBase: boolean };
  const cache = new Map<string, DepResult>();

  function getIngotDeps(itemId: string, visiting: Set<string>): DepResult {
    if (cache.has(itemId)) return cache.get(itemId)!;
    if (visiting.has(itemId)) return { ingots: new Set(), hasNonIngotBase: false };

    const item = items[itemId];
    if (!item) return { ingots: new Set(), hasNonIngotBase: false };

    // インゴットはこのグループ分けの「ベース」— ここで再帰を停止する
    if (item.category === 'ingot') {
      const r: DepResult = { ingots: new Set([itemId]), hasNonIngotBase: false };
      cache.set(itemId, r);
      return r;
    }

    const node = nodeMap.get(itemId);

    // raw 流体（水・原油・窒素ガスなど）も「ベース」— ここで再帰を停止する
    if (item.category === 'fluid' && (!node || node.isRawResource)) {
      const r: DepResult = { ingots: new Set([itemId]), hasNonIngotBase: false };
      cache.set(itemId, r);
      return r;
    }

    // インゴットでも raw 流体でもない raw リソース（鉱石・鉱物）は除外対象
    if (!node || node.isRawResource) {
      const r: DepResult = { ingots: new Set(), hasNonIngotBase: true };
      cache.set(itemId, r);
      return r;
    }

    const next = new Set([...visiting, itemId]);
    const ingots = new Set<string>();
    let hasNonIngotBase = false;

    node.children.forEach(child => {
      const cr = getIngotDeps(child.itemId, next);
      cr.ingots.forEach(i => ingots.add(i));
      if (cr.hasNonIngotBase) hasNonIngotBase = true;
    });

    const r: DepResult = { ingots, hasNonIngotBase };
    cache.set(itemId, r);
    return r;
  }

  nodeMap.forEach((_, id) => getIngotDeps(id, new Set()));

  // Step 3: アイテムをインゴットの組み合わせ別にグループ化する
  const groupMap = new Map<string, IngotGroup>();

  nodeMap.forEach((node, itemId) => {
    const item = items[itemId];
    if (!item) return;
    if (item.category === 'ingot') return;   // インゴット自体はグループヘッダーとして扱う
    if (node.isRawResource) return;           // raw リソースはスキップ

    const { ingots, hasNonIngotBase } = cache.get(itemId)!;
    if (hasNonIngotBase) return;             // ベース以外の raw 素材が必要 → スキップ
    if (ingots.size === 0) return;           // ベース依存なし → スキップ

    const key = [...ingots].sort().join(',');
    if (!groupMap.has(key)) {
      groupMap.set(key, { baseIds: [...ingots].sort(), items: [] });
    }
    const recipe = node.recipeId ? recipes[node.recipeId] : undefined;
    groupMap.get(key)!.items.push({
      itemId,
      machineId: recipe?.machineId,
      machineCount: node.machineCount,
      machineCountExact: node.machineCountExact,
      requiredPerMinute: node.requiredPerMinute,
    });
  });

  // Step 4: ベース数が少ない順でグループをソート（同数の場合は先頭ベース ID で比較）
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.baseIds.length !== b.baseIds.length) return a.baseIds.length - b.baseIds.length;
    return a.baseIds[0].localeCompare(b.baseIds[0]);
  });

  // グループ内のアイテムをカテゴリ順 → ティア順でソート
  groups.forEach(g => {
    g.items.sort((a, b) => {
      const ia = items[a.itemId];
      const ib = items[b.itemId];
      const ca = categoryOrder.indexOf(ia?.category ?? '');
      const cb = categoryOrder.indexOf(ib?.category ?? '');
      const ra = ca === -1 ? 999 : ca;
      const rb = cb === -1 ? 999 : cb;
      if (ra !== rb) return ra - rb;
      return (ia?.tier ?? 0) - (ib?.tier ?? 0);
    });
  });

  return groups;
}

// ── コンポーネント ────────────────────────────────────────────────────────────

/** OreGroupPanel のプロパティ */
interface Props {
  /** 計算ツリーのルートノード配列 */
  roots: CalculationNode[];
}

/**
 * 計算結果をインゴット・液体原材料の組み合わせ別に表示するパネル。
 *
 * 各グループをアコーディオン形式で折りたたみ可能に表示し、
 * アイテムごとに設置台数・必要量・生産量・余剰量を表示する。
 */
export default function OreGroupPanel({ roots }: Props) {
  const items    = useGameDataStore(s => s.items);
  const recipes  = useGameDataStore(s => s.recipes);
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const [collapsed, setCollapsed] = useState<Set<string>>(new Set());

  const groups = useMemo(
    () => buildIngotGroups(roots, items, recipes),
    [roots, items, recipes],
  );

  /** アコーディオンの開閉をトグルする */
  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  /** 言語設定に応じてアイテム名を返す */
  const getName = (item: Item) => language === 'ja' ? item.nameJa : item.name;

  // ── 空状態 ────────────────────────────────────────────────────────────────
  if (roots.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        color: '#a0a0b0', gap: '12px', padding: '32px',
      }}>
        <div style={{ fontSize: '40px' }}>🔩</div>
        <div style={{ fontSize: '15px', color: '#e0e0e0' }}>生産目標を設定して計算を実行</div>
        <div style={{ fontSize: '12px', textAlign: 'center' }}>
          計算結果のアイテムをインゴット・液体原材料の組み合わせ別に表示します
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#a0a0b0', fontSize: '13px',
      }}>
        インゴット・液体原材料から作成できるアイテムが見つかりませんでした
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '12px 16px' }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
        {groups.map(group => {
          const key = group.baseIds.join(',');
          const isOpen = !collapsed.has(key);

          const hasIngot = group.baseIds.some(id => items[id]?.category === 'ingot');
          const hasFluid = group.baseIds.some(id => items[id]?.category === 'fluid');
          const accentColor = hasIngot && hasFluid ? '#9b6fe0' : hasFluid ? '#4da6e0' : '#f5a623';
          const groupIcon  = hasIngot && hasFluid ? '🔩' : hasFluid ? '💧' : '🔩';
          const groupLabel = group.baseIds.map(id => {
            const base = items[id];
            return base ? getName(base) : id;
          }).join(' + ');

          // カテゴリ別にアイテムをサブグループ化する
          const byCategory = new Map<string, ItemEntry[]>();
          group.items.forEach(entry => {
            const item = items[entry.itemId];
            if (!item) return;
            if (!byCategory.has(item.category)) byCategory.set(item.category, []);
            byCategory.get(item.category)!.push(entry);
          });
          const sortedCats = [
            ...categoryOrder.filter(c => byCategory.has(c)),
            ...[...byCategory.keys()].filter(c => !categoryOrder.includes(c)),
          ];

          return (
            <div key={key} style={{ borderRadius: '6px', overflow: 'hidden' }}>
              {/* ── アコーディオンヘッダー ── */}
              <button
                onClick={() => toggleCollapse(key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                  padding: '9px 14px',
                  background: isOpen ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.04)',
                  border: 'none', cursor: 'pointer', textAlign: 'left',
                  borderLeft: `3px solid ${accentColor}`,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ fontSize: '15px', flexShrink: 0 }}>{groupIcon}</span>
                <span style={{ flex: 1, color: accentColor, fontWeight: 700, fontSize: '13px' }}>
                  {groupLabel}
                </span>
                <span style={{
                  color: '#808090', fontSize: '10px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.06)',
                  padding: '1px 7px', borderRadius: '10px', marginRight: '6px',
                }}>
                  {group.items.length}
                </span>
                <span style={{ color: '#606070', fontSize: '10px', flexShrink: 0 }}>
                  {isOpen ? '▼' : '▶'}
                </span>
              </button>

              {/* ── アコーディオンボディ ── */}
              {isOpen && (
                <div style={{
                  borderLeft: `3px solid ${accentColor}`,
                  background: 'rgba(255,255,255,0.02)',
                  padding: '10px 14px 12px 14px',
                  display: 'flex', flexDirection: 'column', gap: '10px',
                }}>
                  {sortedCats.map(cat => {
                    const catItems = byCategory.get(cat) ?? [];
                    const catEmoji = categoryEmoji[cat] ?? '📦';
                    const catLabel = language === 'ja'
                      ? (categoryLabelJa[cat] ?? cat)
                      : cat.replace(/_/g, ' ');

                    return (
                      <div key={cat}>
                        {/* カテゴリ見出し */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          color: '#606070', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.7px',
                          marginBottom: '5px',
                        }}>
                          <span>{catEmoji}</span>
                          <span>{catLabel}</span>
                        </div>
                        {/* アイテムカード */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                          {catItems.map(entry => {
                            const item = items[entry.itemId];
                            const machine = entry.machineId ? machines[entry.machineId] : undefined;
                            if (!item) return null;
                            const machineName = machine
                              ? (language === 'ja' ? machine.nameJa : machine.name)
                              : '';

                            // 生産量/分・余剰量/分（calcProductionStats に委譲）
                            // totalPerMinute = requiredPerMinute（単一ノード基準）
                            const { productionPerMin: calcProd, surplusPerMin: calcSurplus } =
                              calcProductionStats(entry.requiredPerMinute, entry.machineCountExact, entry.requiredPerMinute, false);
                            const productionPerMin = calcProd ?? entry.requiredPerMinute;
                            const surplusPerMin    = calcSurplus ?? 0;

                            return (
                              <div
                                key={entry.itemId}
                                style={{
                                  display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '6px',
                                  padding: '6px 10px', borderRadius: '6px',
                                  background: 'rgba(255,255,255,0.05)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}
                              >
                                {/* アイテム名 */}
                                <span style={{ color: '#e0e0e0', fontSize: '12px', fontWeight: 600, minWidth: '120px' }}>
                                  {getName(item)}
                                </span>

                                {/* マシン名 */}
                                {machineName && (
                                  <span style={{ color: '#808090', fontSize: '11px' }}>
                                    {machineName}
                                  </span>
                                )}

                                <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto', alignItems: 'center', flexWrap: 'wrap' }}>
                                  {/* 設置台数 */}
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#f5a623', fontWeight: 700, fontSize: '13px' }}>
                                      {entry.machineCount}
                                    </div>
                                    <div style={{ color: '#606070', fontSize: '9px' }}>設置台数</div>
                                  </div>

                                  <div style={{ width: '1px', height: '28px', background: 'rgba(255,255,255,0.1)' }} />

                                  {/* 必要量 */}
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#64b5f6', fontWeight: 700, fontSize: '13px' }}>
                                      {formatRate(entry.requiredPerMinute)}
                                    </div>
                                    <div style={{ color: '#606070', fontSize: '9px' }}>必要量/分</div>
                                  </div>

                                  {/* 生産量 */}
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{ color: '#ce93d8', fontWeight: 700, fontSize: '13px' }}>
                                      {formatRate(productionPerMin)}
                                    </div>
                                    <div style={{ color: '#606070', fontSize: '9px' }}>生産量/分</div>
                                  </div>

                                  {/* 余剰量 */}
                                  <div style={{ textAlign: 'center' }}>
                                    <div style={{
                                      fontWeight: 700, fontSize: '13px',
                                      color: surplusPerMin > 0.001 ? '#4caf50' : '#a0a0b0',
                                    }}>
                                      {surplusPerMin > 0.001 ? '+' : ''}{formatRate(surplusPerMin)}
                                    </div>
                                    <div style={{ color: '#606070', fontSize: '9px' }}>余剰量/分</div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
