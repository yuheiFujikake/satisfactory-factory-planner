import type { Node, Edge } from '@xyflow/react';
import type { CalculationNode } from '../types/calculation.types';
import dagre from 'dagre';

interface GraphOptions {
  rootItemIds?: Set<string>;
  savedPositions?: Map<string, { x: number; y: number }>;
}

/**
 * Build a strict 1-to-1 tree graph (no shared/merged nodes).
 * Each occurrence of an item gets a unique path-based ID.
 * Saved positions override dagre layout per node.
 */
export function buildFlowGraph(
  roots: CalculationNode[],
  options: GraphOptions = {}
): { nodes: Node[]; edges: Edge[] } {
  const { savedPositions } = options;
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  function traverse(
    node: CalculationNode,
    parentId: string | null,
    rootIndex: number
  ): string {
    // Stable path-based ID: "r0/iron_plate", "r0/iron_plate/iron_ingot/iron_ore"
    const nodeId = parentId
      ? `${parentId}/${node.itemId}`
      : `r${rootIndex}/${node.itemId}`;

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
      },
    });

    node.children.forEach(child => {
      const childId = traverse(child, nodeId, rootIndex);
      edges.push({
        id: `e:${childId}=>${nodeId}`,
        source: childId,
        target: nodeId,
        animated: false,
        style: { stroke: '#f5a623', strokeWidth: 2 },
      });
    });

    return nodeId;
  }

  roots.forEach((root, i) => traverse(root, null, i));

  // Apply dagre layout
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'TB', ranksep: 80, nodesep: 50 });

  nodes.forEach(n => g.setNode(n.id, { width: 220, height: 90 }));
  edges.forEach(e => g.setEdge(e.source, e.target));
  dagre.layout(g);

  const layoutedNodes = nodes.map(n => {
    const saved = savedPositions?.get(n.id);
    if (saved) return { ...n, position: saved };
    const gNode = g.node(n.id);
    return { ...n, position: { x: gNode.x - 110, y: gNode.y - 45 } };
  });

  return { nodes: layoutedNodes, edges };
}
