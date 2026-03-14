import { create } from 'zustand';
import type { CalculationResult } from '../types/calculation.types';
import type { ProductionPlan } from '../types/plan.types';
import type { Item, Recipe, Machine } from '../types/game.types';
import { calculate } from '../domain/calculator';

interface CalculationStore {
  result: CalculationResult | null;
  isCalculating: boolean;
  calculate: (plan: ProductionPlan, gameData: { items: Record<string, Item>; recipes: Record<string, Recipe>; machines: Record<string, Machine> }) => void;
  clear: () => void;
}

export const useCalculationStore = create<CalculationStore>((set) => ({
  result: null,
  isCalculating: false,

  calculate: (plan, gameData) => {
    set({ isCalculating: true });
    try {
      const result = calculate(plan, gameData);
      set({ result, isCalculating: false });
    } catch (e) {
      console.error('Calculation error', e);
      set({ isCalculating: false });
    }
  },

  clear: () => set({ result: null }),
}));
