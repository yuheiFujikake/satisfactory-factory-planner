import type { Node, Edge } from '@xyflow/react';
import type { CalculationNode } from '../types/calculation.types';
import dagre from 'dagre';

// ── 公開型定義 ──────────────────────────────────────────────────────────────

/**
 * 複数の依存ノードをひとつにまとめる「マージグループ」の設定。
 * グループの React Flow ノード ID は `mg:${id}` 形式。
 */
export interface MergeGroupConfig {
  /** グループの安定 ID（ランダム英数字）。再マージ・分割後も変わらない */
  id: string;
  /** このグループに属するパスベースノード ID の一覧 */
  members: string[];
}

/**
 * マージグループに属する元ノードの情報。
 * グループノードの tooltip や分割処理で使用する。
 */
export interface MergeGroupMember {
  /** 元のパスベースノード ID */
  nodeId: string;
  itemId: string;
  /** このメンバーの必要量（/分） */
  amount: number;
  /** このメンバーの必要台数（小数） */
  machineCountExact: number;
}

/**
 * あるノードが別のノードにアイテムを供給している関係を表す。
 * ノードデータの `suppliedTo` / `receivedFrom` リストに格納される。
 */
export interface SupplyLink {
  itemId: string;
  /** 供給先（または供給元）のノード ID */
  nodeId: string;
  /** 供給量（/分） */
  amount: number;
}

// ── グラフ構築オプション ──────────────────────────────────────────────────

/**
 * `buildFlowGraph` に渡すオプション。
 * すべてのプロパティはオプショナル。
 */
interface GraphOptions {
  /** ノード ID → 保存済み座標。指定されたノードは dagre レイアウトを上書きする */
  savedPositions?: Map<string, { x: number; y: number }>;
  /** 有効なマージグループ一覧 */
  mergeGroups?: MergeGroupConfig[];
  /** 「マージ開始」ボタン押下時のコールバック */
  onStartMerge?: (nodeId: string, itemId: string) => void;
  /** マージ先ノード確定時のコールバック */
  onCompleteMerge?: (targetId: string) => void;
  /** 分割ダイアログを開くコールバック */
  onOpenSplit?: (groupId: string) => void;
  /** マージ選択モード: このノード ID と同じアイテムのノードをハイライトする */
  mergeModeSourceId?: string;
  /** マージ選択モード: ハイライト対象の itemId */
  mergeModeSourceItemId?: string;
  /** エッジの形状（デフォルト: 'smoothstep'） */
  edgeType?: 'smoothstep' | 'straight';
}

// ── メイン関数 ──────────────────────────────────────────────────────────────

/**
 * 計算ツリーから React Flow のノード・エッジ配列を構築する。
 *
 * 設計のポイント:
 * - マージグループは安定 ID `mg:${group.id}` を使用する。
 *   インデックスベースの ID ではないため、再マージ・分割後も
 *   子ノード ID（例: `mg:abc/iron-ore`）が変わらない。
 * - 供給/需要リンクはツリー走査後にポスト処理で算出する。
 * - 原材料ノードは最下段（Y 最大）に配置される。
 * - 保存済み座標が存在するノードは dagre レイアウトを上書きする。
 *
 * @param roots - 計算ツリーのルートノード配列
 * @param options - グラフ構築オプション
 * @returns React Flow に渡す `{ nodes, edges }`
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
  /** ノード ID → nodes[] 内のインデックス（高速ルックアップ用） */
  const nodeIndexMap = new Map<string, number>();
  /** エッジの重複排除キーセット */
  const edgeSet = new Set<string>();
  /** エッジ ID → 累積送量（同一エッジへの加算に使用） */
  const edgeAmounts = new Map<string, number>();

  // パスベースノード ID → グループノード ID `mg:${id}` の逆引きマップを構築
  const pathToGroupNodeId = new Map<string, string>();
  const groupNodeIdToMembers = new Map<string, MergeGroupMember[]>();
  mergeGroups.forEach(group => {
    const groupNodeId = `mg:${group.id}`;
    group.members.forEach(pathId => pathToGroupNodeId.set(pathId, groupNodeId));
    groupNodeIdToMembers.set(groupNodeId, []);
  });

  // ── ツリー走査 ──────────────────────────────────────────────────────────

  /**
   * ツリーを DFS で走査し、React Flow ノード・エッジを生成する。
   *
   * @param node - 現在処理中の計算ノード
   * @param parentId - 親ノードの ID（ルートの場合は null）
   * @param rootIndex - ルートインデックス（パスベース ID 生成用）
   * @returns 生成・使用したノード ID
   */
  function traverse(
    node: CalculationNode,
    parentId: string | null,
    rootIndex: number
  ): string {
    // パスベース ID を構築（例: `r0/automated-wiring/cable`）
    const baseNodeId = parentId
      ? `${parentId}/${node.itemId}`
      : `r${rootIndex}/${node.itemId}`;

    // マージグループに属する場合は安定グループ ID を使用
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
      // マージ済みノードへの再到達 → 数量のみ加算して子を再走査
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

    // マージ候補判定: マージ選択モード中で同一アイテム・かつソース自身でないノード
    const isMergeCandidate =
      mergeModeSourceItemId !== undefined &&
      node.itemId === mergeModeSourceItemId &&
      nodeId !== mergeModeSourceId;

    nodeIndexMap.set(nodeId, nodes.length);
    nodes.push({
      id: nodeId,
      type: 'itemNode',
      position: { x: 0, y: 0 },  // レイアウトはポスト処理で上書き
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
        canMerge: false,  // ポスト処理で再計算
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

  /**
   * エッジを追加する。同一エッジへの再追加は量の加算で処理する。
   *
   * @param source - 素材供給元のノード ID
   * @param target - 素材消費先のノード ID
   * @param amount - 供給量（/分）
   */
  function addEdge(source: string, target: string, amount: number) {
    const edgeId = `e:${source}=>${target}`;
    if (edgeSet.has(edgeId)) {
      // 既存エッジへの加算（マージ時など）
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

  // ── ポスト処理 1: canMerge フラグの計算 ───────────────────────────────────
  // 同一 itemId を持つノードが複数存在する場合に canMerge = true を立てる

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

  // ── ポスト処理 2: 供給/需要リンクの算出 ──────────────────────────────────

  const suppliedTo = new Map<string, SupplyLink[]>();
  const receivedFrom = new Map<string, SupplyLink[]>();

  /** ノード ID から itemId を取得するヘルパー */
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

  // ── ポスト処理 3: 算出データをノードデータに埋め込む ─────────────────────

  nodes.forEach(n => {
    const d = n.data as Record<string, unknown>;
    d.suppliedTo = suppliedTo.get(n.id) ?? [];
    d.receivedFrom = receivedFrom.get(n.id) ?? [];
    if (d.mergeGroupId) {
      d.mergeGroupMembers = groupNodeIdToMembers.get(d.mergeGroupId as string) ?? [];
    }
  });

  // ── Dagre レイアウト ─────────────────────────────────────────────────────
  // rankdir = 'BT'（ボトムアップ）: 目標アイテム（シンク）が上、原材料（ソース）が下

  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: 'BT', ranksep: 100, nodesep: 100 });

  // ノード高さ = ベース高 + 供給/受信セクションの高さ
  // セクションオーバーヘッド（区切り線 + ラベル）: 24px、行ごと: 15px
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
    // 保存済み座標があればそちらを優先
    const saved = savedPositions?.get(n.id);
    if (saved) return { ...n, position: saved };
    const gNode = g.node(n.id);
    // dagre の x/y はノード中心座標なので、左上隅に変換する
    return { ...n, position: { x: gNode.x - gNode.width / 2, y: gNode.y - gNode.height / 2 } };
  });

  return { nodes: layoutedNodes, edges };
}
