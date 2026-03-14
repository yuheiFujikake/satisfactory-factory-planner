import { useState, useMemo } from 'react';
import { useGameDataStore } from '../stores/gameDataStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Item, ItemCategory } from '../types/game.types';

export const CATEGORY_INFO: Record<string, { label: string; emoji: string; color: string }> = {
  ore:            { label: '資源',       emoji: '⛏️',  color: '#78909c' },
  fluid:          { label: '流体',       emoji: '💧',  color: '#29b6f6' },
  ingot:          { label: 'インゴット', emoji: '🔩',  color: '#ff7043' },
  standard_part:  { label: '基本部品',   emoji: '🔧',  color: '#42a5f5' },
  electronic:     { label: '電子機器',   emoji: '⚡',  color: '#ffca28' },
  industrial:     { label: '産業用部品', emoji: '⚙️',  color: '#66bb6a' },
  communication:  { label: '通信',       emoji: '💻',  color: '#ab47bc' },
  petroleum:      { label: '石油製品',   emoji: '🧴',  color: '#8d6e63' },
  fuel:           { label: '燃料',       emoji: '🔥',  color: '#ef5350' },
  mineral:        { label: '鉱物',       emoji: '🪨',  color: '#90a4ae' },
  advanced:       { label: '先進精製',   emoji: '🧪',  color: '#26c6da' },
  nuclear:        { label: '原子力',     emoji: '☢️',  color: '#d4e157' },
  space_elevator: { label: '軌道EV',     emoji: '🚀',  color: '#f5a623' },
  equipment:      { label: '装備',       emoji: '🛡️',  color: '#ec407a' },
  special:        { label: 'その他',     emoji: '✨',  color: '#bdbdbd' },
};

const CATEGORY_ORDER: ItemCategory[] = [
  'ore', 'fluid', 'ingot', 'standard_part', 'electronic', 'industrial',
  'communication', 'petroleum', 'fuel', 'mineral', 'advanced',
  'nuclear', 'space_elevator', 'equipment', 'special',
];

interface ItemPickerProps {
  onSelect: (itemId: string, amount: number) => void;
  onClose: () => void;
}

export default function ItemPicker({ onSelect, onClose }: ItemPickerProps) {
  const items = useGameDataStore(s => s.items);
  const getDefaultRecipe = useGameDataStore(s => s.getDefaultRecipe);
  const language = useSettingsStore(s => s.language);

  const isMobile = useIsMobile();

  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [pendingItem, setPendingItem] = useState<Item | null>(null);
  const [pendingAmount, setPendingAmount] = useState('30');

  const allItems = useMemo(() => Object.values(items), [items]);

  const filtered = useMemo(() => {
    let list = allItems;
    if (selectedCategory) list = list.filter(i => i.category === selectedCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i =>
        i.name.toLowerCase().includes(q) ||
        i.nameJa.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q)
      );
    }
    return list;
  }, [allItems, search, selectedCategory]);

  const presentCategories = useMemo(() => {
    const cats = new Set(allItems.map(i => i.category));
    return CATEGORY_ORDER.filter(c => cats.has(c));
  }, [allItems]);

  // When selecting an item, compute default amount from recipe
  const handleSelectItem = (item: Item) => {
    const recipe = getDefaultRecipe(item.id);
    const output = recipe?.outputs.find(o => o.itemId === item.id);
    const defaultRate = output?.amountPerMinute ?? 30;
    setPendingItem(item);
    setPendingAmount(String(defaultRate));
  };

  const handleConfirmAdd = () => {
    if (!pendingItem) return;
    const amount = parseFloat(pendingAmount) || 30;
    onSelect(pendingItem.id, amount);
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        zIndex: 2000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#16213e',
          border: isMobile ? 'none' : '1px solid #0f3460',
          borderRadius: isMobile ? '0' : '12px',
          width: isMobile ? '100%' : '820px',
          maxWidth: isMobile ? '100%' : '95vw',
          maxHeight: isMobile ? '100%' : '85vh',
          height: isMobile ? '100%' : undefined,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile ? 'none' : '0 20px 60px rgba(0,0,0,0.6)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '14px 20px',
          borderBottom: '1px solid #0f3460',
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
        }}>
          {pendingItem ? (
            <>
              <button
                onClick={() => setPendingItem(null)}
                style={{
                  background: 'transparent',
                  border: '1px solid #0f3460',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  borderRadius: '6px',
                  padding: '5px 10px',
                  fontSize: '13px',
                }}
              >← 戻る</button>
              <h2 style={{ color: '#f5a623', fontSize: '15px', fontWeight: 700, margin: 0, flex: 1 }}>
                📦 追加内容を確認
              </h2>
            </>
          ) : (
            <>
              <h2 style={{ color: '#f5a623', fontSize: '15px', fontWeight: 700, margin: 0, flex: 1 }}>
                📦 アイテムを選択
              </h2>
              <input
                autoFocus
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="🔍 検索..."
                style={{
                  background: '#1a1a2e',
                  border: '1px solid #0f3460',
                  borderRadius: '6px',
                  color: '#e0e0e0',
                  padding: '6px 12px',
                  fontSize: '13px',
                  width: '200px',
                  outline: 'none',
                }}
              />
            </>
          )}
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: '1px solid #0f3460',
              color: '#a0a0b0',
              cursor: 'pointer',
              borderRadius: '6px',
              padding: '5px 10px',
              fontSize: '13px',
            }}
          >✕</button>
        </div>

        {/* ── STEP 2: Confirmation view ── */}
        {pendingItem ? (
          <ConfirmStep
            item={pendingItem}
            amount={pendingAmount}
            onAmountChange={setPendingAmount}
            onConfirm={handleConfirmAdd}
            language={language}
            isMobile={isMobile}
          />
        ) : (
          <>
            {/* Category tabs */}
            <div style={{
              display: 'flex',
              gap: '4px',
              padding: '8px 16px',
              borderBottom: '1px solid #0f3460',
              overflowX: 'auto',
              flexShrink: 0,
            }}>
              <button
                onClick={() => setSelectedCategory(null)}
                style={{
                  padding: '4px 10px',
                  borderRadius: '12px',
                  border: 'none',
                  background: !selectedCategory ? '#f5a623' : '#0f3460',
                  color: !selectedCategory ? '#1a1a2e' : '#a0a0b0',
                  cursor: 'pointer',
                  fontSize: '11px',
                  fontWeight: !selectedCategory ? 700 : 400,
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >すべて</button>
              {presentCategories.map(cat => {
                const info = CATEGORY_INFO[cat] || { label: cat, emoji: '•', color: '#888' };
                const active = selectedCategory === cat;
                return (
                  <button
                    key={cat}
                    onClick={() => setSelectedCategory(active ? null : cat)}
                    style={{
                      padding: '4px 10px',
                      borderRadius: '12px',
                      border: 'none',
                      background: active ? info.color : '#0f3460',
                      color: active ? '#1a1a2e' : '#a0a0b0',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: active ? 700 : 400,
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    {info.emoji} {info.label}
                  </button>
                );
              })}
            </div>

            {/* Item grid */}
            <div style={{
              flex: 1,
              overflow: 'auto',
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(128px, 1fr))',
              gap: '8px',
              alignContent: 'start',
            }}>
              {filtered.map(item => {
                const info = CATEGORY_INFO[item.category] || { label: item.category, emoji: '•', color: '#888' };
                const name = language === 'ja' ? item.nameJa : item.name;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectItem(item)}
                    style={{
                      background: '#0f3460',
                      border: `1px solid ${info.color}44`,
                      borderRadius: '8px',
                      padding: '10px 8px',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'all 0.15s',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '5px',
                    }}
                    onMouseEnter={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = `${info.color}22`;
                      el.style.borderColor = info.color;
                      el.style.transform = 'translateY(-2px)';
                      el.style.boxShadow = `0 4px 12px ${info.color}33`;
                    }}
                    onMouseLeave={e => {
                      const el = e.currentTarget as HTMLElement;
                      el.style.background = '#0f3460';
                      el.style.borderColor = `${info.color}44`;
                      el.style.transform = 'translateY(0)';
                      el.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ fontSize: '22px', lineHeight: 1 }}>{info.emoji}</div>
                    <div style={{
                      color: '#e0e0e0',
                      fontSize: '11px',
                      fontWeight: 600,
                      lineHeight: 1.3,
                      wordBreak: 'break-all',
                    }}>{name}</div>
                    <div style={{
                      fontSize: '9px',
                      color: info.color,
                      background: `${info.color}22`,
                      padding: '1px 5px',
                      borderRadius: '8px',
                      alignSelf: 'flex-start',
                    }}>
                      {info.label}
                    </div>
                  </button>
                );
              })}
              {filtered.length === 0 && (
                <div style={{ gridColumn: '1/-1', color: '#a0a0b0', textAlign: 'center', padding: '40px' }}>
                  アイテムが見つかりません
                </div>
              )}
            </div>

            <div style={{
              padding: '8px 16px',
              borderTop: '1px solid #0f3460',
              color: '#a0a0b0',
              fontSize: '11px',
            }}>
              {filtered.length} アイテム
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Confirmation step component ──
interface ConfirmStepProps {
  item: Item;
  amount: string;
  onAmountChange: (v: string) => void;
  onConfirm: () => void;
  language: string;
  isMobile: boolean;
}

function ConfirmStep({ item, amount, onAmountChange, onConfirm, language, isMobile }: ConfirmStepProps) {
  const info = CATEGORY_INFO[item.category] || { label: item.category, emoji: '📦', color: '#888' };
  const name = language === 'ja' ? item.nameJa : item.name;
  const altName = language === 'ja' ? item.name : item.nameJa;

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: isMobile ? '24px 20px' : '40px 60px',
      gap: '24px',
    }}>
      {/* Item card */}
      <div style={{
        background: `${info.color}15`,
        border: `2px solid ${info.color}`,
        borderRadius: '16px',
        padding: '24px 32px',
        textAlign: 'center',
        minWidth: '260px',
      }}>
        <div style={{ fontSize: '48px', marginBottom: '12px' }}>{info.emoji}</div>
        <div style={{ color: info.color, fontSize: '22px', fontWeight: 700, marginBottom: '4px' }}>
          {name}
        </div>
        <div style={{ color: '#a0a0b0', fontSize: '13px', marginBottom: '12px' }}>{altName}</div>
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <span style={{
            background: `${info.color}22`,
            color: info.color,
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '10px',
            fontWeight: 600,
          }}>
            {info.emoji} {info.label}
          </span>
          <span style={{
            background: 'rgba(255,255,255,0.06)',
            color: '#a0a0b0',
            fontSize: '11px',
            padding: '3px 10px',
            borderRadius: '10px',
          }}>
            Tier {item.tier}
          </span>
          {item.sinkPoints > 0 && (
            <span style={{
              background: 'rgba(255,255,255,0.06)',
              color: '#a0a0b0',
              fontSize: '11px',
              padding: '3px 10px',
              borderRadius: '10px',
            }}>
              {item.sinkPoints} pts
            </span>
          )}
        </div>
      </div>

      {/* Amount input */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
        <label style={{ color: '#a0a0b0', fontSize: '13px' }}>
          1分間あたりの生産量を設定
        </label>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <input
            autoFocus
            type="number"
            value={amount}
            onChange={e => onAmountChange(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') onConfirm(); }}
            min="0.01"
            step="1"
            style={{
              background: '#1a1a2e',
              border: `2px solid ${info.color}`,
              borderRadius: '8px',
              color: info.color,
              padding: '10px 16px',
              fontSize: '22px',
              fontWeight: 700,
              width: '120px',
              outline: 'none',
              textAlign: 'center',
              fontVariantNumeric: 'tabular-nums',
            }}
          />
          <span style={{ color: '#a0a0b0', fontSize: '16px' }}>/分</span>
        </div>
      </div>

      {/* Confirm button */}
      <button
        onClick={onConfirm}
        style={{
          background: info.color,
          color: '#1a1a2e',
          border: 'none',
          borderRadius: '10px',
          padding: '12px 40px',
          fontSize: '15px',
          fontWeight: 700,
          cursor: 'pointer',
          transition: 'opacity 0.15s',
          minWidth: '160px',
        }}
        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1'; }}
      >
        ＋ 追加する
      </button>
    </div>
  );
}
