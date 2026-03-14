import type { CalculationNode } from '../types/calculation.types';
import type { MachineSummary } from '../types/calculation.types';
import type { Recipe, Machine } from '../types/game.types';

export function countMachines(
  nodes: CalculationNode[],
  recipes: Record<string, Recipe>,
  machines: Record<string, Machine>
): MachineSummary[] {
  const map = new Map<string, { count: number; powerConsumptionMW: number }>();

  for (const node of nodes) {
    if (node.isRawResource || !node.recipeId) continue;
    const recipe = recipes[node.recipeId];
    if (!recipe) continue;
    const machine = machines[recipe.machineId];
    if (!machine) continue;

    const powerMW = machine.powerConsumptionMW * Math.pow(node.overclockRate, 1.6) * node.machineCount;

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
