import type { Recipe, Item } from '../types/game.types';
import type { CalculationNode, CalculationResult, AggregatedItem, MachineSummary } from '../types/calculation.types';
import type { ProductionPlan } from '../types/plan.types';

export interface CalculationContext {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  machines: Record<string, { powerConsumptionMW: number }>;
  recipesByOutput: Record<string, Recipe[]>;
  recipeOverrides: Record<string, string>;
  overclock: Record<string, number>;
}

export function getSelectedRecipe(itemId: string, context: CalculationContext): Recipe | undefined {
  if (context.recipeOverrides[itemId]) {
    return context.recipes[context.recipeOverrides[itemId]];
  }
  const recipes = context.recipesByOutput[itemId] || [];
  return recipes.find(r => !r.isAlternate) || recipes[0];
}

export function buildDependencyTree(
  itemId: string,
  targetRate: number,
  context: CalculationContext,
  visited: Set<string> = new Set()
): CalculationNode {
  const recipe = getSelectedRecipe(itemId, context);

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

  const overclockRate = context.overclock[itemId] ?? 1.0;
  const effectiveOutputRate = outputItem.amountPerMinute * overclockRate;
  const multiplier = targetRate / effectiveOutputRate;
  const machineCountExact = multiplier;
  const machineCount = Math.ceil(machineCountExact);

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

export function aggregateItems(nodes: CalculationNode[]): AggregatedItem[] {
  const map = new Map<string, number>();
  for (const node of nodes) {
    map.set(node.itemId, (map.get(node.itemId) ?? 0) + node.requiredPerMinute);
  }
  return Array.from(map.entries()).map(([itemId, totalPerMinute]) => ({ itemId, totalPerMinute }));
}

/**
 * Compute each item's depth from leaf nodes (raw resource = 0, n-step item = n).
 * Result is written into the provided depths map, taking the max across all paths.
 */
function computeItemDepths(root: CalculationNode, depths: Map<string, number>): number {
  if (root.isRawResource || root.children.length === 0) {
    depths.set(root.itemId, Math.max(depths.get(root.itemId) ?? 0, 0));
    return 0;
  }
  const maxChildDepth = Math.max(...root.children.map(c => computeItemDepths(c, depths)));
  const d = maxChildDepth + 1;
  depths.set(root.itemId, Math.max(depths.get(root.itemId) ?? 0, d));
  return d;
}

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

export function calculate(plan: ProductionPlan, gameData: {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  machines: Record<string, { powerConsumptionMW: number }>;
}): CalculationResult {
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

  const roots = plan.targets.map(target =>
    buildDependencyTree(target.itemId, target.amountPerMinute, context)
  );

  const allNodes = roots.flatMap(flattenTree);

  // Compute depth-from-leaves for each item (used for table sort order)
  const itemDepths = new Map<string, number>();
  for (const root of roots) computeItemDepths(root, itemDepths);

  // Target order map for stable ordering of top-level goals
  const targetOrder = new Map(plan.targets.map((t, i) => [t.itemId, i]));

  const flatItems = aggregateItems(allNodes).sort((a, b) => {
    const aIdx = targetOrder.get(a.itemId);
    const bIdx = targetOrder.get(b.itemId);
    // Both are targets → preserve plan order
    if (aIdx !== undefined && bIdx !== undefined) return aIdx - bIdx;
    // Only a is target → a comes first
    if (aIdx !== undefined) return -1;
    // Only b is target → b comes first
    if (bIdx !== undefined) return 1;
    // Neither is target → sort by depth descending (most complex first)
    return (itemDepths.get(b.itemId) ?? 0) - (itemDepths.get(a.itemId) ?? 0);
  });

  const machineSummary = calculateMachineSummary(allNodes, context, gameData.recipes);
  const totalPowerMW = machineSummary.reduce((sum, m) => sum + m.powerConsumptionMW, 0);

  return { nodes: roots, flatItems, machineSummary, totalPowerMW };
}
