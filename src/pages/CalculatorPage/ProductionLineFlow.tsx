import { useEffect, useCallback, useState, useRef, useMemo, type CSSProperties } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
  useReactFlow,
  SelectionMode,
  useUpdateNodeInternals,
  MarkerType,
} from '@xyflow/react';
import type { NodeTypes, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CalculationNode } from '../../types/calculation.types';
import { buildProductionLineGraph } from '../../domain/productionLineBuilder';
import type { HandleSpec } from '../../domain/productionLineBuilder';
import LineItemNode from '../../components/flow/LineItemNode';
import LineSurplusNode from '../../components/flow/LineSurplusNode';

const nodeTypes: NodeTypes = {
  lineItemNode: LineItemNode,
  lineSurplusNode: LineSurplusNode,
};

// ── Styles ────────────────────────────────────────────────────────────────────

const btn: React.CSSProperties = {
  background: '#16213e', border: '1px solid #0f3460', color: '#a0a0b0',
  borderRadius: '6px', padding: '6px 10px', fontSize: '12px',
  cursor: 'pointer', whiteSpace: 'nowrap',
};
const btnActive: React.CSSProperties = {
  ...btn, background: '#0f3460', border: '1px solid #f5a623', color: '#f5a623',
};

// ── ContextMenu ───────────────────────────────────────────────────────────────

interface ContextMenuProps {
  nodeId: string;
  x: number;
  y: number;
  nodes: Node[];
  edges: Edge[];
  onClose: () => void;
  onSplit: (itemId: string) => void;
  onMerge: (itemId: string) => void;
  onSelectWithDescendants: (nodeId: string) => void;
}

function ContextMenu({ nodeId, x, y, nodes, edges, onClose, onSplit, onMerge, onSelectWithDescendants }: ContextMenuProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const node = nodes.find(n => n.id === nodeId);
  const d = node?.data as Record<string, unknown> | undefined;
  const canSplit = d?.canSplit as boolean | undefined;
  const isSplit = d?.isSplit as boolean | undefined;
  const itemId = d?.itemId as string | undefined;
  const hasDescendants = edges.some(e => e.target === nodeId) ||
    edges.some(e => e.source === nodeId && e.id.startsWith('e-surplus-'));

  interface MenuItem { label: string; icon: string; action: () => void; danger?: boolean }
  const items: MenuItem[] = [];

  if (canSplit && itemId) {
    items.push({ icon: '✂', label: '分割', action: () => { onSplit(itemId); onClose(); } });
  }
  if (isSplit && itemId) {
    items.push({ icon: '⊕', label: '統合', action: () => { onMerge(itemId); onClose(); } });
  }
  if (hasDescendants) {
    items.push({ icon: '⬦', label: '依存先をすべて選択', action: () => { onSelectWithDescendants(nodeId); onClose(); } });
  }
  if (items.length === 0) {
    items.push({ icon: '', label: '操作なし', action: onClose });
  }

  const [pos, setPos] = useState({ left: x, top: y });
  useEffect(() => {
    const el = menuRef.current;
    if (!el) return;
    const { innerWidth: vw, innerHeight: vh } = window;
    setPos({
      left: Math.min(x, vw - el.offsetWidth - 8),
      top: Math.min(y, vh - el.offsetHeight - 8),
    });
  }, [x, y]);

  const menuStyle: CSSProperties = {
    position: 'fixed', left: pos.left, top: pos.top, zIndex: 9999,
    background: '#1a2236', border: '1px solid #2e3f5c',
    borderRadius: '6px', minWidth: '170px',
    boxShadow: '0 6px 24px rgba(0,0,0,0.7)',
    overflow: 'hidden', fontSize: '13px', color: '#d0d8e8',
    userSelect: 'none',
  };

  return (
    <div ref={menuRef} style={menuStyle} onMouseDown={e => e.stopPropagation()}>
      {items.map((item, i) => {
        const isHovered = hovered === i;
        const rowStyle: CSSProperties = {
          display: 'flex', alignItems: 'center', gap: '10px',
          padding: '8px 14px', cursor: 'pointer',
          background: isHovered ? '#253555' : 'transparent',
          color: item.danger ? '#f44336' : '#d0d8e8',
          borderBottom: i < items.length - 1 ? '1px solid rgba(255,255,255,0.06)' : 'none',
          transition: 'background 0.1s',
        };
        return (
          <div
            key={i}
            style={rowStyle}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            onClick={item.action}
          >
            {item.icon && <span style={{ fontSize: '14px', width: '16px', textAlign: 'center' }}>{item.icon}</span>}
            <span>{item.label}</span>
          </div>
        );
      })}
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

// RF edges are ingredient(source) → product(target).
// Descendants of a product = its ingredients and their ingredients recursively.
function getDescendants(nodeId: string, edgeList: Edge[]): string[] {
  const result: string[] = [];
  const visited = new Set<string>();
  const queue = [nodeId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    // Regular RF edges: ingredient(source) → product(target). Traverse backwards.
    edgeList.filter(e => e.target === current).forEach(e => {
      if (!visited.has(e.source)) {
        visited.add(e.source);
        result.push(e.source);
        queue.push(e.source);
      }
    });
    // Surplus edges: item(source) → surplus:item(target). Traverse forwards.
    edgeList.filter(e => e.source === current && e.id.startsWith('e-surplus-')).forEach(e => {
      if (!visited.has(e.target)) {
        visited.add(e.target);
        result.push(e.target);
        queue.push(e.target);
      }
    });
  }
  return result;
}

// ── ScrollController ──────────────────────────────────────────────────────────

function ScrollController({ containerRef }: { containerRef: React.RefObject<HTMLDivElement | null> }) {
  const { setViewport, getViewport } = useReactFlow();
  const setVpRef = useRef(setViewport);
  const getVpRef = useRef(getViewport);
  setVpRef.current = setViewport;
  getVpRef.current = getViewport;
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const { x, y, zoom } = getVpRef.current();
      if (e.ctrlKey || e.metaKey) {
        const factor = e.deltaY > 0 ? 0.9 : 1.1;
        const newZoom = Math.min(4, Math.max(0.1, zoom * factor));
        const w = el.offsetWidth;
        const h = el.offsetHeight;
        const cx = (w / 2 - x) / zoom;
        const cy = (h / 2 - y) / zoom;
        setVpRef.current({ x: w / 2 - cx * newZoom, y: h / 2 - cy * newZoom, zoom: newZoom });
      } else if (e.shiftKey) {
        setVpRef.current({ x: x - e.deltaY * 0.5, y, zoom });
      } else {
        setVpRef.current({ x, y: y - e.deltaY * 0.5, zoom });
      }
    };
    el.addEventListener('wheel', handler, { passive: false, capture: true });
    return () => el.removeEventListener('wheel', handler, { capture: true });
  }, [containerRef]);
  return null;
}

// ── NodeInternalsUpdater ───────────────────────────────────────────────────────

function NodeInternalsUpdater({
  fnRef,
}: {
  fnRef: React.RefObject<((ids: string[]) => void) | null>;
}) {
  const updateNodeInternals = useUpdateNodeInternals();
  fnRef.current = (ids: string[]) => ids.forEach(id => updateNodeInternals(id));
  return null;
}

// ── Handle reorder helper ─────────────────────────────────────────────────────

const SNAP_GRID = 20;

function snapToGridVal(v: number): number {
  return Math.round(v / SNAP_GRID) * SNAP_GRID;
}

function snapHandlePercent(nodeTopY: number, nodeHeight: number, rawPercent: number): number {
  const absY = nodeTopY + nodeHeight * rawPercent / 100;
  const snapped = snapToGridVal(absY);
  const clamped = Math.max(nodeTopY + SNAP_GRID, Math.min(nodeTopY + nodeHeight - SNAP_GRID, snapped));
  return ((clamped - nodeTopY) / nodeHeight) * 100;
}

function reorderLineNodeHandles(allNodes: Node[]): Node[] {
  const posById = new Map(allNodes.map(n => [n.id, n.position]));
  return allNodes.map(n => {
    const d = n.data as Record<string, unknown>;
    const srcHandles = (d.sourceHandles as HandleSpec[] | undefined) ?? [];
    const tgtHandles = (d.targetHandles as HandleSpec[] | undefined) ?? [];
    if (srcHandles.length === 0 && tgtHandles.length === 0) return n;

    const nodeHeight = (d.nodeHeight as number | undefined) ?? 130;
    const nodeTopY = n.position.y;

    const regular = srcHandles.filter(h => !h.isSurplusHandle);
    const surplus = srcHandles.filter(h => h.isSurplusHandle);
    const sortedSrc = [...regular].sort((a, b) => {
      const aId = a.id.startsWith('src-') ? a.id.slice(4) : '';
      const bId = b.id.startsWith('src-') ? b.id.slice(4) : '';
      return (posById.get(aId)?.y ?? 0) - (posById.get(bId)?.y ?? 0);
    });
    const srcCount = sortedSrc.length;
    const newSrcHandles = [
      ...sortedSrc.map((h, i) => {
        const raw = ((i + 1) / (srcCount + 1)) * 100;
        return { ...h, topPercent: snapHandlePercent(nodeTopY, nodeHeight, raw) };
      }),
      ...surplus,
    ];

    const sortedTgt = [...tgtHandles].sort((a, b) => {
      const aId = a.id.startsWith('tgt-') ? a.id.slice(4) : '';
      const bId = b.id.startsWith('tgt-') ? b.id.slice(4) : '';
      return (posById.get(aId)?.y ?? 0) - (posById.get(bId)?.y ?? 0);
    });
    const tgtCount = sortedTgt.length;
    const newTgtHandles = sortedTgt.map((h, i) => {
      const raw = ((i + 1) / (tgtCount + 1)) * 100;
      return { ...h, topPercent: snapHandlePercent(nodeTopY, nodeHeight, raw) };
    });

    return { ...n, data: { ...d, sourceHandles: newSrcHandles, targetHandles: newTgtHandles } };
  });
}

// ── Storage helpers ───────────────────────────────────────────────────────────

const POSITIONS_PREFIX = 'sfp:line:pos:';
const SPLITS_PREFIX = 'sfp:line:splits:';

function loadSplitItems(planId: string | null): Set<string> {
  if (!planId) return new Set();
  try {
    const s = localStorage.getItem(SPLITS_PREFIX + planId);
    if (s) return new Set(JSON.parse(s) as string[]);
  } catch { /* ignore */ }
  return new Set();
}

function saveSplitItems(planId: string, splits: Set<string>) {
  localStorage.setItem(SPLITS_PREFIX + planId, JSON.stringify([...splits]));
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

// ── Main component ────────────────────────────────────────────────────────────

interface Props {
  roots: CalculationNode[];
  planId: string | null;
}

export default function ProductionLineFlow({ roots, planId }: Props) {
  const [splitItems, setSplitItems] = useState<Set<string>>(() => loadSplitItems(planId));
  const [nodes, setNodes, onNodesChange] = useNodesState([] as Node[]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([] as Edge[]);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [showSurplus, setShowSurplus] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ nodeId: string; x: number; y: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const nodesRef = useRef<Node[]>([]);
  nodesRef.current = nodes;
  const edgesRef = useRef<Edge[]>([]);
  edgesRef.current = edges;
  const updateNodeInternalsRef = useRef<((ids: string[]) => void) | null>(null);

  useEffect(() => {
    setSplitItems(loadSplitItems(planId));
  }, [planId]);

  const handleSplit = useCallback((itemId: string) => {
    setSplitItems(prev => {
      const next = new Set(prev).add(itemId);
      if (planId) saveSplitItems(planId, next);
      return next;
    });
  }, [planId]);

  const handleMerge = useCallback((itemId: string) => {
    setSplitItems(prev => {
      const next = new Set(prev);
      next.delete(itemId);
      if (planId) saveSplitItems(planId, next);
      return next;
    });
  }, [planId]);

  useEffect(() => {
    if (roots.length === 0) {
      setNodes([]);
      setEdges([]);
      return;
    }
    const { nodes: n, edges: e } = buildProductionLineGraph(roots, {
      savedPositions: loadPositions(planId),
      splitItems,
      onSplit: handleSplit,
      onMerge: handleMerge,
    });
    setNodes(n);
    setEdges(e);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roots, splitItems, planId]);

  const onNodeDragStop = useCallback((_event: React.MouseEvent, _node: Node, draggedNodes: Node[]) => {
    if (!planId) return;
    const draggedMap = new Map(draggedNodes.map(n => [n.id, n.position]));
    const allCurrent = nodesRef.current.map(n =>
      draggedMap.has(n.id) ? { ...n, position: draggedMap.get(n.id)! } : n
    );
    savePositions(planId, new Map(allCurrent.map(n => [n.id, n.position])));
    const reordered = reorderLineNodeHandles(allCurrent);
    setNodes(reordered);
    updateNodeInternalsRef.current?.(reordered.map(n => n.id));
  }, [planId, setNodes]);

  const handleNodeClick = useCallback((_event: React.MouseEvent, node: Node) => {
    if (_event.ctrlKey || _event.metaKey) {
      const descendantIds = getDescendants(node.id, edgesRef.current);
      const allIds = new Set([node.id, ...descendantIds]);
      setNodes(nds => nds.map(n => ({ ...n, selected: allIds.has(n.id) })));
      setContextMenu(null);
    }
  }, [setNodes]);

  const handleNodeContextMenu = useCallback((event: React.MouseEvent, node: Node) => {
    event.preventDefault();
    setContextMenu({ nodeId: node.id, x: event.clientX, y: event.clientY });
  }, []);

  const handlePaneClick = useCallback(() => {
    setContextMenu(null);
  }, []);

  useEffect(() => {
    if (!contextMenu) return;
    const close = () => setContextMenu(null);
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [contextMenu]);

  const handleResetPositions = useCallback(() => {
    if (planId) localStorage.removeItem(POSITIONS_PREFIX + planId);
    const { nodes: n, edges: e } = buildProductionLineGraph(roots, {
      savedPositions: new Map(),
      splitItems,
      onSplit: handleSplit,
      onMerge: handleMerge,
    });
    setNodes(n);
    setEdges(e);
  }, [planId, roots, splitItems, handleSplit, handleMerge, setNodes, setEdges]);

  const selectedNodeIds = useMemo(
    () => new Set(nodes.filter(n => n.selected).map(n => n.id)),
    [nodes]
  );

  // Child node IDs of all selected nodes (ingredients that feed into selected products,
  // plus surplus nodes attached to selected nodes).
  const childNodeIds = useMemo(() => {
    if (selectedNodeIds.size === 0) return new Set<string>();
    const result = new Set<string>();
    for (const edge of edges) {
      if (selectedNodeIds.has(edge.target)) result.add(edge.source);
      if (selectedNodeIds.has(edge.source) && edge.id.startsWith('e-surplus-')) result.add(edge.target);
    }
    // Don't highlight nodes that are themselves selected
    for (const id of selectedNodeIds) result.delete(id);
    return result;
  }, [edges, selectedNodeIds]);

  const displayNodes = useMemo(() => {
    const hasSelection = selectedNodeIds.size > 0;
    const withHighlight = nodes.map(n => {
      const isChild = childNodeIds.has(n.id);
      const isUnrelated = hasSelection && !selectedNodeIds.has(n.id) && !isChild;
      return { ...n, data: { ...n.data, isChildHighlight: isChild, isUnrelated } };
    });
    return showSurplus ? withHighlight : withHighlight.map(n =>
      n.type === 'lineSurplusNode' ? { ...n, hidden: true } : n
    );
  }, [nodes, childNodeIds, selectedNodeIds, showSurplus]);

  const displayEdges = useMemo(() => {
    const baseEdges = showSurplus ? edges : edges.map(e =>
      e.id.startsWith('e-surplus-') ? { ...e, hidden: true } : e
    );
    if (selectedNodeIds.size === 0) return baseEdges;
    return baseEdges.map(edge => {
      const isIncoming = selectedNodeIds.has(edge.target);
      const isOutgoing = selectedNodeIds.has(edge.source);
      if (isIncoming) {
        return {
          ...edge,
          style: { stroke: '#f5a623', strokeWidth: 3 },
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#f5a623' },
        };
      }
      if (isOutgoing) {
        return {
          ...edge,
          style: { stroke: '#64b5f6', strokeWidth: 3 },
          animated: true,
          markerEnd: { type: MarkerType.ArrowClosed, color: '#64b5f6' },
        };
      }
      return {
        ...edge,
        style: { stroke: 'rgba(245,166,35,0.18)', strokeWidth: 1 },
        animated: false,
        markerEnd: { type: MarkerType.ArrowClosed, color: 'rgba(245,166,35,0.18)' },
      };
    });
  }, [edges, selectedNodeIds]);

  if (roots.length === 0) {
    return (
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#a0a0b0', flexDirection: 'column', gap: '12px',
      }}>
        <div style={{ fontSize: '36px' }}>🏗️</div>
        <div>計算結果がありません</div>
      </div>
    );
  }

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1100, background: '#0d1b2a' }
    : { width: '100%', height: '100%', position: 'relative' };

  return (
    <div ref={containerRef} style={containerStyle}>
      <ReactFlow
        nodes={displayNodes}
        edges={displayEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={onNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        onPaneClick={handlePaneClick}
        onPaneContextMenu={e => e.preventDefault()}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.15}
        maxZoom={2}
        panOnDrag={[0, 2]}
        zoomOnScroll={false}
        selectionKeyCode="Shift"
        multiSelectionKeyCode="Shift"
        selectionMode={SelectionMode.Full}
        snapToGrid={snapToGrid}
        snapGrid={[20, 20]}
        proOptions={{ hideAttribution: true }}
        style={{ background: '#0d1b2a' }}
      >
        <ScrollController containerRef={containerRef} />
        <NodeInternalsUpdater fnRef={updateNodeInternalsRef} />
        <Background variant={BackgroundVariant.Dots} color="#1a3460" gap={20} />
        <Controls style={{ background: '#1a1a2e', border: '1px solid #0f3460' }} />

        <Panel position="top-right">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={() => setShowSurplus(v => !v)} style={showSurplus ? btnActive : btn} title="余剰分の表示切り替え">
              📦 余剰
            </button>
            <button onClick={() => setSnapToGrid(v => !v)} style={snapToGrid ? btnActive : btn} title="スナップ切り替え">
              📐 スナップ
            </button>
            <button onClick={handleResetPositions} style={btn} title="配置をリセット">
              🔄 配置リセット
            </button>
            <button onClick={() => setIsFullscreen(f => !f)} style={btn} title="最大表示">
              {isFullscreen ? '⤓ 縮小' : '⤢ 最大表示'}
            </button>
          </div>
        </Panel>
      </ReactFlow>

      {contextMenu && <ContextMenu
        nodeId={contextMenu.nodeId}
        x={contextMenu.x}
        y={contextMenu.y}
        nodes={nodes}
        edges={edgesRef.current}
        onClose={() => setContextMenu(null)}
        onSplit={handleSplit}
        onMerge={handleMerge}
        onSelectWithDescendants={(nodeId) => {
          const descendantIds = getDescendants(nodeId, edgesRef.current);
          const allIds = new Set([nodeId, ...descendantIds]);
          setNodes(nds => nds.map(n => ({ ...n, selected: allIds.has(n.id) })));
        }}
      />}
    </div>
  );
}
