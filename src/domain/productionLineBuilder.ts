import type { Node, Edge } from '@xyflow/react';
import { MarkerType } from '@xyflow/react';
import type { CalculationNode } from '../types/calculation.types';
import dagre from 'dagre';
import { formatRate } from '../utils/math';

export interface ProductionLineGraphOptions {
  savedPositions?: Map<string, { x: number; y: number }>;
  splitItems?: Set<string>;            // itemIds that should be shown as per-consumer split nodes
  onSplit?: (itemId: string) => void;  // called when user clicks "分割"
  onMerge?: (itemId: string) => void;  // called when user clicks "統合" on a split node
}

interface ItemEntry {
  nodeId: string;   // unique node ID (= itemId, or "${itemId}::${parentId}" for split)
  itemId: string;   // actual game item ID
  requiredPerMinute: number;
  machineCount: number;
  machineCountExact: number;
  recipeId?: string;
  isRawResource: boolean;
  isTarget: boolean;
  isSplit: boolean;
}

interface EdgeInfo {
  id: string;
  source: string;
  target: string;
  amount?: number;
  isSurplus?: boolean;
}

export interface HandleSpec {
  id: string;
  topPercent: number; // 0–100
  isSurplusHandle?: boolean; // if true, rendered at bottom-center (source) or top-center (target)
}

function snapToGrid(val: number, grid = 20): number {
  return Math.round(val / grid) * grid;
}

function distributeHandles(count: number): number[] {
  if (count === 0) return [];
  return Array.from({ length: count }, (_, i) => ((i + 1) / (count + 1)) * 100);
}

/** Snap handle topPercent so the handle lands on the nearest grid line in absolute coords. */
function snapHandleTopPercent(nodeTopY: number, nodeHeight: number, rawPercent: number, grid = 20): number {
  const absY = nodeTopY + nodeHeight * rawPercent / 100;
  const snapped = Math.round(absY / grid) * grid;
  const clamped = Math.max(nodeTopY + grid, Math.min(nodeTopY + nodeHeight - grid, snapped));
  return ((clamped - nodeTopY) / nodeHeight) * 100;
}

/**
 * Build a left-to-right React Flow graph for the production line view.
 *
 * Each connection gets its own Handle so edges fan out cleanly and
 * don't overlap each other or the nodes.
 *
 * Raw materials can be "split" into per-consumer nodes by adding their
 * itemId to `options.splitItems`. Split nodes have IDs of the form
 * `${itemId}::${parentNodeId}` so they are uniquely positioned.
 */
export function buildProductionLineGraph(
  roots: CalculationNode[],
  options: ProductionLineGraphOptions = {},
): { nodes: Node[]; edges: Edge[] } {
  const { savedPositions, splitItems = new Set(), onSplit, onMerge } = options;

  // nodeId → entry; for split nodes nodeId = "${itemId}::${parentId}"
  const itemMap = new Map<string, ItemEntry>();
  // "productNodeId|||ingredientNodeId" → accumulated flow amount
  const edgeAmountMap = new Map<string, number>();
  const targetItemIds = new Set(roots.map(r => r.itemId));

  // ── Traverse tree ─────────────────────────────────────────────────────────

  function traverse(node: CalculationNode, parentNodeId: string | null) {
    if (node.isCyclic) return;

    // Split nodes (raw or intermediate) get a per-consumer node ID
    const isSplitNode = splitItems.has(node.itemId) && parentNodeId !== null;
    const nodeId = isSplitNode ? `${node.itemId}::${parentNodeId}` : node.itemId;

    if (!itemMap.has(nodeId)) {
      itemMap.set(nodeId, {
        nodeId,
        itemId: node.itemId,
        requiredPerMinute: 0,
        machineCount: 0,
        machineCountExact: 0,
        recipeId: node.recipeId,
        isRawResource: node.isRawResource,
        isTarget: targetItemIds.has(node.itemId),
        isSplit: isSplitNode,
      });
    }

    const entry = itemMap.get(nodeId)!;
    entry.requiredPerMinute += node.requiredPerMinute;
    entry.machineCountExact += node.machineCountExact;
    entry.machineCount = Math.ceil(entry.machineCountExact);

    if (parentNodeId && parentNodeId !== nodeId) {
      const key = `${parentNodeId}|||${nodeId}`;
      edgeAmountMap.set(key, (edgeAmountMap.get(key) ?? 0) + node.requiredPerMinute);
    }

    for (const child of node.children) {
      traverse(child, nodeId);
    }
  }

  for (const root of roots) {
    traverse(root, null);
  }

  // ── Compute canSplit: any non-split node with multiple consumers ─────────

  // Count distinct consumer product nodes per non-split node
  const consumerSets = new Map<string, Set<string>>(); // nodeId → Set<consumerNodeId>
  for (const key of edgeAmountMap.keys()) {
    const sep = key.indexOf('|||');
    const product = key.slice(0, sep);
    const ingredient = key.slice(sep + 3);
    const entry = itemMap.get(ingredient);
    if (entry && !entry.isSplit) {
      if (!consumerSets.has(ingredient)) consumerSets.set(ingredient, new Set());
      consumerSets.get(ingredient)!.add(product);
    }
  }

  // ── Machine surplus (rounding) ─────────────────────────────────────────────

  const machineSurplus = new Map<string, number>();
  for (const [nodeId, item] of itemMap) {
    if (!item.isRawResource && item.machineCountExact > 0) {
      const ratePerMachine = item.requiredPerMinute / item.machineCountExact;
      const produced = item.machineCount * ratePerMachine;
      const surplus = produced - item.requiredPerMinute;
      if (surplus > 0.001) machineSurplus.set(nodeId, surplus);
    }
  }

  // ── Collect edge infos ────────────────────────────────────────────────────
  //
  // logicalEdges: product (source) → ingredient (target) — used for dagre layout.
  // rfEdges: ingredient (source) → product (target) — reversed so markerEnd arrows
  //          point from child toward parent (ingredient → product direction).

  const logicalEdges: EdgeInfo[] = [];
  const rfEdges: EdgeInfo[] = [];

  for (const [key, amount] of edgeAmountMap) {
    const sep = key.indexOf('|||');
    const product = key.slice(0, sep);
    const ingredient = key.slice(sep + 3);
    const id = `e-${product}-${ingredient}`;
    logicalEdges.push({ id, source: product, target: ingredient, amount });
    rfEdges.push({ id, source: ingredient, target: product, amount });
  }

  const surplusEdges: EdgeInfo[] = [];
  for (const [nodeId] of machineSurplus) {
    surplusEdges.push({
      id: `e-surplus-${nodeId}`,
      source: nodeId,
      target: `surplus:${nodeId}`,
      isSurplus: true,
    });
  }

  // nodeOutgoing / nodeIncoming are built from rfEdges (ingredient → product)
  // so ingredient nodes carry source handles and product nodes carry target handles.
  const nodeOutgoing = new Map<string, EdgeInfo[]>(); // ingredient → edges (source handles)
  const nodeIncoming = new Map<string, EdgeInfo[]>(); // product  → edges (target handles)
  for (const edge of rfEdges) {
    if (!nodeOutgoing.has(edge.source)) nodeOutgoing.set(edge.source, []);
    nodeOutgoing.get(edge.source)!.push(edge);
    if (!nodeIncoming.has(edge.target)) nodeIncoming.set(edge.target, []);
    nodeIncoming.get(edge.target)!.push(edge);
  }
  // Surplus edges only go into nodeIncoming for surplus nodes
  for (const edge of surplusEdges) {
    if (!nodeIncoming.has(edge.target)) nodeIncoming.set(edge.target, []);
    nodeIncoming.get(edge.target)!.push(edge);
  }
  // Stable sort by connected-node id for deterministic initial order
  for (const list of nodeOutgoing.values()) list.sort((a, b) => a.target.localeCompare(b.target));
  for (const list of nodeIncoming.values()) list.sort((a, b) => a.source.localeCompare(b.source));

  // ── Dagre RL layout ───────────────────────────────────────────────────────

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'RL', ranksep: 180, nodesep: 80 });

  const NODE_W = 230;
  const NODE_H_BASE = 120;
  const SURPLUS_W = 190;
  const SURPLUS_H = 80;

  for (const [nodeId, item] of itemMap) {
    const outCount = nodeOutgoing.get(nodeId)?.length ?? 0;
    const inCount = nodeIncoming.get(nodeId)?.length ?? 0;
    const handleRows = Math.max(outCount, inCount, 1);
    const h = NODE_H_BASE + Math.max(0, handleRows - 1) * 10;
    g.setNode(nodeId, { width: NODE_W, height: h });
    void item;
  }
  for (const [nodeId] of machineSurplus) {
    g.setNode(`surplus:${nodeId}`, { width: SURPLUS_W, height: SURPLUS_H });
  }

  // Dagre uses logical direction (product → ingredient) to keep product on right
  for (const edge of logicalEdges) g.setEdge(edge.source, edge.target);
  for (const edge of surplusEdges) g.setEdge(edge.source, edge.target);

  dagre.layout(g);

  // Reorder ingredient's source handles by connected product's Y position
  for (const [, edges] of nodeOutgoing) {
    edges.sort((a, b) => {
      const aY = g.node(a.target)?.y ?? 0; // a.target = product
      const bY = g.node(b.target)?.y ?? 0;
      return aY - bY;
    });
  }
  // Reorder product's target handles by connected ingredient's Y position
  for (const [tgtId, edges] of nodeIncoming) {
    if (tgtId.startsWith('surplus:')) continue;
    edges.sort((a, b) => {
      const aY = g.node(a.source)?.y ?? 0; // a.source = ingredient
      const bY = g.node(b.source)?.y ?? 0;
      return aY - bY;
    });
  }

  // ── Build React Flow output ───────────────────────────────────────────────

  const nodes: Node[] = [];
  const edges: Edge[] = [];

  for (const [nodeId, item] of itemMap) {
    const gn = g.node(nodeId);
    if (!gn) continue;

    const outEdges = nodeOutgoing.get(nodeId) ?? [];
    const inEdges = nodeIncoming.get(nodeId) ?? [];
    const outPositions = distributeHandles(outEdges.length);
    const inPositions = distributeHandles(inEdges.length);

    const saved = savedPositions?.get(nodeId);
    const position = saved ?? {
      x: snapToGrid(gn.x - gn.width / 2),
      y: snapToGrid(gn.y - gn.height / 2),
    };

    const nodeH = gn.height as number;
    const nodeTopY = position.y;

    const sourceHandles: HandleSpec[] = outEdges.map((e, i) => ({
      id: `src-${e.target}`,
      topPercent: snapHandleTopPercent(nodeTopY, nodeH, outPositions[i]),
    }));
    if (machineSurplus.has(nodeId)) {
      sourceHandles.push({ id: `src-surplus:${nodeId}`, topPercent: 100, isSurplusHandle: true });
    }
    const targetHandles: HandleSpec[] = inEdges.map((e, i) => ({
      id: `tgt-${e.source}`,
      topPercent: snapHandleTopPercent(nodeTopY, nodeH, inPositions[i]),
    }));

    const canSplit = !item.isTarget && !item.isSplit &&
      (consumerSets.get(nodeId)?.size ?? 0) > 1;

    nodes.push({
      id: nodeId,
      type: 'lineItemNode',
      position,
      data: {
        itemId: item.itemId,
        requiredPerMinute: item.requiredPerMinute,
        machineCount: item.machineCount,
        machineCountExact: item.machineCountExact,
        recipeId: item.recipeId,
        isRawResource: item.isRawResource,
        isTarget: item.isTarget,
        machineSurplusPerMinute: machineSurplus.get(nodeId) ?? 0,
        nodeHeight: nodeH,
        sourceHandles,
        targetHandles,
        canSplit,
        isSplit: item.isSplit,
        onSplit: (canSplit && onSplit) ? () => onSplit(item.itemId) : undefined,
        onMerge: (item.isSplit && onMerge) ? () => onMerge(item.itemId) : undefined,
      },
    });
  }

  for (const [nodeId, surplusAmt] of machineSurplus) {
    const surplusId = `surplus:${nodeId}`;
    const gn = g.node(surplusId);
    if (!gn) continue;

    const inEdges = nodeIncoming.get(surplusId) ?? [];
    const inPositions = distributeHandles(inEdges.length);
    const targetHandles: HandleSpec[] = inEdges.map((e, i) => ({
      id: `tgt-${e.source}`,
      topPercent: inPositions[i],
    }));

    const parentGn = g.node(nodeId);
    let defaultPosition = { x: snapToGrid(gn.x - SURPLUS_W / 2), y: snapToGrid(gn.y - gn.height / 2) };
    if (parentGn) {
      defaultPosition = {
        x: snapToGrid(parentGn.x - SURPLUS_W / 2),
        y: snapToGrid(parentGn.y + parentGn.height / 2 + 40),
      };
    }
    const saved = savedPositions?.get(surplusId);

    nodes.push({
      id: surplusId,
      type: 'lineSurplusNode',
      position: saved ?? defaultPosition,
      data: {
        itemId: nodeId,   // nodeId may be a split key; use base itemId for display if needed
        surplusPerMinute: surplusAmt,
        surplusType: 'machine',
        targetHandles,
      },
    });
  }

  // Build React Flow edges with per-connection handles
  // Regular edges: ingredient (source) → product (target), arrow points toward parent
  for (const edge of rfEdges) {
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: `src-${edge.target}`,
      targetHandle: `tgt-${edge.source}`,
      type: 'smoothstep',
      animated: true,
      label: `${formatRate(edge.amount!)}/min`,
      labelStyle: { fill: '#c0c0d0', fontSize: 10 },
      labelBgStyle: { fill: '#1a1a2e', fillOpacity: 0.9 },
      style: { stroke: '#f5a623', strokeWidth: 2 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#f5a623' },
    });
  }
  // Surplus edges stay as-is (item node → surplus node, bottom handle)
  for (const edge of surplusEdges) {
    edges.push({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: `src-${edge.target}`,
      targetHandle: `tgt-${edge.source}`,
      type: 'smoothstep',
      style: { stroke: '#4caf50', strokeWidth: 2, strokeDasharray: '6,3' },
      label: machineSurplus.has(edge.source)
        ? `+${formatRate(machineSurplus.get(edge.source)!)}/min`
        : '',
      labelStyle: { fill: '#4caf50', fontSize: 10, fontWeight: 600 },
      labelBgStyle: { fill: '#1a2e1a', fillOpacity: 0.9 },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#4caf50' },
    });
  }

  return { nodes, edges };
}
