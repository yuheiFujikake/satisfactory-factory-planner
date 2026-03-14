import { create } from 'zustand';
import type { ProductionPlan, ProductionTarget } from '../types/plan.types';
import { generateId } from '../utils/uuid';
import { savePlans, loadPlans } from '../infrastructure/storage';

interface PlanStore {
  currentPlan: ProductionPlan | null;
  savedPlans: ProductionPlan[];
  createPlan: (name: string) => void;
  loadPlan: (planId: string) => void;
  savePlan: () => void;
  deletePlan: (planId: string) => void;
  addTarget: (itemId: string, amountPerMinute: number) => void;
  removeTarget: (targetId: string) => void;
  updateTarget: (targetId: string, updates: Partial<ProductionTarget>) => void;
  setRecipeOverride: (itemId: string, recipeId: string) => void;
  updatePlanName: (name: string) => void;
  exportPlan: () => string;
  importPlan: (json: string) => void;
  initFromStorage: () => void;
}

function createNewPlan(name: string): ProductionPlan {
  const now = new Date().toISOString();
  return {
    id: generateId(),
    name,
    createdAt: now,
    updatedAt: now,
    version: 1,
    targets: [],
    recipeOverrides: {},
    overclock: {},
    groups: [],
  };
}

export const usePlanStore = create<PlanStore>((set, get) => ({
  currentPlan: null,
  savedPlans: [],

  createPlan: (name) => {
    const plan = createNewPlan(name);
    set(state => {
      const savedPlans = [...state.savedPlans, plan];
      savePlans(savedPlans);
      return { currentPlan: plan, savedPlans };
    });
  },

  loadPlan: (planId) => {
    const plan = get().savedPlans.find(p => p.id === planId);
    if (plan) set({ currentPlan: plan });
  },

  savePlan: () => {
    const { currentPlan, savedPlans } = get();
    if (!currentPlan) return;
    const updated = { ...currentPlan, updatedAt: new Date().toISOString() };
    const newSaved = savedPlans.map(p => p.id === updated.id ? updated : p);
    if (!newSaved.find(p => p.id === updated.id)) newSaved.push(updated);
    savePlans(newSaved);
    set({ currentPlan: updated, savedPlans: newSaved });
  },

  deletePlan: (planId) => {
    set(state => {
      const savedPlans = state.savedPlans.filter(p => p.id !== planId);
      savePlans(savedPlans);
      const currentPlan = state.currentPlan?.id === planId
        ? (savedPlans[0] || null)
        : state.currentPlan;
      return { savedPlans, currentPlan };
    });
  },

  addTarget: (itemId, amountPerMinute) => {
    set(state => {
      if (!state.currentPlan) return state;
      const target: ProductionTarget = { id: generateId(), itemId, amountPerMinute };
      const updated = {
        ...state.currentPlan,
        targets: [...state.currentPlan.targets, target],
        updatedAt: new Date().toISOString(),
      };
      const savedPlans = state.savedPlans.map(p => p.id === updated.id ? updated : p);
      savePlans(savedPlans);
      return { currentPlan: updated, savedPlans };
    });
  },

  removeTarget: (targetId) => {
    set(state => {
      if (!state.currentPlan) return state;
      const updated = {
        ...state.currentPlan,
        targets: state.currentPlan.targets.filter(t => t.id !== targetId),
        updatedAt: new Date().toISOString(),
      };
      const savedPlans = state.savedPlans.map(p => p.id === updated.id ? updated : p);
      savePlans(savedPlans);
      return { currentPlan: updated, savedPlans };
    });
  },

  updateTarget: (targetId, updates) => {
    set(state => {
      if (!state.currentPlan) return state;
      const updated = {
        ...state.currentPlan,
        targets: state.currentPlan.targets.map(t =>
          t.id === targetId ? { ...t, ...updates } : t
        ),
        updatedAt: new Date().toISOString(),
      };
      const savedPlans = state.savedPlans.map(p => p.id === updated.id ? updated : p);
      savePlans(savedPlans);
      return { currentPlan: updated, savedPlans };
    });
  },

  setRecipeOverride: (itemId, recipeId) => {
    set(state => {
      if (!state.currentPlan) return state;
      const updated = {
        ...state.currentPlan,
        recipeOverrides: { ...state.currentPlan.recipeOverrides, [itemId]: recipeId },
        updatedAt: new Date().toISOString(),
      };
      const savedPlans = state.savedPlans.map(p => p.id === updated.id ? updated : p);
      savePlans(savedPlans);
      return { currentPlan: updated, savedPlans };
    });
  },

  updatePlanName: (name) => {
    set(state => {
      if (!state.currentPlan) return state;
      const updated = { ...state.currentPlan, name, updatedAt: new Date().toISOString() };
      const savedPlans = state.savedPlans.map(p => p.id === updated.id ? updated : p);
      savePlans(savedPlans);
      return { currentPlan: updated, savedPlans };
    });
  },

  exportPlan: () => {
    const { currentPlan } = get();
    return JSON.stringify(currentPlan, null, 2);
  },

  importPlan: (json) => {
    try {
      const plan = JSON.parse(json) as ProductionPlan;
      set(state => {
        const savedPlans = [...state.savedPlans.filter(p => p.id !== plan.id), plan];
        savePlans(savedPlans);
        return { currentPlan: plan, savedPlans };
      });
    } catch (e) {
      console.error('Failed to import plan', e);
    }
  },

  initFromStorage: () => {
    const savedPlans = loadPlans();
    set({ savedPlans });
    if (savedPlans.length > 0) set({ currentPlan: savedPlans[0] });
  },
}));
