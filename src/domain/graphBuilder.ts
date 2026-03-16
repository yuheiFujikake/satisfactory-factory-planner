import type { Node, Edge } from '@xyflow/react';
import type { CalculationNode } from '../types/calculation.types';
import dagre from 'dagre';

// ── Public types ──────────────────────────────────────────────────────────────

/**
 * A merge group with a stable ID (not index-based).
 * The graph node ID for this group is `mg:${id}`.
 */
export interface MergeGroupConfig {
  id: string;      // stable short ID (random alphanumeric), never changes
  members: string[]; // path-based node IDs belonging to this group
}

export interface MergeGroupMember {
  nodeId: string;   // original path-based node ID
  itemId: string;
  amount: number;
  machineCountExact: number;
}

export interface SupplyLink {
  itemId: string;
  nodeId: string;
  amount: number;
}

// ── Graph options ─────────────────────────────────────────────────────────────

interface GraphOptions {
  savedPositions?: Map<string, { x: number; y: number }>;
  mergeGroups?: MergeGroupConfig[];
  onStartMerge?: (nodeId: string, itemId: string) => void;
  onCompleteMerge?: (targetId: string) => void;
  onOpenSplit?: (groupId: string) => void;
  // Merge-select mode: highlight compatible targets
  mergeModeSourceId?: string;
  mergeModeSourceItemId?: string;
  edgeType?: 'smoothstep' | 'straight';
}

// ── Main graph builder ────────────────────────────────────────────────────────

/**
 * Build a React Flow graph from the calculation tree.
 *
 * Key design:
 * - Merge groups use stable `mg:${group.id}` node IDs — never index-based.
 *   This means repeated merges/splits never re-number existing groups, so
 *   child node IDs (e.g. `mg:abc/iron-ore`) remain stable across operations.
 * - Supply/demand links are computed post-traversal.
 * - Raw resource nodes are aligned to the minimum Y (topmost row).
 * - Saved positions override dagre layout per node.
 */
export function buildFlowGraph(
  roots: CalculationNode[],
  options: GraphOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const {
    savedPositions,
    mergeGroups = [],
    onStartMerge,
    onCompleteMerge,
    onOpenSplit,
    mergeModeSourceId,
    mergeModeSourceItemId,
    edgeType = 'smoothstep',
  } = options;

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const nodeIndexMap = new Map<string, number>();  // nodeId → index in nodes[]
  const edgeSet = new Set<string>();               // deduplication key set
  const edgeAmounts = new Map<string, number>();   // edgeId → accumulated amount

  // Build merge-group lookup: path-based nodeId → stable group node ID `mg:${id}`
  const pathToGroupNodeId = new Map<string, string>(); // path-based → "mg:abc"
  const groupNodeIdToMembers = new Map<string, MergeGroupMember[]>();
  mergeGroups.forEach(group => {
    const groupNodeId = `mg:${group.id}`;
    group.members.forEach(pathId => pathToGroupNodeId.set(pathId, groupNodeId));
    groupNodeIdToMembers.set(groupNodeId, []);
  });

  // ── Traversal ────────────────────────────────────────────────────────────

  function traverse(
    node: CalculationNode,
    parentId: string | null,
    rootIndex: number
  ): string {
    // Compute the "natural" path-based ID for this node
    const baseNodeId = parentId
      ? `${parentId}/${node.itemId}`
      : `r${rootIndex}/${node.itemId}`;

    // If this path is in a merge group, use the stable group node ID instead
    const groupNodeId = pathToGroupNodeId.get(baseNodeId);
    const nodeId = groupNodeId ?? baseNodeId;
    const isMerged = !!groupNodeId;

    if (groupNodeId) {
      groupNodeIdToMembers.get(groupNodeId)!.push({
        nodeId: baseNodeId,
        itemId: node.itemId,
        amount: node.requiredPerMinute,
        machineCountExact: node.machineCountExact,
      });
    }

    const existingIdx = nodeIndexMap.get(nodeId);
    if (existingIdx !== undefined) {
      // Already created (merged node hit again) — accumulate quantities only
      const d = nodes[existingIdx].data as Record<string, unknown>;
      d.requiredPerMinute = (d.requiredPerMinute as number) + node.requiredPerMinute;
      d.machineCountExact = (d.machineCountExact as number) + node.machineCountExact;
      d.machineCount = Math.ceil(d.machineCountExact as number);

      node.children.forEach(child => {
        const childId = traverse(child, nodeId, rootIndex);
        addEdge(childId, nodeId, child.requiredPerMinute);
      });
      return nodeId;
    }

    // isMergeCandidate: same item type as the merge source, but not the source itself
    const isMergeCandidate =
      mergeModeSourceItemId !== undefined &&
      node.itemId === mergeModeSourceItemId &&
      nodeId !== mergeModeSourceId;

    nodeIndexMap.set(nodeId, nodes.length);
    nodes.push({
      id: nodeId,
      type: 'itemNode',
      position: { x: 0, y: 0 },
      data: {
        itemId: node.itemId,
        requiredPerMinute: node.requiredPerMinute,
        machineCount: node.machineCount,
        machineCountExact: node.machineCountExact,
        recipeId: node.recipeId,
        isRawResource: node.isRawResource,
        overclockRate: node.overclockRate,
        isRoot: parentId === null,
        isMerged,
        canMerge: false, // recomputed post-traversal
        isMergeCandidate,
        mergeGroupId: groupNodeId,
        suppliedTo: [] as SupplyLink[],
        receivedFrom: [] as SupplyLink[],
        onStartMerge: onStartMerge ? () => onStartMerge(nodeId, node.itemId) : undefined,
        onCompleteMerge: onCompleteMerge ? () => onCompleteMerge(nodeId) : undefined,
        onOpenSplit: (isMerged && onOpenSplit) ? () => onOpenSplit(nodeId) : undefined,
      },
    });

    node.children.forEach(child => {
      const childId = traverse(child, nodeId, rootIndex);
      addEdge(childId, nodeId, child.requiredPerMinute);
    });

    return nodeId;
  }

  function addEdge(source: string, target: string, amount: number) {
    const edgeId = `e:${source}=>${target}`;
    if (edgeSet.has(edgeId)) {
      edgeAmounts.set(edgeId, (edgeAmounts.get(edgeId) ?? 0) + amount);
    } else {
      edgeSet.add(edgeId);
      edgeAmounts.set(edgeId, amount);
      edges.push({
        id: edgeId,
        source,
        target,
        type: edgeType,
        animated: false,
        style: { stroke: '#f5a623', strokeWidth: 2 },
      });
    }
  }

  roots.forEach((root, i) => traverse(root, null, i));

  // ── Post-traversal: canMerge (based on actual graph nodes) ───────────────
  // A node canMerge if another node with the same itemId exists in the graph.
  // This allows merged nodes to absorb additional occurrences.

  const nodesByItemId = new Map<string, string[]>();
  nodes.forEach(n => {
    const itemId = (n.data as { itemId: string }).itemId;
    if (!nodesByItemId.has(itemId)) nodesByItemId.set(itemId, []);
    nodesByItemId.get(itemId)!.push(n.id);
  });

  nodes.forEach(n => {
    const itemId = (n.data as { itemId: string }).itemId;
    const siblings = (nodesByItemId.get(itemId) ?? []).filter(id => id !== n.id);
    (n.data as Record<string, unknown>).canMerge = siblings.length > 0;
  });

  // ── Post-traversal: supply/demand links ──────────────────────────────────

  const suppliedTo = new Map<string, SupplyLink[]>();
  const receivedFrom = new Map<string, SupplyLink[]>();

  const getItemId = (nodeId: string): string => {
    const idx = nodeIndexMap.get(nodeId);
    return idx !== undefined ? (nodes[idx].data as { itemId: string }).itemId : '';
  };

  edges.forEach(e => {
    const amount = edgeAmounts.get(e.id) ?? 0;
    const sourceItemId = getItemId(e.source);
    const targetItemId = getItemId(e.target);

    if (!suppliedTo.has(e.source)) suppliedTo.set(e.source, []);
    suppliedTo.get(e.source)!.push({ itemId: targetItemId, nodeId: e.target, amount });

    if (!receivedFrom.has(e.target)) receivedFrom.set(e.target, []);
    receivedFrom.get(e.target)!.push({ itemId: sourceItemId, nodeId: e.source, amount });
  });

  // ── Post-traversal: embed all computed data into node data ────────────────

  nodes.forEach(n => {
    const d = n.data as Record<string, unknown>;
    d.suppliedTo = suppliedTo.get(n.id) ?? [];
    d.receivedFrom = receivedFrom.get(n.id) ?? [];
    if (d.mergeGroupId) {
      d.mergeGroupMembers = groupNodeIdToMembers.get(d.mergeGroupId as string) ?? [];
    }
  });

  // ── Dagre layout ──────────────────────────────────────────────────────────

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // BT = Bottom-to-Top: root items (sinks) at top, raw resources (sources) at bottom
  g.setGraph({ rankdir: 'BT', ranksep: 100, nodesep: 100 });

  // Node height = base + section height per supply/receive section
  // Section overhead (divider + label): 24px; per row: 15px
  const SECTION_OVERHEAD = 24;
  const ROW_HEIGHT = 15;
  const sectionH = (count: number) =>
    count === 0 ? 0 : SECTION_OVERHEAD + count * ROW_HEIGHT;

  nodes.forEach(n => {
    const d = n.data as { suppliedTo: SupplyLink[]; receivedFrom: SupplyLink[] };
    const height = 115 + sectionH(d.receivedFrom.length) + sectionH(d.suppliedTo.length);
    g.setNode(n.id, { width: 240, height });
  });

  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map(n => {
    const saved = savedPositions?.get(n.id);
    if (saved) return { ...n, position: saved };
    const gNode = g.node(n.id);
    // gNode.x/y are node centres; position is the top-left corner in React Flow
    return { ...n, position: { x: gNode.x - gNode.width / 2, y: gNode.y - gNode.height / 2 } };
  });

  return { nodes: layoutedNodes, edges };
}
