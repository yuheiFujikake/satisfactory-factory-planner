import type { CalculationNode } from '../types/calculation.types';
import type { MachineSummary } from '../types/calculation.types';
import type { Recipe, Machine } from '../types/game.types';

/**
 * ノード配列から建物種別ごとの設置台数と消費電力を集計する。
 *
 * `calculator.ts` の `calculateMachineSummary` と同等のロジック。
 * 依存グラフ表示など、計算ストア外で単体利用する場合に使用する。
 *
 * 電力計算式: `powerConsumptionMW × overclockRate^1.6 × machineCount`
 *
 * @param nodes - 集計対象のノード配列
 * @param recipes - レシピマスター（machineId 取得用）
 * @param machines - 建物マスター（消費電力取得用）
 * @returns 建物種別ごとの集計結果
 */
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

    // オーバークロック時の消費電力: P × rate^1.6 × 台数
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
