import { useCalculationStore } from '../../stores/calculationStore';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { usePlanStore } from '../../stores/planStore';
import { formatRate } from '../../utils/math';
import { useIsMobile } from '../../hooks/useIsMobile';
import DependencyFlow from '../../components/flow/DependencyFlow';

export default function ResultPanel() {
  const result = useCalculationStore(s => s.result);
  const isCalculating = useCalculationStore(s => s.isCalculating);
  const items = useGameDataStore(s => s.items);
  const machines = useGameDataStore(s => s.machines);
  const recipes = useGameDataStore(s => s.recipes);
  const language = useSettingsStore(s => s.language);
  const activeTab = useUiStore(s => s.activeTab);
  const setActiveTab = useUiStore(s => s.setActiveTab);
  const openRecipeSelector = useUiStore(s => s.openRecipeSelector);
  const currentPlanId = usePlanStore(s => s.currentPlan?.id ?? null);
  const isMobile = useIsMobile();

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

  if (isCalculating) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#f5a623',
        fontSize: '16px',
      }}>
        ⚙️ 計算中...
      </div>
    );
  }

  if (!result) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#a0a0b0',
        gap: '16px',
      }}>
        <div style={{ fontSize: '48px' }}>⚙️</div>
        <div style={{ fontSize: '16px', color: '#e0e0e0' }}>生産目標を追加して計算を実行</div>
        <div style={{ fontSize: '13px' }}>{isMobile ? '「目標設定」タブでアイテムと量を設定してください' : '左パネルでアイテムと量を設定してください'}</div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      {/* Summary Bar */}
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
          <div style={{ color: '#ff9800', fontWeight: 700, fontSize: '16px' }}>
            {result.totalPowerMW.toFixed(1)} MW
          </div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>アイテム種類</span>
          <div style={{ color: '#64b5f6', fontWeight: 700, fontSize: '16px' }}>
            {result.flatItems.length}
          </div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>建物種類</span>
          <div style={{ color: '#ce93d8', fontWeight: 700, fontSize: '16px' }}>
            {result.machineSummary.length}
          </div>
        </div>
        <div>
          <span style={{ color: '#a0a0b0', fontSize: '11px' }}>総建物数</span>
          <div style={{ color: '#4caf50', fontWeight: 700, fontSize: '16px' }}>
            {result.machineSummary.reduce((s, m) => s + m.count, 0)}
          </div>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{
        padding: '6px 8px',
        borderBottom: '1px solid #0f3460',
        display: 'flex',
        gap: '4px',
        background: '#1a1a2e',
      }}>
        {(['table', 'machines', 'tree'] as const).map((tab, i) => (
          <button
            key={tab}
            style={{ ...tabStyle(tab), flex: isMobile ? 1 : undefined, justifyContent: 'center', display: 'flex', alignItems: 'center' }}
            onClick={() => setActiveTab(tab)}
          >
            {['📊 テーブル', '🏭 建物', '🌲 依存グラフ'][i]}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {activeTab === 'table' && (
          <div style={{ height: '100%', overflow: 'auto', padding: '16px' }}>
            <table style={{ width: 'max-content', minWidth: '100%', borderCollapse: 'separate', borderSpacing: '0 4px', fontSize: '13px' }}>
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
              <tbody>
                {result.flatItems.map(fi => {
                  // Find a node with this item
                  const findNode = (nodes: typeof result.nodes): typeof result.nodes[0] | undefined => {
                    for (const n of nodes) {
                      if (n.itemId === fi.itemId) return n;
                      const found = findNode(n.children);
                      if (found) return found;
                    }
                    return undefined;
                  };
                  const node = findNode(result.nodes);
                  const item = items[fi.itemId];
                  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : fi.itemId;
                  const recipe = node?.recipeId ? recipes[node.recipeId] : undefined;
                  const machine = recipe ? machines[recipe.machineId] : undefined;
                  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : '';
                  const isRaw = node?.isRawResource ?? !recipe;

                  // 製造量/分・余剰量/分の計算
                  // effectiveOutputRatePerMachine = node.requiredPerMinute / node.machineCountExact
                  const effectiveRate = (node && !isRaw && node.machineCountExact > 0)
                    ? node.requiredPerMinute / node.machineCountExact
                    : null;
                  const neededMachines = (effectiveRate !== null && fi.totalPerMinute > 0)
                    ? Math.ceil(fi.totalPerMinute / effectiveRate)
                    : null;
                  const productionPerMin = (neededMachines !== null && effectiveRate !== null)
                    ? neededMachines * effectiveRate
                    : null;
                  const surplusPerMin = (productionPerMin !== null)
                    ? productionPerMin - fi.totalPerMinute
                    : null;

                  return (
                    <tr
                      key={fi.itemId}
                      style={{
                        background: isRaw ? '#1a3a1a' : '#0f3460',
                        borderRadius: '6px',
                      }}
                    >
                      <td style={{ padding: '8px 10px', borderRadius: '6px 0 0 6px', fontWeight: 600, color: isRaw ? '#4caf50' : '#e0e0e0' }}>
                        {itemName}
                        {isRaw && <span style={{ fontSize: '10px', color: '#4caf50', marginLeft: '6px' }}>raw</span>}
                      </td>
                      <td style={{ padding: '8px 10px' }}>
                        <span style={{ color: '#f5a623', fontWeight: 700 }}>
                          {formatRate(fi.totalPerMinute)}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', color: '#a0a0b0' }}>
                        {machineName}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#e0e0e0', fontWeight: 600 }}>
                        {neededMachines !== null ? neededMachines : '-'}
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
                })}
              </tbody>
            </table>
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
                    style={{
                      background: '#0f3460',
                      border: '1px solid #1a3a6a',
                      borderRadius: '10px',
                      padding: '16px',
                    }}
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

        {activeTab === 'tree' && (
          <div style={{ height: '100%' }}>
            <DependencyFlow roots={result.nodes} planId={currentPlanId} />
          </div>
        )}
      </div>
    </div>
  );
}
