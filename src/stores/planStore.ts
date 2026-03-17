import { create } from 'zustand';
import type { ProductionPlan, ProductionTarget } from '../types/plan.types';
import { generateId } from '../utils/uuid';
import { savePlans, loadPlans } from '../infrastructure/storage';

/**
 * プラン管理ストアのインターフェース定義。
 *
 * `currentPlan` が現在編集中のプラン、`savedPlans` が全保存済みプランの一覧。
 * 変更操作はすべて即座に localStorage に永続化される。
 */
interface PlanStore {
  /** 現在編集中のプラン（未選択の場合は `null`） */
  currentPlan: ProductionPlan | null;
  /** 全保存済みプランの一覧 */
  savedPlans: ProductionPlan[];
  /** 新規プランを作成して currentPlan にセットする */
  createPlan: (name: string) => void;
  /** 指定 ID のプランを currentPlan としてロードする */
  loadPlan: (planId: string) => void;
  /** currentPlan を savedPlans に保存する（updatedAt を更新） */
  savePlan: () => void;
  /** 指定 ID のプランを削除する。currentPlan が削除された場合は先頭プランに切り替える */
  deletePlan: (planId: string) => void;
  /** currentPlan に生産目標を追加する */
  addTarget: (itemId: string, amountPerMinute: number) => void;
  /** 指定 ID の生産目標を削除する */
  removeTarget: (targetId: string) => void;
  /** 指定 ID の生産目標を部分更新する */
  updateTarget: (targetId: string, updates: Partial<ProductionTarget>) => void;
  /** 指定アイテムのレシピオーバーライドを設定する */
  setRecipeOverride: (itemId: string, recipeId: string) => void;
  /** currentPlan の名前を更新する */
  updatePlanName: (name: string) => void;
  /** currentPlan を JSON 文字列としてエクスポートする */
  exportPlan: () => string;
  /** JSON 文字列からプランをインポートして currentPlan にセットする */
  importPlan: (json: string) => void;
  /** アプリ起動時に localStorage からプランを復元する */
  initFromStorage: () => void;
}

/**
 * 新しいプランオブジェクトを生成する。
 *
 * @param name - プラン名
 * @returns 初期状態のプランオブジェクト
 */
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

/**
 * 生産プランの管理を担う Zustand ストア。
 *
 * すべての変更操作は楽観的更新（即時 UI 反映）と同時に
 * `savePlans()` で localStorage に永続化される。
 */
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
    // savedPlans に存在しない場合（インポート直後など）は末尾に追加
    if (!newSaved.find(p => p.id === updated.id)) newSaved.push(updated);
    savePlans(newSaved);
    set({ currentPlan: updated, savedPlans: newSaved });
  },

  deletePlan: (planId) => {
    set(state => {
      const savedPlans = state.savedPlans.filter(p => p.id !== planId);
      savePlans(savedPlans);
      // 削除したプランが currentPlan だった場合は先頭プランに切り替え
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
        // 同一 ID のプランが既に存在する場合は上書き
        const savedPlans = [...state.savedPlans.filter(p => p.id !== plan.id), plan];
        savePlans(savedPlans);
        return { currentPlan: plan, savedPlans };
      });
    } catch (e) {
      console.error('プランのインポートに失敗しました', e);
    }
  },

  initFromStorage: () => {
    const savedPlans = loadPlans();
    set({ savedPlans });
    // 保存済みプランがあれば先頭を自動的にロード
    if (savedPlans.length > 0) set({ currentPlan: savedPlans[0] });
  },
}));
