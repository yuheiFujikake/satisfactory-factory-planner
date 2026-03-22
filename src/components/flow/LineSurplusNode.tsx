import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';
import type { HandleSpec } from '../../domain/productionLineBuilder';

interface LineSurplusNodeData {
  itemId: string;
  surplusPerMinute: number;
  surplusType: 'raw' | 'machine';
  targetHandles: HandleSpec[];
  isChildHighlight?: boolean;
  isUnrelated?: boolean;
  [key: string]: unknown;
}

const LineSurplusNode = memo(({ data, selected }: NodeProps) => {
  const d = data as LineSurplusNodeData;
  const items = useGameDataStore(s => s.items);
  const language = useSettingsStore(s => s.language);

  const item = items[d.itemId];
  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : d.itemId;
  const label = d.surplusType === 'raw' ? '採取余剰' : '製造余剰';
  const isChildHighlight = d.isChildHighlight ?? false;
  const isUnrelated = d.isUnrelated ?? false;

  const borderStyle = selected
    ? '2px solid #00e5ff'
    : isChildHighlight ? '2px dashed #f5a623'
    : isUnrelated ? '2px dashed #2a2a3a'
    : '2px dashed #4caf50';
  const boxShadow = selected
    ? '0 0 0 2px rgba(0,229,255,0.4), 0 0 20px rgba(0,229,255,0.25)'
    : isChildHighlight ? '0 0 0 2px rgba(245,166,35,0.5), 0 0 16px rgba(245,166,35,0.3)'
    : 'none';

  return (
    <div
      style={{
        background: selected ? '#0d2020' : isChildHighlight ? '#1e1200' : isUnrelated ? '#111118' : '#1a2e1a',
        border: borderStyle,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '170px',
        fontSize: '12px',
        color: isUnrelated ? '#404050' : '#e0e0e0',
        position: 'relative',
        boxShadow,
        opacity: isUnrelated ? 0.45 : 1,
        transition: 'border-color 0.15s, box-shadow 0.15s, opacity 0.15s',
      }}
    >
      {(d.targetHandles ?? []).map(h => (
        <Handle
          key={h.id}
          id={h.id}
          type="target"
          position={Position.Top}
          style={{
            background: '#4caf50',
            width: '10px',
            height: '10px',
            border: '2px solid #4caf50',
            left: '50%',
            transform: 'translateX(-50%)',
            top: '-5px',
          }}
        />
      ))}

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '15px' }}>📦</span>
        <div>
          <div style={{
            fontSize: '12px', color: '#4caf50', fontWeight: 700,
            letterSpacing: '0.5px', textTransform: 'uppercase',
          }}>
            余剰 ({label})
          </div>
          <div style={{
            fontSize: '12px', fontWeight: 700, color: '#c8e8a0',
            overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px',
          }}>
            {itemName}
          </div>
        </div>
      </div>

      <div style={{
        background: 'rgba(76,175,80,0.15)',
        border: '1px solid rgba(76,175,80,0.4)',
        borderRadius: '4px',
        padding: '3px 8px',
        textAlign: 'center',
        color: '#4caf50',
        fontWeight: 700,
        fontSize: '13px',
      }}>
        +{formatRate(d.surplusPerMinute)}/min
      </div>
    </div>
  );
});

LineSurplusNode.displayName = 'LineSurplusNode';
export default LineSurplusNode;
