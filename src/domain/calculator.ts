import type { Recipe, Item } from '../types/game.types';
import type { CalculationNode, CalculationResult, AggregatedItem, MachineSummary } from '../types/calculation.types';
import type { ProductionPlan } from '../types/plan.types';

// ── 計算コンテキスト ──────────────────────────────────────────────────────────

/**
 * 依存ツリー構築に必要なゲームデータと設定をまとめたコンテキスト。
 * `calculate()` 関数の内部でのみ生成され、再帰処理に引き回される。
 */
export interface CalculationContext {
  /** アイテムマスター（id → Item） */
  items: Record<string, Item>;
  /** レシピマスター（id → Recipe） */
  recipes: Record<string, Recipe>;
  /** 建物マスター（id → 消費電力情報） */
  machines: Record<string, { powerConsumptionMW: number }>;
  /** アウトプット別レシピ逆引きマップ（itemId → Recipe[]） */
  recipesByOutput: Record<string, Recipe[]>;
  /** プランに設定されたレシピオーバーライド（itemId → recipeId） */
  recipeOverrides: Record<string, string>;
  /** オーバークロック設定（itemId → 倍率、デフォルト 1.0） */
  overclock: Record<string, number>;
}

// ── ユーティリティ関数 ────────────────────────────────────────────────────────

/**
 * アイテムに対して使用するレシピを決定する。
 *
 * 優先順位:
 * 1. プランのオーバーライド設定で指定されたレシピ
 * 2. 非オルタネートレシピ（標準レシピ）
 * 3. 上記がなければ最初のレシピ
 *
 * @param itemId - 対象アイテムの ID
 * @param context - 計算コンテキスト
 * @returns 使用するレシピ。見つからない場合は `undefined`（原材料として扱う）
 */
export function getSelectedRecipe(itemId: string, context: CalculationContext): Recipe | undefined {
  if (context.recipeOverrides[itemId]) {
    return context.recipes[context.recipeOverrides[itemId]];
  }
  const recipes = context.recipesByOutput[itemId] || [];
  return recipes.find(r => !r.isAlternate) || recipes[0];
}

/**
 * 指定アイテムの生産依存ツリーを再帰的に構築する。
 *
 * - レシピが存在しないアイテムは原材料（`isRawResource: true`）として終端する。
 * - 循環依存を検出した場合は `isCyclic: true` で終端し、無限ループを防ぐ。
 * - オーバークロック率を反映した必要台数（小数）と切り上げ整数台数を計算する。
 *
 * @param itemId - 生産したいアイテムの ID
 * @param targetRate - 1分あたりの必要生産量
 * @param context - 計算コンテキスト
 * @param visited - 循環依存検出用の訪問済み itemId セット（再帰時に引き渡す）
 * @returns 依存ツリーのルートノード
 */
export function buildDependencyTree(
  itemId: string,
  targetRate: number,
  context: CalculationContext,
  visited: Set<string> = new Set()
): CalculationNode {
  const recipe = getSelectedRecipe(itemId, context);

  // レシピなし → 原材料として終端
  if (!recipe) {
    return {
      itemId,
      requiredPerMinute: targetRate,
      machineCount: 0,
      machineCountExact: 0,
      overclockRate: 1.0,
      children: [],
      isRawResource: true,
    };
  }

  // 循環依存を検出 → isCyclic フラグを立てて終端
  if (visited.has(itemId)) {
    return {
      itemId,
      recipeId: recipe.id,
      requiredPerMinute: targetRate,
      machineCount: 0,
      machineCountExact: 0,
      overclockRate: 1.0,
      children: [],
      isRawResource: false,
      isCyclic: true,
    };
  }

  visited.add(itemId);

  // レシピのアウトプットにこのアイテムが含まれない場合も原材料扱い
  const outputItem = recipe.outputs.find(o => o.itemId === itemId);
  if (!outputItem) {
    visited.delete(itemId);
    return {
      itemId,
      requiredPerMinute: targetRate,
      machineCount: 0,
      machineCountExact: 0,
      overclockRate: 1.0,
      children: [],
      isRawResource: true,
    };
  }

  // オーバークロック率を考慮した実効出力レートと必要台数を算出
  const overclockRate = context.overclock[itemId] ?? 1.0;
  const effectiveOutputRate = outputItem.amountPerMinute * overclockRate;
  const multiplier = targetRate / effectiveOutputRate;
  const machineCountExact = multiplier;
  const machineCount = Math.ceil(machineCountExact);

  // 各インプット素材の必要量を再帰計算
  const children = recipe.inputs.map(input => {
    const requiredInputRate = input.amountPerMinute * multiplier;
    return buildDependencyTree(input.itemId, requiredInputRate, context, new Set(visited));
  });

  visited.delete(itemId);

  return {
    itemId,
    recipeId: recipe.id,
    requiredPerMinute: targetRate,
    machineCount,
    machineCountExact,
    overclockRate,
    children,
    isRawResource: false,
  };
}

/**
 * 依存ツリーをイテレーティブな DFS でフラット化し、全ノードの配列を返す。
 *
 * ルートが最初、葉（原材料）が最後の順になる。
 * 同一アイテムが複数ブランチに出現する場合、それぞれ別エントリとして含まれる。
 *
 * @param root - ツリーのルートノード
 * @returns ツリー内の全ノードを格納した配列
 */
export function flattenTree(root: CalculationNode): CalculationNode[] {
  const result: CalculationNode[] = [];
  const stack = [root];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node);
    stack.push(...node.children);
  }
  return result;
}

/**
 * ノード配列を集計し、アイテムごとの合計必要量リストを返す。
 *
 * 同一 itemId が複数のノードに登場する場合（共有素材）、
 * `requiredPerMinute` を合算した単一エントリにまとめる。
 *
 * @param nodes - 集計対象のノード配列（`flattenTree` の戻り値など）
 * @returns アイテムごとの集計結果
 */
export function aggregateItems(nodes: CalculationNode[]): AggregatedItem[] {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.itemId, (map.get(node.itemId) ?? 0) + node.requiredPerMinute);
  }
  return Array.from(map.entries()).map(([itemId, totalPerMinute]) => ({ itemId, totalPerMinute }));
}

/**
 * 各アイテムの「葉からの深さ」を計算し、`depths` マップに書き込む。
 *
 * - 原材料（葉ノード）の深さ = 0
 * - n ステップ上位のアイテムの深さ = n
 * - 同じアイテムが複数経路で到達される場合は最大値を採用する
 *
 * テーブル表示のソート順（複雑なアイテムを上に表示）で使用される。
 *
 * @param root - ツリーのルートノード
 * @param depths - 結果を書き込む Map（複数ルートを処理する場合は使い回す）
 * @returns このルートの深さ
 */
export function computeItemDepths(root: CalculationNode, depths: Map<string, number>): number {
  if (root.isRawResource || root.children.length === 0) {
    depths.set(root.itemId, Math.max(depths.get(root.itemId) ?? 0, 0));
    return 0;
  }
  const maxChildDepth = Math.max(...root.children.map(c => computeItemDepths(c, depths)));
  const d = maxChildDepth + 1;
  depths.set(root.itemId, Math.max(depths.get(root.itemId) ?? 0, d));
  return d;
}

/**
 * 全ノードから建物種別ごとの設置台数と消費電力を集計する。
 *
 * 電力計算式: `powerConsumptionMW × overclockRate^1.6 × machineCount`
 * （オーバークロックによる電力増加は指数的に増大する）
 *
 * @param nodes - 集計対象の全ノード
 * @param context - 計算コンテキスト（建物マスター参照用）
 * @param recipes - レシピマスター（machineId 取得用）
 * @returns 建物種別ごとの集計結果
 */
export function calculateMachineSummary(
  nodes: CalculationNode[],
  context: CalculationContext,
  recipes: Record<string, Recipe>
): MachineSummary[] {
  const map = new Map<string, { count: number; powerConsumptionMW: number }>();

  for (const node of nodes) {
    if (node.isRawResource || !node.recipeId) continue;
    const recipe = recipes[node.recipeId];
    if (!recipe) continue;
    const machine = context.machines[recipe.machineId];
    if (!machine) continue;

    const overclockRate = node.overclockRate;
    // オーバークロック時の消費電力: P × rate^1.6 × 台数
    const powerMW = machine.powerConsumptionMW * Math.pow(overclockRate, 1.6) * node.machineCount;

    const existing = map.get(recipe.machineId);
    if (existing) {
      existing.count += node.machineCount;
      existing.powerConsumptionMW += powerMW;
    } else {
      map.set(recipe.machineId, { count: node.machineCount, powerConsumptionMW: powerMW });
    }
  }

  return Array.from(map.entries()).map(([machineId, data]) => ({
    machineId,
    count: data.count,
    powerConsumptionMW: data.powerConsumptionMW,
  }));
}

/**
 * 生産プランの計算をメインエントリポイント。
 *
 * 処理フロー:
 * 1. レシピのアウトプット逆引きマップを構築
 * 2. 各生産目標の依存ツリーを構築
 * 3. 全ノードをフラット化して集計・ソート
 * 4. 建物サマリーと総電力を算出
 *
 * テーブルの表示順（`flatItems` のソート）:
 * - 生産目標アイテムはプランの設定順を保持
 * - それ以外は「葉からの深さ」降順（複雑なアイテムが上）
 *
 * @param plan - 計算対象のプラン（生産目標・レシピオーバーライド・OCR 設定を含む）
 * @param gameData - ゲームマスターデータ
 * @returns 計算結果（依存ツリー・集計アイテム・建物サマリー・総電力）
 */
export function calculate(plan: ProductionPlan, gameData: {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  machines: Record<string, { powerConsumptionMW: number }>;
}): CalculationResult {
  // レシピのアウトプット逆引きマップを構築（itemId → そのアイテムを産出するレシピ一覧）
  const recipesByOutput: Record<string, Recipe[]> = {};
  for (const recipe of Object.values(gameData.recipes)) {
    for (const output of recipe.outputs) {
      if (!recipesByOutput[output.itemId]) recipesByOutput[output.itemId] = [];
      recipesByOutput[output.itemId].push(recipe);
    }
  }

  const context: CalculationContext = {
    ...gameData,
    recipesByOutput,
    recipeOverrides: plan.recipeOverrides,
    overclock: plan.overclock,
  };

  // 各生産目標の依存ツリーを構築
  const roots = plan.targets.map(target =>
    buildDependencyTree(target.itemId, target.amountPerMinute, context)
  );

  const allNodes = roots.flatMap(flattenTree);

  // テーブルソート用に各アイテムの深さを計算
  const itemDepths = new Map<string, number>();
  for (const root of roots) computeItemDepths(root, itemDepths);

  // 生産目標アイテムの表示順を安定させるためのインデックスマップ
  const targetOrder = new Map(plan.targets.map((t, i) => [t.itemId, i]));

  const flatItems = aggregateItems(allNodes).sort((a, b) => {
    const aIdx = targetOrder.get(a.itemId);
    const bIdx = targetOrder.get(b.itemId);
    // 両方が目標 → プランの設定順を維持
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    // a のみが目標 → a を先頭に
    if (aIdx !== undefined) return -1;
    // b のみが目標 → b を先頭に
    if (bIdx !== undefined) return 1;
    // どちらも目標でない → 深さ降順（複雑なアイテムが上）
    return (itemDepths.get(b.itemId) ?? 0) - (itemDepths.get(a.itemId) ?? 0);
  });

  const machineSummary = calculateMachineSummary(allNodes, context, gameData.recipes);
  const totalPowerMW = machineSummary.reduce((sum, m) => sum + m.powerConsumptionMW, 0);

  return { nodes: roots, flatItems, machineSummary, totalPowerMW };
}
