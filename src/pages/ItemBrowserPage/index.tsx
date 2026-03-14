import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useItemSearch } from '../../hooks/useItemSearch';
import type { Item } from '../../types/game.types';
import ItemIcon from '../../components/ItemIcon';
import RecipeCard from '../../components/RecipeCard';
import { CATEGORY_INFO } from '../../components/ItemPicker';

const CATEGORY_ORDER = [
  'ore', 'fluid', 'ingot', 'standard_part', 'electronic', 'industrial',
  'communication', 'petroleum', 'fuel', 'mineral', 'advanced',
  'nuclear', 'space_elevator', 'equipment', 'special',
];

export default function ItemBrowserPage() {
  const { query, setQuery, filteredItems } = useItemSearch();
  const language = useSettingsStore(s => s.language);
  const getRecipesForItem = useGameDataStore(s => s.getRecipesForItem);
  const items = useGameDataStore(s => s.items);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Build category list from actual items, preserving order
  const presentCategories = CATEGORY_ORDER.filter(cat =>
    Object.values(items).some(item => item.category === cat)
  );

  const displayItems = filterCategory === 'all'
    ? filteredItems
    : filteredItems.filter(item => item.category === filterCategory);

  const selectedRecipes = selectedItem ? getRecipesForItem(selectedItem.id) : [];

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Left Panel */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        borderRight: selectedItem ? '1px solid #0f3460' : 'none',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid #0f3460' }}>
          <h1 style={{ color: '#f5a623', fontSize: '22px', fontWeight: 700, margin: '0 0 12px' }}>
            📦 アイテムブラウザ
          </h1>

          {/* Search */}
          <div style={{ position: 'relative', marginBottom: '12px' }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#a0a0b0',
            }} />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="アイテムを検索..."
              style={{
                width: '100%',
                background: '#16213e',
                border: '1px solid #0f3460',
                borderRadius: '8px',
                color: '#e0e0e0',
                padding: '8px 36px',
                fontSize: '14px',
                outline: 'none',
                boxSizing: 'border-box',
              }}
            />
            {query && (
              <button
                onClick={() => setQuery('')}
                style={{
                  position: 'absolute',
                  right: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'transparent',
                  border: 'none',
                  color: '#a0a0b0',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <X size={14} />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
            <button
              onClick={() => setFilterCategory('all')}
              style={{
                padding: '4px 12px',
                borderRadius: '20px',
                border: filterCategory === 'all' ? '2px solid #f5a623' : '1px solid #0f3460',
                background: filterCategory === 'all' ? 'rgba(245,166,35,0.15)' : 'transparent',
                color: filterCategory === 'all' ? '#f5a623' : '#a0a0b0',
                fontSize: '11px',
                cursor: 'pointer',
                fontWeight: filterCategory === 'all' ? 700 : 400,
              }}
            >
              すべて
            </button>
            {presentCategories.map(cat => {
              const info = CATEGORY_INFO[cat] || { label: cat, emoji: '•', color: '#888' };
              const active = filterCategory === cat;
              return (
                <button
                  key={cat}
                  onClick={() => setFilterCategory(active ? 'all' : cat)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '20px',
                    border: active ? `2px solid ${info.color}` : '1px solid #0f3460',
                    background: active ? `${info.color}20` : 'transparent',
                    color: active ? info.color : '#a0a0b0',
                    fontSize: '11px',
                    cursor: 'pointer',
                    fontWeight: active ? 700 : 400,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {info.emoji} {info.label}
                </button>
              );
            })}
          </div>

          <div style={{ color: '#a0a0b0', fontSize: '12px', marginTop: '8px' }}>
            {displayItems.length} アイテム
          </div>
        </div>

        {/* Item Grid */}
        <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
            gap: '10px',
          }}>
            {displayItems.map(item => {
              const name = language === 'ja' ? item.nameJa : item.name;
              const isSelected = selectedItem?.id === item.id;
              const info = CATEGORY_INFO[item.category] || { label: item.category, emoji: '•', color: '#888' };

              return (
                <div
                  key={item.id}
                  onClick={() => setSelectedItem(isSelected ? null : item)}
                  style={{
                    background: isSelected ? `${info.color}15` : '#0f3460',
                    border: `2px solid ${isSelected ? info.color : '#1a3a6a'}`,
                    borderRadius: '8px',
                    padding: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <ItemIcon item={item} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        color: isSelected ? info.color : '#e0e0e0',
                        fontWeight: 600,
                        fontSize: '13px',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>
                        {name}
                      </div>
                      <div style={{ color: '#a0a0b0', fontSize: '10px' }}>
                        Tier {item.tier}
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{
                      background: `${info.color}20`,
                      color: info.color,
                      fontSize: '10px',
                      padding: '2px 7px',
                      borderRadius: '8px',
                      fontWeight: 600,
                    }}>
                      {info.emoji} {info.label}
                    </span>
                    <span style={{ color: '#a0a0b0', fontSize: '11px' }}>
                      {item.sinkPoints > 0 ? `${item.sinkPoints} pts` : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Right Detail Panel */}
      {selectedItem && (
        <div style={{
          width: '380px',
          minWidth: '380px',
          overflow: 'auto',
          padding: '20px',
          background: '#16213e',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
            <ItemIcon item={selectedItem} size={48} />
            <div>
              <h2 style={{ color: '#f5a623', fontSize: '18px', fontWeight: 700, margin: '0 0 4px' }}>
                {language === 'ja' ? selectedItem.nameJa : selectedItem.name}
              </h2>
              <div style={{ color: '#a0a0b0', fontSize: '12px' }}>
                {language === 'en' ? selectedItem.nameJa : selectedItem.name}
              </div>
            </div>
          </div>

          {/* Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px',
            marginBottom: '20px',
          }}>
            {[
              { label: 'ID', value: selectedItem.id },
              { label: 'カテゴリ', value: `${CATEGORY_INFO[selectedItem.category]?.emoji || ''} ${CATEGORY_INFO[selectedItem.category]?.label || selectedItem.category}` },
              { label: 'Tier', value: selectedItem.tier },
              { label: 'スタックサイズ', value: selectedItem.stackSize || 'Fluid' },
              { label: 'AWESOME Sink', value: `${selectedItem.sinkPoints} pts` },
            ].map(stat => (
              <div key={stat.label} style={{
                background: '#0f3460',
                borderRadius: '6px',
                padding: '8px 10px',
              }}>
                <div style={{ color: '#a0a0b0', fontSize: '10px', marginBottom: '2px' }}>{stat.label}</div>
                <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600 }}>{stat.value}</div>
              </div>
            ))}
          </div>

          {/* Recipes */}
          <div>
            <div style={{
              color: '#a0a0b0',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '10px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
            }}>
              レシピ ({selectedRecipes.length})
            </div>
            {selectedRecipes.length === 0 ? (
              <div style={{ color: '#a0a0b0', textAlign: 'center', padding: '20px', fontSize: '13px' }}>
                このアイテムの生産レシピはありません (生産資源)
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedRecipes.map(recipe => (
                  <RecipeCard key={recipe.id} recipe={recipe} />
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
