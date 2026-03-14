import { useEffect, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import type { NodeTypes, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CalculationNode } from '../../types/calculation.types';
import { buildFlowGraph } from '../../domain/graphBuilder';
import type { MergeGroupConfig, MergeGroupMember } from '../../domain/graphBuilder';
import ItemNode from './ItemNode';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';

const nodeTypes: NodeTypes = { itemNode: ItemNode };

const POSITIONS_PREFIX = 'sfp:pos:';
const MERGEGROUPS_PREFIX = 'sfp:mg2:'; // new key avoids conflict with old string[][] format

// ── Helpers ──────────────────────────────────────────────────────────────────

function genId(): string {
  return Math.random().toString(36).slice(2, 9);
}

function loadPositions(planId: string | null): Map<string, { x: number; y: number }> {
  if (!planId) return new Map();
  try {
    const s = localStorage.getItem(POSITIONS_PREFIX + planId);
    if (s) return new Map(Object.entries(JSON.parse(s) as Record<string, { x: number; y: number }>));
  } catch { /* ignore */ }
  return new Map();
}

function savePositions(planId: string, positions: Map<string, { x: number; y: number }>) {
  localStorage.setItem(POSITIONS_PREFIX + planId, JSON.stringify(Object.fromEntries(positions)));
}

function loadMergeGroups(planId: string | null): MergeGroupConfig[] {
  if (!planId) return [];
  try {
    const s = localStorage.getItem(MERGEGROUPS_PREFIX + planId);
    if (s) return JSON.parse(s) as MergeGroupConfig[];
  } catch { /* ignore */ }
  return [];
}

function saveMergeGroups(planId: string, groups: MergeGroupConfig[]) {
  localStorage.setItem(MERGEGROUPS_PREFIX + planId, JSON.stringify(groups));
}

// ── Types ────────────────────────────────────────────────────────────────────

interface DependencyFlowProps {
  roots: CalculationNode[];
  planId: string | null;
}

interface MergeMode {
  sourceId: string;
  sourceItemId: string;
}

// ── Styles ───────────────────────────────────────────────────────────────────

const btn: React.CSSProperties = {
  background: '#16213e', border: '1px solid #0f3460', color: '#a0a0b0',
  borderRadius: '6px', padding: '6px 10px', fontSize: '11px',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnActive: React.CSSProperties = {
  ...btn, background: '#0f3460', border: '1px solid #f5a623', color: '#f5a623',
};

const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

// ── Component ────────────────────────────────────────────────────────────────

export default function DependencyFlow({ roots, planId }: DependencyFlowProps) {
  const items = useGameDataStore(s => s.items);
  const language = useSettingsStore(s => s.language);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(false);
  const [edgeType, setEdgeType] = useState<'smoothstep' | 'straight'>('smoothstep');
  const [mergeGroups, setMergeGroups] = useState<MergeGroupConfig[]>(() => loadMergeGroups(planId));
  const [mergeMode, setMergeMode] = useState<MergeMode | null>(null);
  const [splitTarget, setSplitTarget] = useState<string | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(EMPTY_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(EMPTY_EDGES);

  // Refs for stable closure access
  const edgeTypeRef = useRef(edgeType);
  edgeTypeRef.current = edgeType;
  const mergeModeRef = useRef(mergeMode);
  mergeModeRef.current = mergeMode;
  const mergeGroupsRef = useRef(mergeGroups);
  mergeGroupsRef.current = mergeGroups;
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;

  // Reload when planId changes
  useEffect(() => {
    setMergeGroups(loadMergeGroups(planId));
    setMergeMode(null);
    setSplitTarget(null);
  }, [planId]);

  // ── Position persistence ──────────────────────────────────────────────────

  /** Snapshot all current node positions to localStorage before a merge/split. */
  const snapshotPositions = useCallback(() => {
    if (!planId) return;
    const saved = loadPositions(planId);
    nodesRef.current.forEach(n => saved.set(n.id, n.position));
    savePositions(planId, saved);
  }, [planId]);

  // ── Merge/split callbacks ─────────────────────────────────────────────────

  const handleStartMerge = useCallback((nodeId: string, itemId: string) => {
    setMergeMode({ sourceId: nodeId, sourceItemId: itemId });
    setSplitTarget(null);
  }, []);

  const handleCompleteMerge = useCallback((targetId: string) => {
    const mode = mergeModeRef.current;
    if (!mode) return;
    const { sourceId } = mode;

    snapshotPositions();

    setMergeGroups(prev => {
      const groups = prev.map(g => ({ ...g, members: [...g.members] }));

      /**
       * Resolve a node ID to its constituent path-based member IDs.
       *
       * A true merge-group node has ID "mg:<stableId>" where <stableId>
       * matches an existing group's `id` field (no slashes).
       *
       * IMPORTANT: child nodes of a merged group also start with "mg:" —
       * e.g. "mg:abc/iron-ore" — but they are NOT group nodes themselves.
       * We only treat an ID as a group reference if a matching group is found.
       */
      const resolveMembers = (nodeId: string): { groupId: string | null; members: string[] } => {
        if (nodeId.startsWith('mg:')) {
          const stableId = nodeId.slice(3);
          const g = groups.find(g => g.id === stableId);
          if (g) {
            // This IS a known merge-group node
            return { groupId: stableId, members: [...g.members] };
          }
          // Starts with "mg:" but not a known group (e.g. "mg:abc/iron-ore").
          // Fall through and treat it as a regular path-based node ID.
        }
        return { groupId: null, members: [nodeId] };
      };

      const src = resolveMembers(sourceId);
      const tgt = resolveMembers(targetId);

      // Combined unique member list
      const combined = [...new Set([...src.members, ...tgt.members])];

      // Prefer keeping the source group's stable ID so its children paths don't change.
      // If source is not a group, keep target's ID; if neither, create a new one.
      const keepId = src.groupId ?? tgt.groupId ?? genId();

      // Remove the groups being absorbed (find by stable id)
      const absorbed = new Set<string>();
      if (src.groupId) absorbed.add(src.groupId);
      if (tgt.groupId) absorbed.add(tgt.groupId);

      const filtered = groups.filter(g => !absorbed.has(g.id));
      filtered.push({ id: keepId, members: combined });

      if (planId) saveMergeGroups(planId, filtered);
      return filtered;
    });

    setMergeMode(null);
  }, [planId, snapshotPositions]);

  const handleCancelMerge = useCallback(() => setMergeMode(null), []);

  const handleOpenSplit = useCallback((groupId: string) => {
    setSplitTarget(groupId);
    setMergeMode(null);
  }, []);

  /**
   * Remove one path-based member from a merge group.
   * `groupNodeId` is the graph node id like "mg:abc".
   */
  const handleSplitMember = useCallback((groupNodeId: string, pathIdToRemove: string) => {
    snapshotPositions();
    const stableId = groupNodeId.slice(3);
    setMergeGroups(prev => {
      const groups = prev.map(g => ({ ...g, members: [...g.members] }));
      const idx = groups.findIndex(g => g.id === stableId);
      if (idx === -1) return prev;
      groups[idx].members = groups[idx].members.filter(m => m !== pathIdToRemove);
      // Keep group only if 2+ members remain
      const filtered = groups.filter(g => g.members.length >= 2);
      if (planId) saveMergeGroups(planId, filtered);
      return filtered;
    });
  }, [planId, snapshotPositions]);

  /** Dissolve an entire merge group back to individual nodes. */
  const handleSplitAll = useCallback((groupNodeId: string) => {
    snapshotPositions();
    const stableId = groupNodeId.slice(3);
    setMergeGroups(prev => {
      const filtered = prev.filter(g => g.id !== stableId);
      if (planId) saveMergeGroups(planId, filtered);
      return filtered;
    });
    setSplitTarget(null);
  }, [planId, snapshotPositions]);

  // ── Graph rebuild ─────────────────────────────────────────────────────────

  const rebuildGraph = useCallback((
    savedPositions?: Map<string, { x: number; y: number }>,
    currentMergeGroups?: MergeGroupConfig[],
    currentMergeMode?: MergeMode | null,
  ) => {
    if (roots.length === 0) {
      setNodes(EMPTY_NODES);
      setEdges(EMPTY_EDGES);
      return;
    }
    const pos = savedPositions ?? loadPositions(planId);
    const groups = currentMergeGroups ?? mergeGroupsRef.current;
    const mode = currentMergeMode !== undefined ? currentMergeMode : mergeModeRef.current;

    const { nodes: n, edges: e } = buildFlowGraph(roots, {
      savedPositions: pos,
      mergeGroups: groups,
      onStartMerge: handleStartMerge,
      onCompleteMerge: handleCompleteMerge,
      onOpenSplit: handleOpenSplit,
      mergeModeSourceId: mode?.sourceId,
      mergeModeSourceItemId: mode?.sourceItemId,
      edgeType: edgeTypeRef.current,
    });
    setNodes(n);
    setEdges(e);
  }, [roots, planId, handleStartMerge, handleCompleteMerge, handleOpenSplit]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild when roots, planId, or mergeGroups change
  useEffect(() => {
    rebuildGraph(undefined, mergeGroups, mergeModeRef.current);
  }, [roots, planId, mergeGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  // Rebuild when merge mode changes (re-highlights isMergeCandidate)
  useEffect(() => {
    rebuildGraph(undefined, undefined, mergeMode);
  }, [mergeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update edge type only (no full rebuild)
  useEffect(() => {
    setEdges(es => es.map(e => ({ ...e, type: edgeType })));
  }, [edgeType, setEdges]);

  // Save positions for all dragged nodes (handles multi-select)
  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
      if (!planId) return;
      const saved = loadPositions(planId);
      draggedNodes.forEach(n => saved.set(n.id, n.position));
      savePositions(planId, saved);
    },
    [planId]
  );

  const handleResetPositions = useCallback(() => {
    if (planId) localStorage.removeItem(POSITIONS_PREFIX + planId);
    rebuildGraph(new Map());
  }, [rebuildGraph, planId]);

  // ── Split panel data ──────────────────────────────────────────────────────

  const splitNode = splitTarget ? nodes.find(n => n.id === splitTarget) : null;
  const splitMembers: MergeGroupMember[] =
    (splitNode?.data as { mergeGroupMembers?: MergeGroupMember[] })?.mergeGroupMembers ?? [];

  // ── Empty state ───────────────────────────────────────────────────────────

  if (roots.length === 0) {
    return (
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        height: '100%', color: '#a0a0b0', fontSize: '14px',
      }}>
        計算を実行すると依存グラフが表示されます
      </div>
    );
  }

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1100, background: '#1a1a2e' }
    : { width: '100%', height: '100%', position: 'relative' };

  return (
    <div style={containerStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        selectionOnDrag
        panOnDrag={[1, 2]}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: '#1a1a2e' }}
        defaultEdgeOptions={{ animated: false, style: { stroke: '#f5a623', strokeWidth: 2 } }}
      >
        <Background variant={BackgroundVariant.Dots} color="#0f3460" gap={20} size={1} />
        <Controls />

        {/* Merge-mode banner */}
        {mergeMode && (
          <Panel position="top-center">
            <div style={{
              background: 'rgba(245,166,35,0.15)', border: '1px solid #f5a623',
              borderRadius: '8px', padding: '8px 16px', color: '#f5a623',
              fontSize: '13px', display: 'flex', alignItems: 'center', gap: '12px',
            }}>
              <span>統合先ノードをクリックしてください</span>
              <button onClick={handleCancelMerge} style={{ ...btn, color: '#a0a0b0' }}>
                キャンセル
              </button>
            </div>
          </Panel>
        )}

        {/* Top-right controls */}
        <Panel position="top-right">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={() => setSnapToGrid(v => !v)} style={snapToGrid ? btnActive : btn} title="スナップ切り替え">
                📐 スナップ
              </button>
              <button
                onClick={() => setEdgeType(t => t === 'smoothstep' ? 'straight' : 'smoothstep')}
                style={btn} title="エッジ形状切り替え"
              >
                {edgeType === 'smoothstep' ? '〰️ 曲線' : '➖ 直線'}
              </button>
            </div>
            <div style={{ display: 'flex', gap: '6px' }}>
              <button onClick={handleResetPositions} style={btn} title="配置をリセット">
                🔄 配置リセット
              </button>
              <button onClick={() => setIsFullscreen(f => !f)} style={btn}>
                {isFullscreen ? '⤓ 縮小' : '⤢ 最大化'}
              </button>
            </div>
          </div>
        </Panel>
      </ReactFlow>

      {/* Split panel */}
      {splitTarget && splitNode && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 20,
            background: '#16213e', border: '1px solid #0f3460',
            borderRadius: '10px', padding: '20px', minWidth: '320px', maxWidth: '420px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#ce93d8', fontWeight: 700, fontSize: '14px' }}>
              分割: {(() => {
                const d = splitNode.data as { itemId: string };
                const item = items[d.itemId];
                return item ? (language === 'ja' ? item.nameJa : item.name) : d.itemId;
              })()}
            </div>
            <button onClick={() => setSplitTarget(null)} style={{ ...btn, padding: '4px 8px' }}>✕</button>
          </div>

          <div style={{ color: '#a0a0b0', fontSize: '11px', marginBottom: '10px' }}>
            各ノードを「分割」すると、独立したノードとして表示されます。
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
            {splitMembers.map((member, i) => (
              <div key={`${member.nodeId}-${i}`} style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                background: '#0f3460', borderRadius: '6px', padding: '8px 12px',
              }}>
                <div>
                  <div style={{ color: '#f5a623', fontSize: '13px', fontWeight: 600 }}>
                    {formatRate(member.amount)}/min
                  </div>
                  <div style={{ color: '#a0a0b0', fontSize: '10px', marginTop: '2px' }}>
                    ×{Math.ceil(member.machineCountExact)} 台
                  </div>
                </div>
                {splitMembers.length > 1 && (
                  <button
                    onClick={() => handleSplitMember(splitTarget, member.nodeId)}
                    style={{
                      background: 'rgba(244,67,54,0.15)', border: '1px solid rgba(244,67,54,0.4)',
                      color: '#ef5350', borderRadius: '4px', padding: '4px 10px',
                      fontSize: '11px', cursor: 'pointer',
                    }}
                  >
                    分割
                  </button>
                )}
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => handleSplitAll(splitTarget)}
              style={{
                flex: 1, background: 'rgba(244,67,54,0.15)',
                border: '1px solid rgba(244,67,54,0.4)', color: '#ef5350',
                borderRadius: '6px', padding: '8px', fontSize: '12px',
                cursor: 'pointer', fontWeight: 600,
              }}
            >
              すべて分割
            </button>
            <button onClick={() => setSplitTarget(null)} style={{ ...btn, flex: 1, textAlign: 'center' }}>
              閉じる
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
