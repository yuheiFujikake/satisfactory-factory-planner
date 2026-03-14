import type { ProductionPlan } from '../types/plan.types';

const CURRENT_VERSION = 1;

export function migratePlan(plan: ProductionPlan): ProductionPlan {
  if (plan.version === CURRENT_VERSION) return plan;
  // Future migrations go here
  return { ...plan, version: CURRENT_VERSION };
}
