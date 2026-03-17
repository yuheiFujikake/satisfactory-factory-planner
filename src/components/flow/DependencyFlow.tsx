import { useEffect, useCallback, useState, useRef } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  PanOnScrollMode,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react';
import type { NodeTypes, Node, Edge } from '@xyflow/react';
import { toPng, toJpeg, toSvg } from 'html-to-image';
import '@xyflow/react/dist/style.css';
import type { CalculationNode } from '../../types/calculation.types';
import { buildFlowGraph } from '../../domain/graphBuilder';
import type { MergeGroupConfig, MergeGroupMember } from '../../domain/graphBuilder';
import ItemNode from './ItemNode';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { formatRate } from '../../utils/math';

const nodeTypes: NodeTypes = { itemNode: ItemNode };

/** ノード位置保存の localStorage キープレフィックス */
const POSITIONS_PREFIX = 'sfp:pos:';
/** マージグループ保存の localStorage キープレフィックス（旧 string[][] 形式との衝突を避けるため新キー） */
const MERGEGROUPS_PREFIX = 'sfp:mg2:';

// ── ヘルパー関数 ──────────────────────────────────────────────────────────────

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

// ── mergeWithDescendants ─────────────────────────────────────────────────────
//
// parentA と parentB を統合する際、同じ itemId を持つ子ノードも自動的に統合し、
// 依存サブツリー全体に対して再帰的に処理する。
// 分割（Split）はこの関数を使用しないため、分割はカスケードしない。

function mergeWithDescendants(
  srcId: string,
  tgtId: string,
  currentEdges: Edge[],
  currentNodes: Node[],
  groups: MergeGroupConfig[]
): MergeGroupConfig[] {
  const workGroups = groups.map(g => ({ ...g, members: [...g.members] }));

  const resolveMembers = (nodeId: string): { groupId: string | null; members: string[] } => {
    if (nodeId.startsWith('mg:')) {
      const stableId = nodeId.slice(3);
      const g = workGroups.find(g => g.id === stableId);
      if (g) return { groupId: stableId, members: [...g.members] };
    }
    return { groupId: null, members: [nodeId] };
  };

  const getItemId = (nodeId: string): string | null => {
    const node = currentNodes.find(n => n.id === nodeId);
    return node ? (node.data as { itemId: string }).itemId : null;
  };

  // ノードの子 = edge.target === nodeId のエッジ（素材 → 消費者の方向）
  const getChildren = (nodeId: string): string[] =>
    currentEdges.filter(e => e.target === nodeId).map(e => e.source);

  const visited = new Set<string>();

  function mergePair(aId: string, bId: string) {
    if (aId === bId) return;
    const key = [aId, bId].sort().join('||');
    if (visited.has(key)) return;
    visited.add(key);

    const srcMem = resolveMembers(aId);
    const tgtMem = resolveMembers(bId);
    const combined = [...new Set([...srcMem.members, ...tgtMem.members])];
    const keepId = srcMem.groupId ?? tgtMem.groupId ?? genId();

    const absorbed = new Set([srcMem.groupId, tgtMem.groupId].filter(Boolean) as string[]);
    const filtered = workGroups.filter(g => !absorbed.has(g.id));
    workGroups.splice(0, workGroups.length, ...filtered);
    workGroups.push({ id: keepId, members: combined });

    // 同じ itemId を持つ子ノードを再帰的に統合する
    const childrenA = getChildren(aId);
    const childrenB = getChildren(bId);

    const bByItem = new Map<string, string>();
    childrenB.forEach(id => {
      const itemId = getItemId(id);
      if (itemId) bByItem.set(itemId, id);
    });

    childrenA.forEach(aChild => {
      const itemId = getItemId(aChild);
      if (!itemId) return;
      const bChild = bByItem.get(itemId);
      if (bChild && aChild !== bChild) mergePair(aChild, bChild);
    });
  }

  mergePair(srcId, tgtId);
  return workGroups;
}

// ── getDescendants ───────────────────────────────────────────────────────────
//
// 指定ノードの全子孫ノード ID を返す。
// エッジを下方向（edge.target = 消費者、edge.source = 素材）に辿る。

function getDescendants(nodeId: string, edges: Edge[]): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    edges.filter(e => e.target === current).forEach(e => {
      if (!visited.has(e.source)) {
        visited.add(e.source);
        result.push(e.source);
        queue.push(e.source);
      }
    });
  }
  return result;
}

// ── 型定義 ────────────────────────────────────────────────────────────────────

interface DependencyFlowProps {
  roots: CalculationNode[];
  planId: string | null;
}

interface MergeMode {
  sourceId: string;
  sourceItemId: string;
}

interface NodeOpsData {
  itemId: string;
  canMerge: boolean;
  isMerged: boolean;
  isMergeCandidate: boolean;
  requiredPerMinute: number;
  machineCount: number;
  onStartMerge?: () => void;
  onCompleteMerge?: () => void;
  onOpenSplit?: () => void;
}

// ── スタイル定数 ──────────────────────────────────────────────────────────────

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

// ── コンポーネント ────────────────────────────────────────────────────────────

/**
 * 依存グラフを ReactFlow で描画するコンポーネント。
 *
 * ノードのドラッグ・統合・分割・折りたたみ・PNG/SVG/JSON エクスポートをサポートする。
 * ノード位置とマージグループ設定は localStorage に永続化される。
 */
export default function DependencyFlow({ roots, planId }: DependencyFlowProps) {
  const items = useGameDataStore(s => s.items);
  const language = useSettingsStore(s => s.language);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [snapToGrid, setSnapToGrid] = useState(true); // snap enabled by default
  const [edgeType, setEdgeType] = useState<'smoothstep' | 'straight'>('smoothstep');
  const [mergeGroups, setMergeGroups] = useState<MergeGroupConfig[]>(() => loadMergeGroups(planId));
  const [mergeMode, setMergeMode] = useState<MergeMode | null>(null);
  const [splitTarget, setSplitTarget] = useState<string | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showExportMenu, setShowExportMenu] = useState(false);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(EMPTY_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(EMPTY_EDGES);

  const containerRef = useRef<HTMLDivElement>(null);

  // クロージャ内で最新値を安定して参照するための Ref
  const edgeTypeRef = useRef(edgeType);
  edgeTypeRef.current = edgeType;
  const mergeModeRef = useRef(mergeMode);
  mergeModeRef.current = mergeMode;
  const mergeGroupsRef = useRef(mergeGroups);
  mergeGroupsRef.current = mergeGroups;
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;
  const edgesRef = useRef<Edge[]>([]);
  edgesRef.current = edges;
  const collapsedNodesRef = useRef<Set<string>>(new Set());
  collapsedNodesRef.current = collapsedNodes;
  // 折りたたみ時の親ノード位置を記録する。展開時に移動量（デルタ）を計算するために使用する。
  const collapsePositionsRef = useRef<Map<string, { x: number; y: number }>>(new Map());

  // planId が変わったとき（プラン切り替え時）に状態をリセットする
  useEffect(() => {
    setMergeGroups(loadMergeGroups(planId));
    setMergeMode(null);
    setSplitTarget(null);
    setSelectedNodeId(null);
    setCollapsedNodes(new Set());
  }, [planId]);

  // ── ノード位置の永続化 ────────────────────────────────────────────────────────

  /** 統合・分割前に現在の全ノード位置を localStorage にスナップショットする */
  const snapshotPositions = useCallback(() => {
    if (!planId) return;
    const saved = loadPositions(planId);
    nodesRef.current.forEach(n => saved.set(n.id, n.position));
    savePositions(planId, saved);
  }, [planId]);

  // ── 統合・分割コールバック ─────────────────────────────────────────────────

  const handleStartMerge = useCallback((nodeId: string, itemId: string) => {
    setMergeMode({ sourceId: nodeId, sourceItemId: itemId });
    setSplitTarget(null);
    setSelectedNodeId(null);
  }, []);

  const handleCompleteMerge = useCallback((targetId: string) => {
    const mode = mergeModeRef.current;
    if (!mode) return;
    const { sourceId } = mode;

    snapshotPositions();

    setMergeGroups(prev => {
      // mergeWithDescendants はサブツリー全体に統合をカスケードする：
      // 親ノードを統合すると、同じ itemId を持つ子ノードも自動的に統合される（再帰的に）。
      const newGroups = mergeWithDescendants(
        sourceId,
        targetId,
        edgesRef.current,
        nodesRef.current,
        prev
      );
      if (planId) saveMergeGroups(planId, newGroups);
      return newGroups;
    });

    setMergeMode(null);
    setSelectedNodeId(null);
  }, [planId, snapshotPositions]);

  const handleCancelMerge = useCallback(() => {
    setMergeMode(null);
    setSelectedNodeId(null);
  }, []);

  const handleOpenSplit = useCallback((groupId: string) => {
    setSplitTarget(groupId);
    setMergeMode(null);
    setSelectedNodeId(null);
  }, []);

  /**
   * マージグループから特定のパスメンバーを除外する。
   * `groupNodeId` は "mg:abc" 形式のグラフノード ID。
   */
  const handleSplitMember = useCallback((groupNodeId: string, pathIdToRemove: string) => {
    snapshotPositions();
    const stableId = groupNodeId.slice(3);
    setMergeGroups(prev => {
      const groups = prev.map(g => ({ ...g, members: [...g.members] }));
      const idx = groups.findIndex(g => g.id === stableId);
      if (idx === -1) return prev;
      groups[idx].members = groups[idx].members.filter(m => m !== pathIdToRemove);
      // メンバーが2件以上残る場合のみグループを保持する
      const filtered = groups.filter(g => g.members.length >= 2);
      if (planId) saveMergeGroups(planId, filtered);
      return filtered;
    });
  }, [planId, snapshotPositions]);

  /** マージグループ全体を解除して個別ノードに戻す */
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

  // ── グラフ再構築 ──────────────────────────────────────────────────────────

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

    // 新グラフに折りたたみ状態を適用する
    const collapsed = collapsedNodesRef.current;
    if (collapsed.size > 0) {
      const hiddenIds = new Set<string>();
      collapsed.forEach(id => getDescendants(id, e).forEach(d => hiddenIds.add(d)));
      setNodes(n.map(node => ({
        ...node,
        hidden: hiddenIds.has(node.id),
        data: { ...(node.data as Record<string, unknown>), isCollapsed: collapsed.has(node.id) },
      })));
      setEdges(e.map(edge => ({
        ...edge,
        hidden: hiddenIds.has(edge.source) || hiddenIds.has(edge.target),
      })));
    } else {
      setNodes(n);
      setEdges(e);
    }
  }, [roots, planId, handleStartMerge, handleCompleteMerge, handleOpenSplit]); // eslint-disable-line react-hooks/exhaustive-deps

  // roots・planId・mergeGroups が変化したときにグラフを再構築する
  useEffect(() => {
    rebuildGraph(undefined, mergeGroups, mergeModeRef.current);
  }, [roots, planId, mergeGroups]); // eslint-disable-line react-hooks/exhaustive-deps

  // マージモードが変化したときに再構築（isMergeCandidate のハイライトを更新）
  useEffect(() => {
    rebuildGraph(undefined, undefined, mergeMode);
  }, [mergeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  // エッジ形状のみ更新（グラフ全体の再構築なし）
  useEffect(() => {
    setEdges(es => es.map(e => ({ ...e, type: edgeType })));
  }, [edgeType, setEdges]);

  // 折りたたみトグル時に表示/非表示を更新する（グラフ全体の再構築なし）
  useEffect(() => {
    const collapsed = collapsedNodes;
    const currentEdges = edgesRef.current;
    const hiddenIds = new Set<string>();
    collapsed.forEach(id => getDescendants(id, currentEdges).forEach(d => hiddenIds.add(d)));
    setNodes(prev => prev.map(n => ({
      ...n,
      hidden: hiddenIds.has(n.id),
      data: { ...(n.data as Record<string, unknown>), isCollapsed: collapsed.has(n.id) },
    })));
    setEdges(prev => prev.map(e => ({
      ...e,
      hidden: hiddenIds.has(e.source) || hiddenIds.has(e.target),
    })));
  }, [collapsedNodes, setNodes, setEdges]);

  // ドラッグ終了時に全選択ノードの位置を保存する（マルチ選択に対応）
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

  // ── 折りたたみ / 展開 ──────────────────────────────────────────────────────

  const handleToggleCollapse = useCallback((nodeId: string) => {
    const isCurrentlyCollapsed = collapsedNodesRef.current.has(nodeId);

    if (isCurrentlyCollapsed) {
      // 展開: 折りたたみ中に親が移動した分のデルタを子孫ノードに適用する
      const collapsePos = collapsePositionsRef.current.get(nodeId);
      const currentNode = nodesRef.current.find(n => n.id === nodeId);

      if (collapsePos && currentNode) {
        const dx = currentNode.position.x - collapsePos.x;
        const dy = currentNode.position.y - collapsePos.y;

        if (dx !== 0 || dy !== 0) {
          const descendants = getDescendants(nodeId, edgesRef.current);

          // ReactFlow ノードの位置を更新する
          setNodes(prev => prev.map(n => {
            if (!descendants.includes(n.id)) return n;
            return { ...n, position: { x: n.position.x + dx, y: n.position.y + dy } };
          }));

          // 更新した位置を localStorage に永続化する
          if (planId) {
            const saved = loadPositions(planId);
            descendants.forEach(descId => {
              const existingPos = saved.get(descId);
              if (existingPos) {
                saved.set(descId, { x: existingPos.x + dx, y: existingPos.y + dy });
              } else {
                const descNode = nodesRef.current.find(n => n.id === descId);
                if (descNode) saved.set(descId, { x: descNode.position.x + dx, y: descNode.position.y + dy });
              }
            });
            savePositions(planId, saved);
          }
        }
      }

      collapsePositionsRef.current.delete(nodeId);
      setCollapsedNodes(prev => { const next = new Set(prev); next.delete(nodeId); return next; });
    } else {
      // 折りたたみ: 現在の親ノード位置を記録する
      const currentNode = nodesRef.current.find(n => n.id === nodeId);
      if (currentNode) collapsePositionsRef.current.set(nodeId, { ...currentNode.position });
      setCollapsedNodes(prev => { const next = new Set(prev); next.add(nodeId); return next; });
    }
  }, [planId, setNodes]);

  // ── ノードクリック → オペレーションパネル ──────────────────────────────────

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    // Shift+クリック = 複数選択; オペレーションパネルは表示しない
    if (_event.shiftKey) {
      setSelectedNodeId(null);
      return;
    }
    // Alt+クリック = ノードとその全子孫を選択する
    if (_event.altKey) {
      const descendantIds = getDescendants(node.id, edgesRef.current);
      const allIds = new Set([node.id, ...descendantIds]);
      setNodes(nds => nds.map(n => ({ ...n, selected: allIds.has(n.id) })));
      setSelectedNodeId(null);
      setSplitTarget(null);
      setShowExportMenu(false);
      return;
    }
    setSplitTarget(null);
    setShowExportMenu(false);
    setSelectedNodeId(node.id);
  }, [setNodes]);

  // 複数ノードが選択状態になった場合（Shift+ドラッグなど）はオペレーションパネルを閉じる
  useEffect(() => {
    const count = nodes.filter(n => n.selected).length;
    if (count > 1) setSelectedNodeId(null);
  }, [nodes]);

  const handlePaneClick = useCallback(() => {
    setSelectedNodeId(null);
    setShowExportMenu(false);
  }, []);

  // ── エクスポート ──────────────────────────────────────────────────────────

  const handleExport = useCallback(async (format: 'png' | 'jpeg' | 'svg' | 'json') => {
    setShowExportMenu(false);

    if (format === 'json') {
      const graphData = {
        nodes: nodesRef.current.map(n => ({
          id: n.id,
          position: n.position,
          type: n.type,
          data: {
            itemId: (n.data as Record<string, unknown>).itemId,
            requiredPerMinute: (n.data as Record<string, unknown>).requiredPerMinute,
            machineCount: (n.data as Record<string, unknown>).machineCount,
            isRawResource: (n.data as Record<string, unknown>).isRawResource,
            isRoot: (n.data as Record<string, unknown>).isRoot,
            isMerged: (n.data as Record<string, unknown>).isMerged,
            recipeId: (n.data as Record<string, unknown>).recipeId,
          },
        })),
        edges: edgesRef.current.map(e => ({ id: e.id, source: e.source, target: e.target, type: e.type })),
      };
      const json = JSON.stringify(graphData, null, 2);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'factory-graph.json';
      a.click();
      URL.revokeObjectURL(url);
      return;
    }

    if (!containerRef.current) return;
    const viewport = containerRef.current.querySelector('.react-flow__viewport') as HTMLElement;
    if (!viewport) return;

    const currentNodes = nodesRef.current;
    const bounds = getNodesBounds(currentNodes);
    const imageWidth = 1920;
    const imageHeight = 1080;
    const transform = getViewportForBounds(bounds, imageWidth, imageHeight, 0.5, 2, 0.1);

    const styleOverride: Partial<CSSStyleDeclaration> = {
      width: `${imageWidth}px`,
      height: `${imageHeight}px`,
      transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
    };

    try {
      let dataUrl: string;
      if (format === 'png') {
        dataUrl = await toPng(viewport, { backgroundColor: '#1a1a2e', width: imageWidth, height: imageHeight, style: styleOverride });
      } else if (format === 'jpeg') {
        dataUrl = await toJpeg(viewport, { backgroundColor: '#1a1a2e', width: imageWidth, height: imageHeight, style: styleOverride, quality: 0.95 });
      } else {
        dataUrl = await toSvg(viewport, { backgroundColor: '#1a1a2e', width: imageWidth, height: imageHeight, style: styleOverride });
      }
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `factory-graph.${format}`;
      a.click();
    } catch (err) {
      console.error('エクスポートに失敗しました:', err);
    }
  }, []);

  // ── Selected node data ────────────────────────────────────────────────────

  const selectedNode = selectedNodeId ? nodes.find(n => n.id === selectedNodeId) : null;
  const selectedData = selectedNode?.data as NodeOpsData | undefined;

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
    <div style={containerStyle} ref={containerRef}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={handleNodeClick}
        onPaneClick={handlePaneClick}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        selectionOnDrag
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        panOnDrag={[2]}
        panActivationKeyCode="Space"
        panOnScroll
        panOnScrollMode={PanOnScrollMode.Free}
        zoomOnScroll={false}
        zoomActivationKeyCode="Alt"
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
            <div style={{ display: 'flex', gap: '6px', position: 'relative' }}>
              {/* Export button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => setShowExportMenu(v => !v)}
                  style={showExportMenu ? btnActive : btn}
                  title="グラフを出力"
                >
                  📤 出力
                </button>
                {showExportMenu && (
                  <div style={{
                    position: 'absolute', top: '100%', right: 0, marginTop: '4px',
                    background: '#16213e', border: '1px solid #0f3460',
                    borderRadius: '6px', overflow: 'hidden', zIndex: 10,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.4)',
                  }}>
                    {(['png', 'jpeg', 'svg', 'json'] as const).map((fmt, i, arr) => (
                      <button
                        key={fmt}
                        onClick={() => handleExport(fmt)}
                        style={{
                          display: 'block', width: '100%', textAlign: 'left',
                          background: 'transparent', border: 'none', color: '#a0a0b0',
                          padding: '8px 16px', fontSize: '12px', cursor: 'pointer',
                          borderBottom: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#0f3460')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        {fmt.toUpperCase()}
                      </button>
                    ))}
                  </div>
                )}
              </div>
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

      {/* Node operations panel */}
      {selectedData && selectedNode && !splitTarget && (
        <div
          style={{
            position: 'absolute', top: '50%', left: '50%',
            transform: 'translate(-50%, -50%)', zIndex: 20,
            background: '#16213e', border: '1px solid #0f3460',
            borderRadius: '10px', padding: '16px', minWidth: '200px', maxWidth: '260px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}
          onMouseDown={e => e.stopPropagation()}
        >
          <div style={{ marginBottom: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ color: '#a0a0b0', fontWeight: 700, fontSize: '13px' }}>オペレーション</div>
            <button onClick={() => setSelectedNodeId(null)} style={{ ...btn, padding: '2px 6px' }}>✕</button>
          </div>

          {/* Node info */}
          <div style={{ marginBottom: '12px', paddingBottom: '10px', borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ color: '#f5a623', fontWeight: 600, fontSize: '13px' }}>
              {(() => {
                const item = items[selectedData.itemId];
                return item ? (language === 'ja' ? item.nameJa : item.name) : selectedData.itemId;
              })()}
            </div>
            <div style={{ color: '#a0a0b0', fontSize: '11px', marginTop: '2px' }}>
              {formatRate(selectedData.requiredPerMinute)}/min
            </div>
          </div>

          <div style={{ color: '#808090', fontSize: '10px', marginBottom: '8px' }}>利用可能な操作:</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>

            {/* Merge mode: ← 統合 for candidates */}
            {mergeMode && selectedData.isMergeCandidate && selectedData.onCompleteMerge && (
              <button
                onClick={() => { selectedData.onCompleteMerge!(); setSelectedNodeId(null); }}
                style={{
                  background: 'rgba(245,166,35,0.15)', border: '1px solid rgba(245,166,35,0.5)',
                  color: '#f5a623', borderRadius: '6px', padding: '8px 12px',
                  fontSize: '12px', cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                }}
              >
                ← 統合
                <div style={{ fontSize: '10px', color: 'rgba(245,166,35,0.7)', marginTop: '2px', fontWeight: 400 }}>
                  選択中のノードと統合する
                </div>
              </button>
            )}

            {/* 統合: start merge (not in merge mode) */}
            {!mergeMode && selectedData.canMerge && selectedData.onStartMerge && (
              <button
                onClick={() => { selectedData.onStartMerge!(); }}
                style={{
                  background: 'rgba(245,166,35,0.1)', border: '1px solid rgba(245,166,35,0.3)',
                  color: '#f5a623', borderRadius: '6px', padding: '8px 12px',
                  fontSize: '12px', cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                }}
              >
                統合
                <div style={{ fontSize: '10px', color: 'rgba(245,166,35,0.6)', marginTop: '2px', fontWeight: 400 }}>
                  同じアイテムの別ノードと統合する
                </div>
              </button>
            )}

            {/* 分割: open split panel */}
            {selectedData.isMerged && selectedData.onOpenSplit && (
              <button
                onClick={() => { selectedData.onOpenSplit!(); setSelectedNodeId(null); }}
                style={{
                  background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.3)',
                  color: '#ce93d8', borderRadius: '6px', padding: '8px 12px',
                  fontSize: '12px', cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                }}
              >
                分割
                <div style={{ fontSize: '10px', color: 'rgba(206,147,216,0.6)', marginTop: '2px', fontWeight: 400 }}>
                  統合されたノードを分割する
                </div>
              </button>
            )}

            {/* 折りたたみ / 展開 */}
            {!mergeMode && (() => {
              const hasChildren = edges.some(e => e.target === selectedNodeId);
              if (!hasChildren) return null;
              const isCollapsedNode = collapsedNodes.has(selectedNodeId!);
              return (
                <button
                  onClick={() => {
                    handleToggleCollapse(selectedNodeId!);
                    setSelectedNodeId(null);
                  }}
                  style={{
                    background: isCollapsedNode ? 'rgba(100,181,246,0.15)' : 'rgba(100,181,246,0.1)',
                    border: '1px solid rgba(100,181,246,0.3)',
                    color: '#64b5f6', borderRadius: '6px', padding: '8px 12px',
                    fontSize: '12px', cursor: 'pointer', fontWeight: 600, textAlign: 'left',
                  }}
                >
                  {isCollapsedNode ? '▶ 展開' : '▼ 折りたたみ'}
                  <div style={{ fontSize: '10px', color: 'rgba(100,181,246,0.6)', marginTop: '2px', fontWeight: 400 }}>
                    {isCollapsedNode ? '子ノードを再表示する' : '子ノードを非表示にする'}
                  </div>
                </button>
              );
            })()}

            {/* No operations available */}
            {!mergeMode && !selectedData.canMerge && !selectedData.isMerged && !edges.some(e => e.target === selectedNodeId) && (
              <div style={{ color: '#606070', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
                操作はありません
              </div>
            )}
            {mergeMode && !selectedData.isMergeCandidate && (
              <div style={{ color: '#606070', fontSize: '11px', textAlign: 'center', padding: '8px' }}>
                このノードは統合対象外です
              </div>
            )}
          </div>
        </div>
      )}

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
