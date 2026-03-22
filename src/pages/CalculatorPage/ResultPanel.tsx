import { useState, useMemo } from 'react';
import { useCalculationStore } from '../../stores/calculationStore';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { usePlanStore } from '../../stores/planStore';
import { formatRate, calcProductionStats } from '../../utils/math';
import { useIsMobile } from '../../hooks/useIsMobile';
import { flattenTree, aggregateItems, computeItemDepths } from '../../domain/calculator';
import type { CalculationNode } from '../../types/calculation.types';
import OreGroupPanel from './OreGroupPanel';
import ProductionLineFlow from './ProductionLineFlow';

// ── 静的な定数・JSX（コンポーネント外で定義し毎レンダリングの再生成を回避） ────

/** プロダクトビューのアクセントカラー（常に固定） */
const PRODUCT_ACCENT = '#f5a623';

/** テーブルヘッダー（静的JSX） */
const tableHeader = (
  <thead>
    <tr>
      {['アイテム', '必要量/分', '建物', '必要台数', '製造量/分', '余剰量/分', 'レシピ'].map(h => (
        <th key={h} style={{
          textAlign: 'left',
          color: '#a0a0b0',
          fontWeight: 600,
          padding: '6px 10px',
          fontSize: '11px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px',
        }}>
          {h}
        </th>
      ))}
    </tr>
  </thead>
);

// ── コンポーネント ──────────────────────────────────────────────────────────────

/**
 * 計算結果を表示するパネルコンポーネント。
 *
 * テーブル・建設物・依存グラフ・製造地の 4 タブを持ち、
 * 計算結果の詳細を様々な形式で確認できる。
 * モバイルではタブバーを全幅表示する。
 */
export default function ResultPanel() {
  const result        = useCalculationStore(s => s.result);
  const isCalculating = useCalculationStore(s => s.isCalculating);
  const items         = useGameDataStore(s => s.items);
  const machines      = useGameDataStore(s => s.machines);
  const recipes       = useGameDataStore(s => s.recipes);
  const language      = useSettingsStore(s => s.language);
  const activeTab     = useUiStore(s => s.activeTab);
  const setActiveTab  = useUiStore(s => s.setActiveTab);
  const openRecipeSelector = useUiStore(s => s.openRecipeSelector);
  const currentPlanId = usePlanStore(s => s.currentPlan?.id ?? null);
  const targets       = usePlanStore(s => s.currentPlan?.targets) ?? [];
  const isMobile      = useIsMobile();

  // トータル/プロダクト切り替え（生産目標が複数のときのみトグルを表示）
  const [tableView, setTableView] = useState<'total' | 'product'>('total');
  const [productCollapsed, setProductCollapsed] = useState<Set<string>>(new Set());

  /**
   * プロダクトビューのアコーディオン折りたたみ状態をトグルする。
   * @param id - 対象プロダクトの識別子
   */
  const toggleProductCollapse = (id: string) => {
    setProductCollapsed(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // トータルビュー用: result 変更時のみ nodeMap を再構築（O(N) 先行構築 → ルックアップ O(1)）
  const totalNodeMap = useMemo(() => {
    if (!result) return new Map<string, CalculationNode>();
    const map = new Map<string, CalculationNode>();
    result.nodes.flatMap(flattenTree).forEach(n => {
      if (!map.has(n.itemId)) map.set(n.itemId, n);
    });
    return map;
  }, [result]);

  // プロダクトビュー用: result 変更時のみ各プロダクトのツリーデータを計算・キャッシュ
  const productData = useMemo(() => {
    if (!result) return [];
    return result.nodes.map(root => {
      const treeNodes = flattenTree(root);

      // itemId → 最初に出現したノード（effectiveRate 計算用）
      const nodeMap = new Map<string, CalculationNode>();
      treeNodes.forEach(n => { if (!nodeMap.has(n.itemId)) nodeMap.set(n.itemId, n); });

      // 同一アイテムが複数ブランチに出現する場合を考慮して requiredPerMinute を集計
      // 葉からの深さ（複雑なアイテムが大きい値）でソートして複雑なアイテムを上に表示
      const depthMap = new Map<string, number>();
      computeItemDepths(root, depthMap);
      const treeItems = aggregateItems(treeNodes)
        .sort((a, b) => (depthMap.get(b.itemId) ?? 0) - (depthMap.get(a.itemId) ?? 0));

      return { nodeMap, treeItems };
    });
  }, [result]);

  // ── スタイルヘルパー ──────────────────────────────────────────────────────

  /** タブバーのボタンスタイルを返す（アクティブタブはオレンジ背景） */
  const tabStyle = (tab: string) => ({
    padding: '8px 16px',
    background: activeTab === tab ? '#f5a623' : 'transparent',
    color: activeTab === tab ? '#1a1a2e' : '#a0a0b0',
    border: 'none',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: activeTab === tab ? 700 : 400,
    borderRadius: '6px',
    transition: 'all 0.2s',
  });

  /** トータル / プロダクト切り替えボタンのスタイルを返す */
  const viewToggleStyle = (active: boolean) => ({
    padding: '4px 12px',
    background: active ? '#0f3460' : 'transparent',
    color: active ? '#e0e0e0' : '#606070',
    border: `1px solid ${active ? '#1a4a8a' : '#2a2a4a'}`,
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: active ? 600 : 400,
    borderRadius: '4px',
    transition: 'all 0.15s',
  });

  // ── タブバー（常時表示 — ores タブは計算結果なしでも動作） ──────────────────

  const tabBar = (
    <div style={{
      padding: '6px 8px',
      borderBottom: '1px solid #0f3460',
      display: 'flex',
      gap: '4px',
      background: '#1a1a2e',
      flexShrink: 0,
    }}>
      {(['table', 'machines', 'line', 'ores'] as const).map((tab, i) => (
        <button
          key={tab}
          style={{ ...tabStyle(tab), flex: isMobile ? 1 : undefined, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
          onClick={() => setActiveTab(tab)}
        >
          {['📊 テーブル', '🏭 建設物', '🏗️ 製造ライン', '⛏️ 製造地'][i]}
        </button>
      ))}
    </div>
  );

  // ── 早期リターン ──────────────────────────────────────────────────────────

  if (activeTab === 'ores') {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tabBar}
        <OreGroupPanel roots={result?.nodes ?? []} />
      </div>
    );
  }

  if (isCalculating) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tabBar}
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#f5a623', fontSize: '16px' }}>
          ⚙️ 計算中...
        </div>
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        {tabBar}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#a0a0b0', gap: '16px' }}>
          <div style={{ fontSize: '48px' }}>⚙️</div>
          <div style={{ fontSize: '16px', color: '#e0e0e0' }}>生産目標を追加して計算を実行</div>
          <div style={{ fontSize: '13px' }}>
            {isMobile ? '「目標設定」タブでアイテムと量を設定してください' : '左パネルでアイテムと量を設定してください'}
          </div>
        </div>
      </div>
    );
  }

  // ── 行レンダラ（トータル・プロダクト両ビューで共用） ─────────────────────────

  /**
   * テーブルの 1 行を描画する。トータルビューとプロダクトビューの両方で使用する。
   * @param node - 計算ノード（マシーン台数・必要量などを保持）
   * @param fi - アイテム識別子と合計必要量
   * @param key - React のリストキー
   */
  const renderItemRow = (
    node: CalculationNode,
    fi: { itemId: string; totalPerMinute: number },
    key: string,
  ) => {
    const item = items[fi.itemId];
    const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : fi.itemId;
    const recipe = node.recipeId ? recipes[node.recipeId] : undefined;
    const machine = recipe ? machines[recipe.machineId] : undefined;
    const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : '';
    const isRaw = node.isRawResource ?? !recipe;

    const { neededMachines, productionPerMin, surplusPerMin } = calcProductionStats(
      node.requiredPerMinute,
      node.machineCountExact,
      fi.totalPerMinute,
      isRaw,
    );

    return (
      <tr key={key} style={{ background: isRaw ? '#1a3a1a' : '#0f3460', borderRadius: '6px' }}>
        <td style={{ padding: '8px 10px', borderRadius: '6px 0 0 6px', fontWeight: 600, color: isRaw ? '#4caf50' : '#e0e0e0' }}>
          {itemName}
          {isRaw && <span style={{ fontSize: '10px', color: '#4caf50', marginLeft: '6px' }}>raw</span>}
        </td>
        <td style={{ padding: '8px 10px' }}>
          <span style={{ color: '#f5a623', fontWeight: 700 }}>{formatRate(fi.totalPerMinute)}</span>
        </td>
        <td style={{ padding: '8px 10px', color: '#a0a0b0' }}>
          {machineName}
        </td>
        <td style={{ padding: '8px 10px', color: '#e0e0e0', fontWeight: 600 }}>
          {neededMachines ?? '-'}
        </td>
        <td style={{ padding: '8px 10px', color: '#64b5f6', fontVariantNumeric: 'tabular-nums' }}>
          {productionPerMin !== null ? formatRate(productionPerMin) : '-'}
        </td>
        <td style={{ padding: '8px 10px', fontVariantNumeric: 'tabular-nums' }}>
          {surplusPerMin !== null ? (
            <span style={{ color: surplusPerMin > 0.001 ? '#4caf50' : '#a0a0b0' }}>
              {surplusPerMin > 0.001 ? '+' : ''}{formatRate(surplusPerMin)}
            </span>
          ) : '-'}
        </td>
        <td style={{ padding: '8px 10px', borderRadius: '0 6px 6px 0' }}>
          {!isRaw && (
            <button
              onClick={() => openRecipeSelector(fi.itemId)}
              style={{
                background: 'transparent',
                border: '1px solid #0f3460',
                color: '#a0a0b0',
                cursor: 'pointer',
                borderRadius: '4px',
                padding: '2px 8px',
                fontSize: '11px',
              }}
            >
              変更
            </button>
          )}
        </td>
      </tr>
    );
  };

  // ── メインレンダー ─────────────────────────────────────────────────────────

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* サマリーバー */}
      <div style={{
        padding: '10px 16px',
        borderBottom: '1px solid #0f3460',
        display: 'flex',
        gap: '16px',
        alignItems: 'center',
        flexWrap: 'wrap',
        background: '#16213e',
      }}>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>総電力</span>
          <div style={{ color: '#ff9800', fontWeight: 700, fontSize: '16px' }}>{result.totalPowerMW.toFixed(1)} MW</div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>アイテム種類</span>
          <div style={{ color: '#64b5f6', fontWeight: 700, fontSize: '16px' }}>{result.flatItems.length}</div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>建物種類</span>
          <div style={{ color: '#ce93d8', fontWeight: 700, fontSize: '16px' }}>{result.machineSummary.length}</div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>総建物数</span>
          <div style={{ color: '#4caf50', fontWeight: 700, fontSize: '16px' }}>
            {result.machineSummary.reduce((s, m) => s + m.count, 0)}
          </div>
        </div>
      </div>


      {tabBar}

      {/* コンテンツ */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'table' && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            {/* View toggle (生産目標が複数のときのみ表示) */}
            {targets.length > 1 && (
              <div style={{ display: 'flex', gap: '4px', marginBottom: '12px' }}>
                <button style={viewToggleStyle(tableView === 'total')} onClick={() => setTableView('total')}>
                  トータル
                </button>
                <button style={viewToggleStyle(tableView === 'product')} onClick={() => setTableView('product')}>
                  プロダクト
                </button>
              </div>
            )}

            {/* トータルビュー */}
            {tableView === 'total' && (
              <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '13px' }}>
                {tableHeader}
                <tbody>
                  {result.flatItems.map(fi => {
                    const node = totalNodeMap.get(fi.itemId);
                    if (!node) return null;
                    return renderItemRow(node, fi, fi.itemId);
                  })}
                </tbody>
              </table>
            )}

            {/* プロダクトビュー */}
            {tableView === 'product' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                {result.nodes.map((root, idx) => {
                  const target = targets[idx];
                  const targetItem = items[root.itemId];
                  const targetName = targetItem
                    ? (language === 'ja' ? targetItem.nameJa : targetItem.name)
                    : root.itemId;
                  const accordionKey = target?.id ?? String(idx);
                  const isOpen = !productCollapsed.has(accordionKey);
                  const { nodeMap, treeItems } = productData[idx];

                  return (
                    <div key={accordionKey} style={{ borderRadius: '6px', overflow: 'hidden' }}>
                      {/* アコーディオンヘッダー */}
                      <button
                        onClick={() => toggleProductCollapse(accordionKey)}
                        style={{
                          width: '100%', display: 'flex', alignItems: 'center', gap: '10px',
                          padding: '9px 14px',
                          background: isOpen ? 'rgba(245,166,35,0.12)' : 'rgba(245,166,35,0.06)',
                          border: 'none', cursor: 'pointer', textAlign: 'left',
                          borderLeft: `3px solid ${PRODUCT_ACCENT}`,
                          transition: 'background 0.15s',
                        }}
                      >
                        <span style={{ fontSize: '15px', flexShrink: 0 }}>🎯</span>
                        <span style={{ flex: 1, color: PRODUCT_ACCENT, fontWeight: 700, fontSize: '13px' }}>
                          {targetName}
                        </span>
                        {target && (
                          <span style={{
                            color: '#e0e0e0', fontSize: '12px', flexShrink: 0,
                            background: 'rgba(255,255,255,0.08)',
                            padding: '1px 8px', borderRadius: '10px', marginRight: '4px',
                          }}>
                            {formatRate(target.amountPerMinute)}/分
                          </span>
                        )}
                        <span style={{
                          color: '#808090', fontSize: '10px', flexShrink: 0,
                          background: 'rgba(255,255,255,0.06)',
                          padding: '1px 7px', borderRadius: '10px', marginRight: '6px',
                        }}>
                          {treeItems.length}
                        </span>
                        <span style={{ color: '#606070', fontSize: '10px', flexShrink: 0 }}>
                          {isOpen ? '▼' : '▶'}
                        </span>
                      </button>

                      {/* アコーディオンボディ */}
                      {isOpen && (
                        <div style={{
                          borderLeft: `3px solid ${PRODUCT_ACCENT}`,
                          background: 'rgba(255,255,255,0.02)',
                          padding: '10px 14px 12px 14px',
                          overflowX: 'auto',
                        }}>
                          <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '13px' }}>
                            {tableHeader}
                            <tbody>
                              {treeItems.map(fi => {
                                const node = nodeMap.get(fi.itemId);
                                if (!node) return null;
                                return renderItemRow(node, fi, `${accordionKey}-${fi.itemId}`);
                              })}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'machines' && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px' }}>
              {result.machineSummary.map(ms => {
                const machine = machines[ms.machineId];
                const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : ms.machineId;
                return (
                  <div
                    key={ms.machineId}
                    style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '10px', padding: '16px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
                      <span style={{ fontSize: '24px' }}>🏭</span>
                      <div>
                        <div style={{ color: '#e0e0e0', fontWeight: 700, fontSize: '14px' }}>{machineName}</div>
                        <div style={{ color: '#a0a0b0', fontSize: '11px' }}>{ms.machineId}</div>
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#1a1a2e', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#f5a623', fontSize: '22px', fontWeight: 700 }}>{ms.count}</div>
                        <div style={{ color: '#a0a0b0', fontSize: '10px' }}>建物数</div>
                      </div>
                      <div style={{ background: '#1a1a2e', borderRadius: '6px', padding: '8px', textAlign: 'center' }}>
                        <div style={{ color: '#ff9800', fontSize: '18px', fontWeight: 700 }}>{ms.powerConsumptionMW.toFixed(1)}</div>
                        <div style={{ color: '#a0a0b0', fontSize: '10px' }}>MW</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'line' && (
          <div style={{ height: '100%' }}>
            <ProductionLineFlow roots={result.nodes} planId={currentPlanId} />
          </div>
        )}
      </div>
    </div>
  );
}
