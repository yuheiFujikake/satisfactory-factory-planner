import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';

interface ItemNodeData {
  itemId: string;
  requiredPerMinute: number;
  machineCount: number;
  machineCountExact: number;
  recipeId?: string;
  isRawResource: boolean;
  overclockRate: number;
  isRoot?: boolean;
  [key: string]: unknown;
}

const categoryEmoji: Record<string, string> = {
  ore: '⛏️',
  fluid: '💧',
  ingot: '🔩',
  standard_part: '🔧',
  electronic: '⚡',
  industrial: '⚙️',
  communication: '💻',
  petroleum: '🧴',
  fuel: '🔥',
  mineral: '🪨',
  advanced: '🧪',
  nuclear: '☢️',
  space_elevator: '🚀',
  equipment: '🛡️',
  special: '✨',
};

const ItemNode = memo(({ data }: NodeProps) => {
  const nodeData = data as ItemNodeData;
  const items = useGameDataStore(s => s.items);
  const recipes = useGameDataStore(s => s.recipes);
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const item = items[nodeData.itemId];
  const recipe = nodeData.recipeId ? recipes[nodeData.recipeId] : undefined;
  const machine = recipe ? machines[recipe.machineId] : undefined;

  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : nodeData.itemId;
  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : '';
  const emoji = item ? (categoryEmoji[item.category] || '📦') : '📦';

  // Styling based on node type
  const isRoot = nodeData.isRoot ?? false;
  const isRaw = nodeData.isRawResource;

  const bgColor = isRoot ? '#0d2444' : (isRaw ? '#1a3a1a' : '#0f3460');
  const borderColor = isRoot ? '#64b5f6' : (isRaw ? '#4caf50' : '#1a4a8a');
  const borderWidth = isRoot ? 3 : 2;
  const nameColor = isRoot ? '#64b5f6' : (isRaw ? '#4caf50' : '#f5a623');
  const glowColor = isRoot ? '#64b5f640' : (isRaw ? '#4caf5030' : 'transparent');

  return (
    <div
      style={{
        background: bgColor,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '200px',
        maxWidth: '220px',
        boxShadow: `0 0 12px ${glowColor}`,
        fontSize: '12px',
        color: '#e0e0e0',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, width: '8px', height: '8px' }}
      />

      {isRoot && (
        <div style={{
          fontSize: '9px',
          color: '#64b5f6',
          background: 'rgba(100,181,246,0.15)',
          border: '1px solid rgba(100,181,246,0.3)',
          borderRadius: '4px',
          padding: '1px 6px',
          marginBottom: '5px',
          alignSelf: 'flex-start',
          display: 'inline-block',
          fontWeight: 700,
          letterSpacing: '0.5px',
        }}>
          TARGET
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>{emoji}</span>
        <span style={{
          fontWeight: 700,
          fontSize: '13px',
          color: nameColor,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}>
          {itemName}
        </span>
      </div>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: '8px',
      }}>
        <div style={{
          background: isRoot ? 'rgba(100,181,246,0.15)' : 'rgba(245,166,35,0.15)',
          border: `1px solid ${isRoot ? 'rgba(100,181,246,0.3)' : 'rgba(245,166,35,0.3)'}`,
          borderRadius: '4px',
          padding: '2px 8px',
          color: isRoot ? '#64b5f6' : '#f5a623',
          fontSize: '12px',
          fontWeight: 600,
        }}>
          {formatRate(nodeData.requiredPerMinute)}/min
        </div>

        {!isRaw && nodeData.machineCount > 0 && (
          <div style={{
            background: 'rgba(76,175,80,0.15)',
            border: '1px solid rgba(76,175,80,0.3)',
            borderRadius: '4px',
            padding: '2px 8px',
            color: '#4caf50',
            fontSize: '11px',
            fontWeight: 600,
          }}>
            ×{nodeData.machineCount}
          </div>
        )}
      </div>

      {machineName && !isRaw && (
        <div style={{ color: '#a0a0b0', fontSize: '10px', marginTop: '4px' }}>
          {machineName}
        </div>
      )}

      {isRaw && (
        <div style={{ color: '#4caf50', fontSize: '10px', marginTop: '4px' }}>
          Raw Resource
        </div>
      )}

      <Handle
        type="source"
        position={Position.Bottom}
        style={{ background: borderColor, width: '8px', height: '8px' }}
      />
    </div>
  );
});

ItemNode.displayName = 'ItemNode';

export default ItemNode;
