import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';
import type { HandleSpec } from '../../domain/productionLineBuilder';

interface LineItemNodeData {
  itemId: string;
  requiredPerMinute: number;
  machineCount: number;
  machineCountExact: number;
  recipeId?: string;
  isRawResource: boolean;
  isTarget: boolean;
  machineSurplusPerMinute?: number;
  sourceHandles: HandleSpec[];
  targetHandles: HandleSpec[];
  canSplit?: boolean;
  isSplit?: boolean;
  onSplit?: () => void;
  onMerge?: () => void;
  isChildHighlight?: boolean;
  isUnrelated?: boolean;
  [key: string]: unknown;
}

const categoryEmoji: Record<string, string> = {
  ore: '⛏️', fluid: '💧', ingot: '🔩', standard_part: '🔧', electronic: '⚡',
  industrial: '⚙️', communication: '💻', petroleum: '🧴', fuel: '🔥',
  mineral: '🪨', advanced: '🧪', nuclear: '☢️', space_elevator: '🚀',
  equipment: '🛡️', special: '✨',
};

const categoryColor: Record<string, string> = {
  ore: '#a0896a', ingot: '#f5a623', part: '#64b5f6',
  component: '#ce93d8', fluid: '#4fc3f7', equipment: '#81c784', special: '#fff176',
  standard_part: '#64b5f6', electronic: '#ffd54f', industrial: '#90caf9',
  communication: '#4dd0e1', petroleum: '#c5e1a5', fuel: '#ffb74d',
  mineral: '#bcaaa4', advanced: '#b39ddb', nuclear: '#a5d6a7', space_elevator: '#80d8ff',
};
const categoryBg: Record<string, string> = {
  ore: '#1e1a10', ingot: '#1e1500', part: '#0a1520',
  component: '#180a1e', fluid: '#081520', equipment: '#0a1e10', special: '#1e1e08',
};

const LineItemNode = memo(({ data, selected }: NodeProps) => {
  const d = data as LineItemNodeData;
  const items = useGameDataStore(s => s.items);
  const recipes = useGameDataStore(s => s.recipes);
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const item = items[d.itemId];
  const recipe = d.recipeId ? recipes[d.recipeId] : undefined;
  const machine = recipe ? machines[recipe.machineId] : undefined;

  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : d.itemId;
  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : '';
  const emoji = item ? (categoryEmoji[item.category] || '📦') : '📦';

  const isRaw = d.isRawResource;
  const isTarget = d.isTarget;
  const surplus = d.machineSurplusPerMinute ?? 0;
  const isChildHighlight = d.isChildHighlight ?? false;
  const isUnrelated = d.isUnrelated ?? false;

  const catColor = item ? (categoryColor[item.category] || '#c0c8d8') : '#c0c8d8';
  const catBg = item ? (categoryBg[item.category] || '#0f3460') : '#0f3460';

  const bgColor = selected ? '#0a1a2a' : isChildHighlight ? '#1e1200' : isUnrelated ? '#111118' : catBg;
  const baseBorderColor = isTarget ? '#64b5f6' : catColor;
  const borderColor = selected ? '#00e5ff' : isChildHighlight ? '#f5a623' : isUnrelated ? '#2a2a3a' : baseBorderColor;
  const nameColor = isUnrelated ? '#505060' : isTarget ? '#64b5f6' : catColor;
  const boxShadow = selected
    ? '0 0 0 2px rgba(0,229,255,0.4), 0 0 20px rgba(0,229,255,0.25)'
    : isChildHighlight ? '0 0 0 2px rgba(245,166,35,0.5), 0 0 16px rgba(245,166,35,0.3)'
    : isUnrelated ? 'none'
    : isTarget ? `0 0 12px ${catColor}40` : 'none';

  const handleStyle = {
    background: borderColor,
    width: '10px',
    height: '10px',
    border: `2px solid ${borderColor}`,
  };

  const divider: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '5px 0 4px',
  };

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 12px',
        minWidth: '210px',
        maxWidth: '250px',
        boxShadow,
        fontSize: '12px',
        color: isUnrelated ? '#404050' : '#e0e0e0',
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
        opacity: isUnrelated ? 0.45 : 1,
      }}
    >
      {/* Per-connection source handles (right side — ingredient sends rightward to parent product, or bottom for surplus) */}
      {(d.sourceHandles ?? []).map(h => (
        h.isSurplusHandle ? (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={Position.Bottom}
            style={{ ...handleStyle, left: '50%', transform: 'translateX(-50%)', top: 'auto', bottom: '-5px' }}
          />
        ) : (
          <Handle
            key={h.id}
            id={h.id}
            type="source"
            position={Position.Right}
            style={{ ...handleStyle, top: `${h.topPercent}%`, transform: 'translateY(-50%)' }}
          />
        )
      ))}

      {/* Per-connection target handles (left side — product receives from ingredients on the left) */}
      {(d.targetHandles ?? []).map(h => (
        <Handle
          key={h.id}
          id={h.id}
          type="target"
          position={Position.Left}
          style={{ ...handleStyle, top: `${h.topPercent}%`, transform: 'translateY(-50%)' }}
        />
      ))}

      {/* Item name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
        <span style={{
          fontWeight: 700, fontSize: '13px', color: nameColor,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1,
        }}>
          {itemName}
        </span>
        {isTarget && (
          <span style={{
            fontSize: '12px', color: '#64b5f6',
            background: 'rgba(100,181,246,0.15)', border: '1px solid rgba(100,181,246,0.3)',
            borderRadius: '4px', padding: '1px 5px', fontWeight: 700, flexShrink: 0,
          }}>目標</span>
        )}
      </div>

      {/* Required rate */}
      <div style={{
        background: isTarget ? 'rgba(100,181,246,0.15)' : 'rgba(245,166,35,0.12)',
        border: `1px solid ${isTarget ? 'rgba(100,181,246,0.3)' : 'rgba(245,166,35,0.25)'}`,
        borderRadius: '4px', padding: '3px 8px', marginBottom: '4px',
        color: isTarget ? '#64b5f6' : '#f5a623',
        fontSize: '12px', fontWeight: 600, textAlign: 'center',
      }}>
        必要 {formatRate(d.requiredPerMinute)}/min
      </div>

      {/* Raw resource label + split/merge buttons */}
      {isRaw && (
        <>
          <div style={divider} />
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '6px' }}>
            <span style={{ fontSize: '12px', color: '#4caf50' }}>Raw Resource</span>
            {d.canSplit && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => d.onSplit?.()}
                style={{
                  fontSize: '11px', padding: '1px 7px', borderRadius: '4px', cursor: 'pointer',
                  background: 'rgba(100,181,246,0.15)', border: '1px solid rgba(100,181,246,0.4)',
                  color: '#64b5f6', fontWeight: 700,
                }}
              >
                ✂ 分割
              </button>
            )}
            {d.isSplit && (
              <button
                onPointerDown={e => e.stopPropagation()}
                onClick={() => d.onMerge?.()}
                style={{
                  fontSize: '11px', padding: '1px 7px', borderRadius: '4px', cursor: 'pointer',
                  background: 'rgba(206,147,216,0.15)', border: '1px solid rgba(206,147,216,0.4)',
                  color: '#ce93d8', fontWeight: 700,
                }}
              >
                統合
              </button>
            )}
          </div>
        </>
      )}

      {/* Processed item: machine info */}
      {!isRaw && machineName && (
        <>
          <div style={divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '12px', flexShrink: 0 }}>⚙️</span>
            <span style={{
              color: '#a0a0b0', fontSize: '12px', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {machineName}
            </span>
            {d.machineCount > 0 && (
              <span style={{
                background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                borderRadius: '4px', padding: '1px 6px',
                color: '#4caf50', fontSize: '12px', fontWeight: 600, flexShrink: 0,
              }}>
                ×{d.machineCount}台
              </span>
            )}
          </div>
          {surplus > 0.001 && (
            <div style={{ fontSize: '12px', color: '#4caf50', marginTop: '3px' }}>
              余剰 +{formatRate(surplus)}/min
            </div>
          )}
          {(d.canSplit || d.isSplit) && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '6px', marginTop: '4px' }}>
              {d.canSplit && (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => d.onSplit?.()}
                  style={{
                    fontSize: '11px', padding: '1px 7px', borderRadius: '4px', cursor: 'pointer',
                    background: 'rgba(100,181,246,0.15)', border: '1px solid rgba(100,181,246,0.4)',
                    color: '#64b5f6', fontWeight: 700,
                  }}
                >
                  ✂ 分割
                </button>
              )}
              {d.isSplit && (
                <button
                  onPointerDown={e => e.stopPropagation()}
                  onClick={() => d.onMerge?.()}
                  style={{
                    fontSize: '11px', padding: '1px 7px', borderRadius: '4px', cursor: 'pointer',
                    background: 'rgba(206,147,216,0.15)', border: '1px solid rgba(206,147,216,0.4)',
                    color: '#ce93d8', fontWeight: 700,
                  }}
                >
                  統合
                </button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
});

LineItemNode.displayName = 'LineItemNode';
export default LineItemNode;
