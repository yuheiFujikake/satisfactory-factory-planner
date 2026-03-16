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
  /** Sorted base resource IDs (ingots + raw fluids, unique combination key) */
  baseIds: string[];
  items: ItemEntry[];
}

// ── Algorithm ────────────────────────────────────────────────────────────────
//
// For each item in the calculation tree:
//   1. Trace its dependency chain, stopping at ingots (category='ingot')
//      OR raw fluid resources (category='fluid' AND isRawResource=true).
//   2. If ANY dependency path reaches a raw resource that is neither an ingot
//      nor a raw fluid (e.g. ore, mineral) → exclude.
//   3. Otherwise, the item belongs to the group keyed by its base combination.
//
// Items that need e.g. Iron Ingot + Water appear under the
// "Iron Ingot + Water" combined group.

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

  // Step 2: for each item, find which base resources (ingots + raw fluids) it
  //         transitively depends on. hasNonIngotBase = true when a path leads
  //         to a raw resource that is NOT an ingot and NOT a raw fluid (e.g. ore).
  type DepResult = { ingots: Set<string>; hasNonIngotBase: boolean };
  const cache = new Map<string, DepResult>();

  function getIngotDeps(itemId: string, visiting: Set<string>): DepResult {
    if (cache.has(itemId)) return cache.get(itemId)!;
    if (visiting.has(itemId)) return { ingots: new Set(), hasNonIngotBase: false };

    const item = items[itemId];
    if (!item) return { ingots: new Set(), hasNonIngotBase: false };

    // An ingot is a "base" for this grouping — stop here
    if (item.category === 'ingot') {
      const r: DepResult = { ingots: new Set([itemId]), hasNonIngotBase: false };
      cache.set(itemId, r);
      return r;
    }

    const node = nodeMap.get(itemId);

    // A raw fluid (water, crude oil, nitrogen gas, …) is also a "base" — stop here
    if (item.category === 'fluid' && (!node || node.isRawResource)) {
      const r: DepResult = { ingots: new Set([itemId]), hasNonIngotBase: false };
      cache.set(itemId, r);
      return r;
    }

    // A raw resource that is NOT an ingot and NOT a raw fluid (ore, mineral) → disqualifying
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
    if (hasNonIngotBase) return;             // needs non-base raw material → skip
    if (ingots.size === 0) return;           // no base dependency → skip

    const key = [...ingots].sort().join(',');
    if (!groupMap.has(key)) {
      groupMap.set(key, { baseIds: [...ingots].sort(), items: [] });
    }
    const recipe = node.recipeId ? recipes[node.recipeId] : undefined;
    groupMap.get(key)!.items.push({ itemId, machineId: recipe?.machineId });
  });

  // Step 4: sort groups (fewer bases first; tie-break by first base id)
  const groups = [...groupMap.values()].sort((a, b) => {
    if (a.baseIds.length !== b.baseIds.length) return a.baseIds.length - b.baseIds.length;
    return a.baseIds[0].localeCompare(b.baseIds[0]);
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

          // Sub-group items by category
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
              {/* ── Accordion header ── */}
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

              {/* ── Accordion body ── */}
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
                        {/* Category heading */}
                        <div style={{
                          display: 'flex', alignItems: 'center', gap: '4px',
                          color: '#606070', fontSize: '10px', fontWeight: 700,
                          textTransform: 'uppercase', letterSpacing: '0.7px',
                          marginBottom: '5px',
                        }}>
                          <span>{catEmoji}</span>
                          <span>{catLabel}</span>
                        </div>
                        {/* Item chips */}
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
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
                                  display: 'inline-flex', alignItems: 'center', gap: '5px',
                                  padding: '3px 8px', borderRadius: '4px',
                                  background: 'rgba(255,255,255,0.06)',
                                  border: '1px solid rgba(255,255,255,0.08)',
                                }}
                              >
                                <span style={{ color: '#e0e0e0', fontSize: '12px' }}>
                                  {getName(item)}
                                </span>
                                {machineName && (
                                  <span style={{
                                    color: '#606070', fontSize: '10px',
                                    borderLeft: '1px solid rgba(255,255,255,0.12)',
                                    paddingLeft: '5px',
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
