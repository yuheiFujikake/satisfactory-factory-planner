import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Plus, Trash2, Settings2 } from 'lucide-react';
import { usePlanStore } from '../../stores/planStore';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { useCalculationStore } from '../../stores/calculationStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import ItemPicker from '../../components/ItemPicker';
import { trackEvent } from '../../lib/analytics';

/** TargetPanel のプロパティ */
interface TargetPanelProps {
  /** 計算実行後に呼ばれるコールバック（モバイルでのパネル切り替えなどに使用） */
  onCalculate?: () => void;
}

/**
 * 生産目標の入力パネルコンポーネント。
 *
 * プランの作成・切り替え・目標アイテムの追加・削除・量の変更、
 * および計算実行ボタンを提供する。
 */
export default function TargetPanel({ onCalculate }: TargetPanelProps) {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const addTarget = usePlanStore(s => s.addTarget);
  const removeTarget = usePlanStore(s => s.removeTarget);
  const updateTarget = usePlanStore(s => s.updateTarget);
  const createPlan = usePlanStore(s => s.createPlan);
  const savedPlans = usePlanStore(s => s.savedPlans);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const updatePlanName = usePlanStore(s => s.updatePlanName);

  const items = useGameDataStore(s => s.items);
  const gameData = useGameDataStore(useShallow(s => ({ items: s.items, recipes: s.recipes, machines: s.machines })));
  const language = useSettingsStore(s => s.language);
  const openRecipeSelector = useUiStore(s => s.openRecipeSelector);
  const calculate = useCalculationStore(s => s.calculate);

  const isMobile = useIsMobile();

  const [itemPickerOpen, setItemPickerOpen] = useState(false);
  const [newPlanOpen, setNewPlanOpen] = useState(false);
  const [planListOpen, setPlanListOpen] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [editingPlanName, setEditingPlanName] = useState(false);

  /** アイテムピッカーで選択されたアイテムを生産目標に追加する */
  const handleAddTarget = (itemId: string, amount: number) => {
    addTarget(itemId, amount);
  };

  /** 新規プランを作成する */
  const handleCreatePlan = () => {
    const name = newPlanName.trim() || `プラン ${savedPlans.length + 1}`;
    createPlan(name);
    trackEvent('plan_create');
    setNewPlanName('');
    setNewPlanOpen(false);
  };

  /** 計算を実行する */
  const handleCalculate = () => {
    if (currentPlan) {
      trackEvent('calculate', { target_count: currentPlan.targets.length });
      calculate(currentPlan, gameData);
      onCalculate?.();
    }
  };

  /** 計算実行ボタンが有効かどうか（プランがあり目標が1件以上） */
  const canCalculate = !!(currentPlan && currentPlan.targets.length > 0);

  const cardStyle = {
    background: '#0f3460',
    border: '1px solid #1a3a6a',
    borderRadius: '8px',
    padding: '12px',
    marginBottom: '8px',
  };

  return (
    <>
      <div style={{
        width: isMobile ? '100%' : '320px',
        minWidth: isMobile ? 'unset' : '320px',
        borderRight: isMobile ? 'none' : '1px solid #0f3460',
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}>
        {/* プランヘッダー */}
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #0f3460' }}>
          {/* 「現在のプラン」ラベルと「+」ボタン */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            marginBottom: '6px',
          }}>
            <span style={{
              color: '#a0a0b0',
              fontSize: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              flex: 1,
            }}>
              現在のプラン
            </span>

            {/* 保存済みプランの読み込み */}
            {savedPlans.length > 0 && (
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setPlanListOpen(o => !o)}
                  title="保存済みプランを開く"
                  style={{
                    background: 'transparent',
                    border: '1px solid #0f3460',
                    color: '#a0a0b0',
                    cursor: 'pointer',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '11px',
                  }}
                >📂</button>
                {planListOpen && (
                  <div style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    zIndex: 200,
                    background: '#16213e',
                    border: '1px solid #0f3460',
                    borderRadius: '8px',
                    padding: '8px',
                    marginTop: '4px',
                    minWidth: '180px',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                  }}>
                    <div style={{ fontSize: '10px', color: '#a0a0b0', marginBottom: '6px', padding: '0 4px' }}>
                      保存済みプラン
                    </div>
                    {savedPlans.map(plan => (
                      <div
                        key={plan.id}
                        onClick={() => { loadPlan(plan.id); setPlanListOpen(false); }}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          color: plan.id === currentPlan?.id ? '#f5a623' : '#e0e0e0',
                          background: plan.id === currentPlan?.id ? 'rgba(245,166,35,0.1)' : 'transparent',
                          fontSize: '12px',
                        }}
                        onMouseEnter={e => { if (plan.id !== currentPlan?.id) (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; }}
                        onMouseLeave={e => { if (plan.id !== currentPlan?.id) (e.currentTarget as HTMLElement).style.background = 'transparent'; }}
                      >
                        {plan.name}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 新規プラン「+」ボタン */}
            <div style={{ position: 'relative' }}>
              <button
                onClick={() => setNewPlanOpen(o => !o)}
                title="新規プラン"
                style={{
                  background: newPlanOpen ? '#f5a623' : '#0f3460',
                  border: '1px solid #f5a62366',
                  color: newPlanOpen ? '#1a1a2e' : '#f5a623',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  padding: '2px 7px',
                  fontSize: '14px',
                  fontWeight: 700,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                <Plus size={14} />
              </button>
              {newPlanOpen && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  zIndex: 200,
                  background: '#16213e',
                  border: '1px solid #0f3460',
                  borderRadius: '8px',
                  padding: '12px',
                  marginTop: '4px',
                  width: '220px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                }}>
                  <div style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '6px' }}>新規プラン名</div>
                  <input
                    autoFocus
                    value={newPlanName}
                    onChange={e => setNewPlanName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleCreatePlan(); if (e.key === 'Escape') setNewPlanOpen(false); }}
                    placeholder="プラン名..."
                    style={{
                      background: '#1a1a2e',
                      border: '1px solid #0f3460',
                      borderRadius: '6px',
                      color: '#e0e0e0',
                      padding: '6px 10px',
                      fontSize: '13px',
                      width: '100%',
                      marginBottom: '8px',
                      outline: 'none',
                      boxSizing: 'border-box',
                    }}
                  />
                  <button
                    onClick={handleCreatePlan}
                    style={{
                      background: '#f5a623',
                      color: '#1a1a2e',
                      border: 'none',
                      borderRadius: '6px',
                      padding: '6px 12px',
                      fontSize: '12px',
                      fontWeight: 700,
                      cursor: 'pointer',
                      width: '100%',
                    }}
                  >
                    作成
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* 現在のプラン名（クリックで編集） */}
          {currentPlan ? (
            editingPlanName ? (
              <input
                autoFocus
                value={currentPlan.name}
                onChange={e => updatePlanName(e.target.value)}
                onBlur={() => setEditingPlanName(false)}
                onKeyDown={e => { if (e.key === 'Enter' || e.key === 'Escape') setEditingPlanName(false); }}
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #f5a623',
                  borderRadius: '6px',
                  color: '#f5a623',
                  padding: '5px 10px',
                  fontSize: '14px',
                  fontWeight: 700,
                  width: '100%',
                  outline: 'none',
                  boxSizing: 'border-box',
                }}
              />
            ) : (
              <div
                onClick={() => setEditingPlanName(true)}
                title="クリックで名前を編集"
                style={{
                  color: '#f5a623',
                  fontWeight: 700,
                  fontSize: '14px',
                  cursor: 'pointer',
                  padding: '3px 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                }}
              >
                {currentPlan.name}
                <span style={{ fontSize: '12px', opacity: 0.6 }}>✏️</span>
              </div>
            )
          ) : (
            <div style={{ color: '#a0a0b0', fontSize: '12px' }}>
              プランがありません — 「＋」で新規作成
            </div>
          )}
        </div>

        {/* 生産目標一覧 */}
        <div style={{ flex: 1, overflow: 'auto', padding: '12px' }}>
          <div style={{
            color: '#a0a0b0',
            fontSize: '10px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            marginBottom: '8px',
          }}>
            生産目標 ({currentPlan?.targets.length || 0})
          </div>

          {!currentPlan && (
            <div style={{ color: '#a0a0b0', textAlign: 'center', padding: '32px 0', fontSize: '13px' }}>
              「＋」ボタンでプランを作成してください
            </div>
          )}

          {currentPlan?.targets.map(target => {
            const item = items[target.itemId];
            const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : target.itemId;
            return (
              <div key={target.id} style={cardStyle}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '6px',
                }}>
                  <span style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600 }}>{itemName}</span>
                  <div style={{ display: 'flex', gap: '4px' }}>
                    <button
                      onClick={() => openRecipeSelector(target.itemId)}
                      title="レシピを選択"
                      style={{
                        background: 'transparent',
                        border: '1px solid #0f3460',
                        color: '#a0a0b0',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Settings2 size={12} />
                    </button>
                    <button
                      onClick={() => removeTarget(target.id)}
                      style={{
                        background: 'transparent',
                        border: '1px solid rgba(244,67,54,0.3)',
                        color: '#f44336',
                        cursor: 'pointer',
                        borderRadius: '4px',
                        padding: '3px 6px',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type="number"
                    value={target.amountPerMinute}
                    onChange={e => updateTarget(target.id, { amountPerMinute: parseFloat(e.target.value) || 0 })}
                    min="0"
                    step="1"
                    style={{
                      background: '#1a1a2e',
                      border: '1px solid #0f3460',
                      borderRadius: '6px',
                      color: '#f5a623',
                      padding: '4px 8px',
                      fontSize: '14px',
                      fontWeight: 700,
                      width: '100px',
                      outline: 'none',
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  />
                  <span style={{ color: '#a0a0b0', fontSize: '12px' }}>/分</span>
                  {currentPlan.recipeOverrides[target.itemId] && (
                    <span style={{ color: '#ff9800', fontSize: '10px' }}>代替</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* 下部：アイテム追加・計算実行ボタン */}
        {currentPlan && (
          <div style={{ padding: '12px', borderTop: '1px solid #0f3460', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {/* アイテム追加ボタン */}
            <button
              onClick={() => setItemPickerOpen(true)}
              style={{
                background: '#0f3460',
                border: '1px solid #f5a62366',
                color: '#f5a623',
                borderRadius: '8px',
                padding: '8px 12px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(245,166,35,0.12)'; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = '#0f3460'; }}
            >
              <Plus size={14} /> アイテムを追加
            </button>

            {/* 計算実行ボタン */}
            <button
              onClick={handleCalculate}
              disabled={!canCalculate}
              style={{
                background: canCalculate ? '#f5a623' : '#333',
                color: canCalculate ? '#1a1a2e' : '#666',
                border: 'none',
                borderRadius: '8px',
                padding: '10px 12px',
                fontSize: '14px',
                fontWeight: 700,
                cursor: canCalculate ? 'pointer' : 'not-allowed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={e => { if (canCalculate) (e.currentTarget as HTMLElement).style.background = '#ffb74d'; }}
              onMouseLeave={e => { if (canCalculate) (e.currentTarget as HTMLElement).style.background = '#f5a623'; }}
            >
              ⚙️ 計算実行
            </button>
          </div>
        )}
      </div>

      {/* アイテムピッカーモーダル */}
      {itemPickerOpen && (
        <ItemPicker
          onSelect={handleAddTarget}
          onClose={() => setItemPickerOpen(false)}
        />
      )}
    </>
  );
}
