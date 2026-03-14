import { useEffect, useCallback, useState } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  BackgroundVariant,
  Panel,
} from '@xyflow/react';
import type { NodeTypes, Node, Edge } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import type { CalculationNode } from '../../types/calculation.types';
import { buildFlowGraph } from '../../domain/graphBuilder';
import ItemNode from './ItemNode';

const nodeTypes: NodeTypes = { itemNode: ItemNode };
const POSITIONS_PREFIX = 'sfp:pos:';

function loadPositions(planId: string | null): Map<string, { x: number; y: number }> {
  if (!planId) return new Map();
  try {
    const s = localStorage.getItem(POSITIONS_PREFIX + planId);
    if (s) {
      return new Map(
        Object.entries(JSON.parse(s) as Record<string, { x: number; y: number }>)
      );
    }
  } catch { /* ignore */ }
  return new Map();
}

function savePositions(planId: string, positions: Map<string, { x: number; y: number }>) {
  localStorage.setItem(
    POSITIONS_PREFIX + planId,
    JSON.stringify(Object.fromEntries(positions))
  );
}

interface DependencyFlowProps {
  roots: CalculationNode[];
  planId: string | null;
}

const btnStyle: React.CSSProperties = {
  background: '#16213e',
  border: '1px solid #0f3460',
  color: '#a0a0b0',
  borderRadius: '6px',
  padding: '6px 10px',
  fontSize: '11px',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
};

const EMPTY_NODES: Node[] = [];
const EMPTY_EDGES: Edge[] = [];

export default function DependencyFlow({ roots, planId }: DependencyFlowProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>(EMPTY_NODES);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>(EMPTY_EDGES);

  // Rebuild graph when roots or planId changes
  useEffect(() => {
    if (roots.length === 0) {
      setNodes(EMPTY_NODES);
      setEdges(EMPTY_EDGES);
      return;
    }
    const saved = loadPositions(planId);
    const rootIds = new Set(roots.map(r => r.itemId));
    const { nodes: n, edges: e } = buildFlowGraph(roots, { rootItemIds: rootIds, savedPositions: saved });
    setNodes(n);
    setEdges(e);
  }, [roots, planId]); // eslint-disable-line react-hooks/exhaustive-deps

  const onNodeDragStop = useCallback(
    (_event: React.MouseEvent, node: Node) => {
      if (!planId) return;
      const saved = loadPositions(planId);
      saved.set(node.id, node.position);
      savePositions(planId, saved);
    },
    [planId]
  );

  const handleResetPositions = useCallback(() => {
    if (planId) localStorage.removeItem(POSITIONS_PREFIX + planId);
    const rootIds = new Set(roots.map(r => r.itemId));
    const { nodes: n, edges: e } = buildFlowGraph(roots, { rootItemIds: rootIds });
    setNodes(n);
    setEdges(e);
  }, [roots, planId, setNodes, setEdges]);

  if (roots.length === 0) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100%',
        color: '#a0a0b0',
        fontSize: '14px',
      }}>
        計算を実行すると依存グラフが表示されます
      </div>
    );
  }

  const containerStyle: React.CSSProperties = isFullscreen
    ? { position: 'fixed', inset: 0, zIndex: 1000, background: '#1a1a2e' }
    : { width: '100%', height: '100%' };

  return (
    <div style={containerStyle}>
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        onNodeDragStop={onNodeDragStop}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        style={{ background: '#1a1a2e' }}
        defaultEdgeOptions={{
          animated: false,
          style: { stroke: '#f5a623', strokeWidth: 2 },
        }}
      >
        <Background variant={BackgroundVariant.Dots} color="#0f3460" gap={20} size={1} />
        <Controls />
        <MiniMap
          style={{ background: '#16213e', border: '1px solid #0f3460' }}
          nodeColor={(node) => {
            const d = node.data as { isRawResource?: boolean; isRoot?: boolean };
            if (d.isRoot) return '#64b5f6';
            if (d.isRawResource) return '#4caf50';
            return '#f5a623';
          }}
        />
        <Panel position="top-right">
          <div style={{ display: 'flex', gap: '6px' }}>
            <button onClick={handleResetPositions} style={btnStyle} title="配置をリセット">
              🔄 配置リセット
            </button>
            <button
              onClick={() => setIsFullscreen(f => !f)}
              style={btnStyle}
              title={isFullscreen ? '通常表示に戻す' : '最大化'}
            >
              {isFullscreen ? '⤓ 縮小' : '⤢ 最大化'}
            </button>
          </div>
        </Panel>
      </ReactFlow>
    </div>
  );
}
