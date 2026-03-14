import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';
import type { SupplyLink } from '../../domain/graphBuilder';

interface ItemNodeData {
  itemId: string;
  requiredPerMinute: number;
  machineCount: number;
  machineCountExact: number;
  recipeId?: string;
  isRawResource: boolean;
  overclockRate: number;
  isRoot?: boolean;
  isMerged?: boolean;
  canMerge?: boolean;
  isMergeCandidate?: boolean;
  mergeGroupId?: string;
  suppliedTo: SupplyLink[];
  receivedFrom: SupplyLink[];
  onStartMerge?: () => void;
  onCompleteMerge?: () => void;
  onOpenSplit?: () => void;
  [key: string]: unknown;
}

const categoryEmoji: Record<string, string> = {
  ore: '⛏️', fluid: '💧', ingot: '🔩', standard_part: '🔧', electronic: '⚡',
  industrial: '⚙️', communication: '💻', petroleum: '🧴', fuel: '🔥',
  mineral: '🪨', advanced: '🧪', nuclear: '☢️', space_elevator: '🚀',
  equipment: '🛡️', special: '✨',
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

  const getName = (id: string) => {
    const it = items[id];
    return it ? (language === 'ja' ? it.nameJa : it.name) : id;
  };

  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : nodeData.itemId;
  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : '';
  const emoji = item ? (categoryEmoji[item.category] || '📦') : '📦';

  const isRoot = nodeData.isRoot ?? false;
  const isRaw = nodeData.isRawResource;
  const isMerged = nodeData.isMerged ?? false;
  const canMerge = nodeData.canMerge ?? false;
  const isMergeCandidate = nodeData.isMergeCandidate ?? false;

  const suppliedTo: SupplyLink[] = nodeData.suppliedTo ?? [];
  const receivedFrom: SupplyLink[] = nodeData.receivedFrom ?? [];

  const bgColor = isMergeCandidate
    ? '#1a2e3a'
    : isRoot ? '#0d2444' : isRaw ? '#1a3a1a' : '#0f3460';
  const borderColor = isMergeCandidate
    ? '#f5a623'
    : isRoot ? '#64b5f6' : isRaw ? '#4caf50' : '#1a4a8a';
  const borderWidth = (isRoot || isMergeCandidate) ? 3 : 2;
  const nameColor = isRoot ? '#64b5f6' : isRaw ? '#4caf50' : '#f5a623';
  const glowColor = isMergeCandidate
    ? '#f5a62340'
    : isRoot ? '#64b5f640' : isRaw ? '#4caf5030' : 'transparent';

  // Divider style
  const divider: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '6px 0 4px',
  };

  return (
    <div
      style={{
        background: bgColor,
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '200px',
        maxWidth: '240px',
        boxShadow: `0 0 12px ${glowColor}`,
        fontSize: '12px',
        color: '#e0e0e0',
        position: 'relative',
      }}
    >
      <Handle
        type="target"
        position={Position.Top}
        style={{ background: borderColor, width: '8px', height: '8px' }}
      />

      {/* Badge row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' }}>
        {isRoot && (
          <span style={{
            fontSize: '9px', color: '#64b5f6',
            background: 'rgba(100,181,246,0.15)', border: '1px solid rgba(100,181,246,0.3)',
            borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
          }}>TARGET</span>
        )}
        {isMerged && (
          <span style={{
            fontSize: '9px', color: '#ce93d8',
            background: 'rgba(206,147,216,0.15)', border: '1px solid rgba(206,147,216,0.3)',
            borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
          }}>統合</span>
        )}
        {isMergeCandidate && (
          <span style={{
            fontSize: '9px', color: '#f5a623',
            background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)',
            borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
          }}>統合可能</span>
        )}

        {/* Action buttons — pushed to the right */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: '4px' }}>
          {/* Merge-candidate: "← 統合" */}
          {isMergeCandidate && nodeData.onCompleteMerge && (
            <button
              onClick={e => { e.stopPropagation(); nodeData.onCompleteMerge!(); }}
              onMouseDown={e => e.stopPropagation()}
              style={{
                background: 'rgba(245,166,35,0.2)', border: '1px solid rgba(245,166,35,0.6)',
                color: '#f5a623', borderRadius: '4px', padding: '1px 7px',
                fontSize: '9px', cursor: 'pointer', fontWeight: 700,
              }}
            >
              ← 統合
            </button>
          )}
          {/* Merged: "分割" */}
          {isMerged && nodeData.onOpenSplit && (
            <button
              onClick={e => { e.stopPropagation(); nodeData.onOpenSplit!(); }}
              onMouseDown={e => e.stopPropagation()}
              style={{
                background: 'rgba(206,147,216,0.2)', border: '1px solid rgba(206,147,216,0.5)',
                color: '#ce93d8', borderRadius: '4px', padding: '1px 7px',
                fontSize: '9px', cursor: 'pointer', fontWeight: 700,
              }}
            >
              分割
            </button>
          )}
          {/* Can merge (merged or non-merged): "統合" — adds more nodes to the group */}
          {canMerge && !isMergeCandidate && nodeData.onStartMerge && (
            <button
              onClick={e => { e.stopPropagation(); nodeData.onStartMerge!(); }}
              onMouseDown={e => e.stopPropagation()}
              style={{
                background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)',
                color: '#f5a623', borderRadius: '4px', padding: '1px 7px',
                fontSize: '9px', cursor: 'pointer', fontWeight: 700,
              }}
            >
              統合
            </button>
          )}
        </div>
      </div>

      {/* Item name row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
        <span style={{ fontSize: '16px' }}>{emoji}</span>
        <span style={{
          fontWeight: 700, fontSize: '13px', color: nameColor,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {itemName}
        </span>
      </div>

      {/* Rate + machine count */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '8px' }}>
        <div style={{
          background: isRoot ? 'rgba(100,181,246,0.15)' : 'rgba(245,166,35,0.15)',
          border: `1px solid ${isRoot ? 'rgba(100,181,246,0.3)' : 'rgba(245,166,35,0.3)'}`,
          borderRadius: '4px', padding: '2px 8px',
          color: isRoot ? '#64b5f6' : '#f5a623',
          fontSize: '12px', fontWeight: 600,
        }}>
          {formatRate(nodeData.requiredPerMinute)}/min
        </div>

        {!isRaw && nodeData.machineCount > 0 && (
          <div style={{
            background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
            borderRadius: '4px', padding: '2px 8px',
            color: '#4caf50', fontSize: '11px', fontWeight: 600,
          }}>
            ×{nodeData.machineCount}
          </div>
        )}
      </div>

      {machineName && !isRaw && (
        <div style={{ color: '#a0a0b0', fontSize: '10px', marginTop: '4px' }}>{machineName}</div>
      )}
      {isRaw && (
        <div style={{ color: '#4caf50', fontSize: '10px', marginTop: '4px' }}>Raw Resource</div>
      )}

      {/* Supply links: receivedFrom (依存元 = what feeds into this node) */}
      {receivedFrom.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ fontSize: '10px' }}>
            <div style={{ color: '#6ea8d8', marginBottom: '2px', fontWeight: 600 }}>← 素材</div>
            {receivedFrom.length === 1 ? (
              <div style={{ color: '#a0c8e8' }}>
                {getName(receivedFrom[0].itemId)}: {formatRate(receivedFrom[0].amount)}/min
              </div>
            ) : (
              receivedFrom.map(r => (
                <div key={r.nodeId} style={{ color: '#a0c8e8', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                    {getName(r.itemId)}
                  </span>
                  <span style={{ color: '#6ea8d8', fontWeight: 600, marginLeft: '4px', flexShrink: 0 }}>
                    {formatRate(r.amount)}/min
                  </span>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Supply links: suppliedTo (依存先 = where this node sends output) */}
      {suppliedTo.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ fontSize: '10px' }}>
            <div style={{ color: '#a8c86e', marginBottom: '2px', fontWeight: 600 }}>→ 供給先</div>
            {suppliedTo.length === 1 ? (
              <div style={{ color: '#c8e8a0' }}>
                {getName(suppliedTo[0].itemId)}: {formatRate(suppliedTo[0].amount)}/min
              </div>
            ) : (
              suppliedTo.map(s => (
                <div key={s.nodeId} style={{ color: '#c8e8a0', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '130px' }}>
                    {getName(s.itemId)}
                  </span>
                  <span style={{ color: '#a8c86e', fontWeight: 600, marginLeft: '4px', flexShrink: 0 }}>
                    {formatRate(s.amount)}/min
                  </span>
                </div>
              ))
            )}
          </div>
        </>
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
