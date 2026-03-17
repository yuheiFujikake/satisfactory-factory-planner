import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';
import type { SupplyLink } from '../../domain/graphBuilder';

/** ItemNode のデータ型 */
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
  isCollapsed?: boolean;
  /** このノードへの入力元リンク（受け取る素材） */
  suppliedTo: SupplyLink[];
  /** このノードからの出力先リンク（供給する素材） */
  receivedFrom: SupplyLink[];
  onStartMerge?: () => void;
  onCompleteMerge?: () => void;
  onOpenSplit?: () => void;
  [key: string]: unknown;
}

/** カテゴリ → 絵文字のマッピング */
const categoryEmoji: Record<string, string> = {
  ore: '⛏️', fluid: '💧', ingot: '🔩', standard_part: '🔧', electronic: '⚡',
  industrial: '⚙️', communication: '💻', petroleum: '🧴', fuel: '🔥',
  mineral: '🪨', advanced: '🧪', nuclear: '☢️', space_elevator: '🚀',
  equipment: '🛡️', special: '✨',
};

/**
 * 依存グラフ上でアイテムの生産情報を表示するノードコンポーネント。
 *
 * アイテム名・生産量・マシン名・台数・入出力リンクを表示する。
 * 統合・統合候補・折りたたみ状態に応じてビジュアルを変化させる。
 * `React.memo` でラップして不要な再レンダリングを防ぐ。
 */
const ItemNode = memo(({ data, selected }: NodeProps) => {
  const nodeData = data as ItemNodeData;
  const items = useGameDataStore(s => s.items);
  const recipes = useGameDataStore(s => s.recipes);
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const item = items[nodeData.itemId];
  const recipe = nodeData.recipeId ? recipes[nodeData.recipeId] : undefined;
  const machine = recipe ? machines[recipe.machineId] : undefined;

  /** アイテム ID から表示名を取得する */
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
  const isCollapsed = nodeData.isCollapsed ?? false;

  const suppliedTo: SupplyLink[] = nodeData.suppliedTo ?? [];
  const receivedFrom: SupplyLink[] = nodeData.receivedFrom ?? [];

  // ノード種別ごとのベースカラー
  const bgColor = isMergeCandidate
    ? '#1a2e3a'
    : isRoot ? '#0d2444' : isRaw ? '#1a3a1a' : '#0f3460';
  const baseColor = isMergeCandidate
    ? '#f5a623'
    : isRoot ? '#64b5f6' : isRaw ? '#4caf50' : '#1a4a8a';
  const nameColor = isRoot ? '#64b5f6' : isRaw ? '#4caf50' : '#f5a623';

  // 選択状態はベースのボーダー・グローを上書きする
  const borderColor = selected ? '#00e5ff' : baseColor;
  const boxShadow = selected
    ? '0 0 0 2px rgba(0,229,255,0.4), 0 0 20px rgba(0,229,255,0.25)'
    : isMergeCandidate ? '0 0 12px #f5a62340'
    : isRoot ? '0 0 12px #64b5f640'
    : isRaw ? '0 0 10px #4caf5030'
    : 'none';

  const divider: React.CSSProperties = {
    borderTop: '1px solid rgba(255,255,255,0.08)',
    margin: '5px 0 4px',
  };

  const rowStyle: React.CSSProperties = {
    display: 'flex', justifyContent: 'space-between',
    fontSize: '10px', marginBottom: '1px',
  };

  return (
    <div
      style={{
        background: bgColor,
        border: `2px solid ${borderColor}`,
        borderRadius: '8px',
        padding: '10px 12px',
        minWidth: '200px',
        maxWidth: '240px',
        boxShadow,
        fontSize: '12px',
        color: '#e0e0e0',
        position: 'relative',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}
    >
      <Handle
        type="target"
        position={Position.Bottom}
        style={{ background: borderColor, width: '8px', height: '8px' }}
      />

      {/* ── アイテム名セクション ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '5px' }}>
        <span style={{ fontSize: '16px', flexShrink: 0 }}>{emoji}</span>
        <span style={{
          fontWeight: 700, fontSize: '13px', color: nameColor,
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {itemName}
        </span>
      </div>

      {/* ── ラベルセクション（統合・統合可能・折りたたみ中） ── */}
      {(isMerged || canMerge || isMergeCandidate || isCollapsed) && (
        <div style={{ display: 'flex', gap: '4px', marginBottom: '5px', flexWrap: 'wrap' }}>
          {isMerged && (
            <span style={{
              fontSize: '9px', color: '#ce93d8',
              background: 'rgba(206,147,216,0.15)', border: '1px solid rgba(206,147,216,0.3)',
              borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
            }}>統合</span>
          )}
          {(canMerge || isMergeCandidate) && (
            <span style={{
              fontSize: '9px', color: '#f5a623',
              background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.4)',
              borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
            }}>統合可能</span>
          )}
          {isCollapsed && (
            <span style={{
              fontSize: '9px', color: '#64b5f6',
              background: 'rgba(100,181,246,0.15)', border: '1px solid rgba(100,181,246,0.3)',
              borderRadius: '4px', padding: '1px 6px', fontWeight: 700,
            }}>▶ 折りたたみ中</span>
          )}
        </div>
      )}

      {/* ── 生産量セクション ── */}
      <div style={{
        background: isRoot ? 'rgba(100,181,246,0.15)' : 'rgba(245,166,35,0.12)',
        border: `1px solid ${isRoot ? 'rgba(100,181,246,0.3)' : 'rgba(245,166,35,0.25)'}`,
        borderRadius: '4px', padding: '3px 8px', marginBottom: '4px',
        color: isRoot ? '#64b5f6' : '#f5a623',
        fontSize: '12px', fontWeight: 600, textAlign: 'center',
      }}>
        {formatRate(nodeData.requiredPerMinute)}/分
      </div>

      {/* ── マシンセクション ── */}
      {!isRaw && machineName && (
        <>
          <div style={divider} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
            <span style={{ fontSize: '11px', flexShrink: 0 }}>⚙️</span>
            <span style={{
              color: '#a0a0b0', fontSize: '10px', flex: 1,
              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
            }}>
              {machineName}
            </span>
            {nodeData.machineCount > 0 && (
              <span style={{
                background: 'rgba(76,175,80,0.15)', border: '1px solid rgba(76,175,80,0.3)',
                borderRadius: '4px', padding: '1px 6px',
                color: '#4caf50', fontSize: '10px', fontWeight: 600, flexShrink: 0,
              }}>
                ×{nodeData.machineCount}台
              </span>
            )}
          </div>
        </>
      )}
      {isRaw && (
        <div style={{ color: '#4caf50', fontSize: '10px', marginTop: '2px' }}>採掘資源</div>
      )}

      {/* ── 入力セクション ── */}
      {receivedFrom.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ fontSize: '10px' }}>
            <div style={{
              color: '#6ea8d8', fontWeight: 700, fontSize: '9px',
              letterSpacing: '0.6px', marginBottom: '3px',
            }}>
              入力
            </div>
            {receivedFrom.map(r => (
              <div key={r.nodeId} style={rowStyle}>
                <span style={{ color: '#a0c8e8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '126px' }}>
                  {getName(r.itemId)}
                </span>
                <span style={{ color: '#6ea8d8', fontWeight: 600, marginLeft: '4px', flexShrink: 0 }}>
                  {formatRate(r.amount)}/分
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── 出力セクション ── */}
      {suppliedTo.length > 0 && (
        <>
          <div style={divider} />
          <div style={{ fontSize: '10px' }}>
            <div style={{
              color: '#a8c86e', fontWeight: 700, fontSize: '9px',
              letterSpacing: '0.6px', marginBottom: '3px',
            }}>
              出力
            </div>
            {suppliedTo.map(s => (
              <div key={s.nodeId} style={rowStyle}>
                <span style={{ color: '#c8e8a0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '126px' }}>
                  {getName(s.itemId)}
                </span>
                <span style={{ color: '#a8c86e', fontWeight: 600, marginLeft: '4px', flexShrink: 0 }}>
                  {formatRate(s.amount)}/分
                </span>
              </div>
            ))}
          </div>
        </>
      )}

      <Handle
        type="source"
        position={Position.Top}
        style={{ background: borderColor, width: '8px', height: '8px' }}
      />
    </div>
  );
});

ItemNode.displayName = 'ItemNode';

export default ItemNode;
