import type { ProductionPlan } from '../types/plan.types';

const PLANS_KEY = 'sfp-saved-plans';

export function savePlans(plans: ProductionPlan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('Failed to save plans', e);
  }
}

export function loadPlans(): ProductionPlan[] {
  try {
    const data = localStorage.getItem(PLANS_KEY);
    if (data) return JSON.parse(data) as ProductionPlan[];
  } catch (e) {
    console.error('Failed to load plans', e);
  }
  return [];
}
