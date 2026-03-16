import { useMemo, useState } from 'react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import type { Item, Recipe } from '../../types/game.types';
import type { CalculationNode } from '../../types/calculation.types';

// ── Constants ────────────────────────────────────────────────────────────────

const categoryEmoji: Record<string, string> = {
  ore: '⛏️', fluid: '💧', ingot: '🔩', standard_part: '🔧', electronic: '⚡',
  industrial: '⚙️', communication: '💻', petroleum: '🧴', fuel: '🔥',
  mineral: '🪨', advanced: '🧪', nuclear: '☢️', space_elevator: '🚀',
  equipment: '🛡️', special: '✨',
};

const categoryOrder = [
  'mineral', 'standard_part', 'electronic', 'industrial', 'communication',
  'petroleum', 'fuel', 'advanced', 'nuclear', 'space_elevator',
  'equipment', 'fluid', 'special',
];

const categoryLabelJa: Record<string, string> = {
  mineral: '鉱物', standard_part: '標準パーツ', electronic: '電子部品',
  industrial: '工業部品', communication: '通信機器', petroleum: '石油製品',
  fuel: '燃料', advanced: '高度精製品', nuclear: '核材料',
  space_elevator: '宇宙エレベーター', equipment: '装備', fluid: '液体', special: 'その他',
};

// ── Types ────────────────────────────────────────────────────────────────────

interface ItemEntry {
  itemId: string;
  machineId: string | undefined;
}

interface IngotGroup {
  /** Sorted ingot item IDs (unique combination key) */
  ingotIds: string[];
  items: ItemEntry[];
}

// ── Algorithm ────────────────────────────────────────────────────────────────
//
// For each item in the calculation tree:
//   1. Trace its dependency chain, stopping at ingots (category='ingot').
//   2. If ANY dependency path reaches a non-ingot raw resource → exclude.
//   3. Otherwise, the item belongs to the group keyed by its ingot combination.
//
// Items that need e.g. Iron Ingot + Copper Ingot appear under the
// "Iron + Copper" combined group, not in either single-ingot group.

function buildIngotGroups(
  roots: CalculationNode[],
  items: Record<string, Item>,
  recipes: Record<string, Recipe>,
): IngotGroup[] {
  if (roots.length === 0) return [];

  // Step 1: flatten tree → nodeMap (first occurrence wins for dedup)
  const nodeMap = new Map<string, CalculationNode>();
  function collectNodes(nodes: CalculationNode[]) {
    nodes.forEach(n => {
      if (!nodeMap.has(n.itemId)) nodeMap.set(n.itemId, n);
      collectNodes(n.children);
    });
  }
  collectNodes(roots);

  // Step 2: for each item, find which ingots it transitively depends on.
  //         hasNonIngotBase = true when a path leads to a raw resource that
  //         is NOT an ingot (ore, fluid, etc.).
  type DepResult = { ingots: Set<string>; hasNonIngotBase: boolean };
  const cache = new Map<string, DepResult>();

  function getIngotDeps(itemId: string, visiting: Set<string>): DepResult {
    if (cache.has(itemId)) return cache.get(itemId)!;
    if (visiting.has(itemId)) return { ingots: new Set(), hasNonIngotBase: false };

    const item = items[itemId];
    if (!item) return { ingots: new Set(), hasNonIngotBase: false };

    // An ingot is the "base" for this grouping — stop here
    if (item.category === 'ingot') {
      const r: DepResult = { ingots: new Set([itemId]), hasNonIngotBase: false };
      cache.set(itemId, r);
      return r;
    }

    // A raw resource that is NOT an ingot (ore, fluid, …) → disqualifying
    const node = nodeMap.get(itemId);
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

  // Step 3: group items by their ingot combination
  const groupMap = new Map<string, IngotGroup>();

  nodeMap.forEach((node, itemId) => {
    const item = items[itemId];
    if (!item) return;
    if (item.category === 'ingot') return;   // ingots are group headers
    if (node.isRawResource) return;           // skip raw resources

    const { ingots, hasNonIngotBase } = cache.get(itemId)!;
    if (hasNonIngotBase) return;             // needs non-ingot raw material → skip
    if (ingots.size === 0) return;           // no ingot dependency → skip

    const key = [...ingots].sort().join(',');
    if (!groupMap.has(key)) {
      groupMap.set(key, { ingotIds: [...ingots].sort(), items: [] });
    }
    const recipe = node.recipeId ? recipes[node.recipeId] : undefined;
    groupMap.get(key)!.items.push({ itemId, machineId: recipe?.machineId });
  });

  // Step 4: sort groups (fewer ingots first; tie-break by first ingot id)
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.ingotIds.length !== b.ingotIds.length) return a.ingotIds.length - b.ingotIds.length;
    return a.ingotIds[0].localeCompare(b.ingotIds[0]);
  });

  // Sort items within each group by category order, then tier
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

// ── Component ────────────────────────────────────────────────────────────────

interface Props {
  roots: CalculationNode[];
}

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

  const toggleCollapse = (key: string) => {
    setCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const getName = (item: Item) => language === 'ja' ? item.nameJa : item.name;

  // ── Empty state ──────────────────────────────────────────────────────────
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
          計算結果のアイテムをインゴットの組み合わせ別に表示します
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
        インゴットのみで作成できるアイテムが見つかりませんでした
      </div>
    );
  }

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
        gap: '12px',
        alignItems: 'start',
      }}>
        {groups.map(group => {
          const key = group.ingotIds.join(',');
          const isCollapsed = collapsed.has(key);

          // Build the card title from ingot names
          const ingotLabel = group.ingotIds.map(id => {
            const ingot = items[id];
            return ingot ? getName(ingot) : id;
          }).join(' + ');

          // Sub-group items by category for display
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
            <div
              key={key}
              style={{
                background: '#0f3460',
                border: '1px solid #1a3a6a',
                borderRadius: '10px',
                overflow: 'hidden',
              }}
            >
              {/* ── Card header ── */}
              <button
                onClick={() => toggleCollapse(key)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'flex-start',
                  gap: '10px', padding: '12px 16px',
                  background: 'transparent', border: 'none', cursor: 'pointer',
                  borderBottom: isCollapsed ? 'none' : '1px solid rgba(255,255,255,0.08)',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontSize: '18px', flexShrink: 0, marginTop: '1px' }}>🔩</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#f5a623', fontWeight: 700, fontSize: '13px', lineHeight: '1.4' }}>
                    {ingotLabel}
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '11px', marginTop: '2px' }}>
                    {group.items.length} アイテム
                  </div>
                </div>
                <span style={{ color: '#a0a0b0', fontSize: '11px', flexShrink: 0, marginTop: '2px' }}>
                  {isCollapsed ? '▶' : '▼'}
                </span>
              </button>

              {/* ── Card body ── */}
              {!isCollapsed && (
                <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {sortedCats.map(cat => {
                    const catItems = byCategory.get(cat) ?? [];
                    const catEmoji = categoryEmoji[cat] ?? '📦';
                    const catLabel = language === 'ja'
                      ? (categoryLabelJa[cat] ?? cat)
                      : cat.replace(/_/g, ' ');

                    return (
                      <div key={cat}>
                        {/* Category heading */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          color: '#808090', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.7px',
                          marginBottom: '5px',
                        }}>
                          <span>{catEmoji}</span>
                          <span>{catLabel}</span>
                        </div>
                        {/* Item rows */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                          {catItems.map(entry => {
                            const item = items[entry.itemId];
                            const machine = entry.machineId ? machines[entry.machineId] : undefined;
                            if (!item) return null;
                            const machineName = machine
                              ? (language === 'ja' ? machine.nameJa : machine.name)
                              : '';
                            return (
                              <div
                                key={entry.itemId}
                                style={{
                                  display: 'flex', alignItems: 'center',
                                  justifyContent: 'space-between',
                                  padding: '3px 8px', borderRadius: '4px',
                                  background: 'rgba(255,255,255,0.04)',
                                }}
                              >
                                <span style={{ color: '#e0e0e0', fontSize: '12px' }}>
                                  {getName(item)}
                                </span>
                                {machineName && (
                                  <span style={{
                                    color: '#808090', fontSize: '10px', flexShrink: 0,
                                    background: 'rgba(255,255,255,0.06)',
                                    padding: '1px 6px', borderRadius: '3px',
                                    marginLeft: '8px',
                                  }}>
                                    {machineName}
                                  </span>
                                )}
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
