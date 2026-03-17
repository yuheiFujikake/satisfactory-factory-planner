import { create } from 'zustand';
import type { CalculationResult } from '../types/calculation.types';
import type { ProductionPlan } from '../types/plan.types';
import type { Item, Recipe, Machine } from '../types/game.types';
import { calculate } from '../domain/calculator';

/**
 * 計算結果を保持するストアのインターフェース定義。
 *
 * 計算結果はメモリにのみ保持され、localStorage には永続化しない。
 * プランや設定が変更されたら再計算が必要。
 */
interface CalculationStore {
  /** 直近の計算結果（未計算の場合は `null`） */
  result: CalculationResult | null;
  /** 計算中フラグ（将来の非同期対応用） */
  isCalculating: boolean;
  /**
   * プランの計算を実行して結果を保存する。
   * @param plan - 計算対象のプラン
   * @param gameData - ゲームマスターデータ
   */
  calculate: (plan: ProductionPlan, gameData: { items: Record<string, Item>; recipes: Record<string, Recipe>; machines: Record<string, Machine> }) => void;
  /** 計算結果をクリアする */
  clear: () => void;
}

/**
 * 計算結果を管理する Zustand ストア。
 *
 * `calculate()` を呼ぶと `domain/calculator.ts` の計算ロジックを実行し、
 * 結果を `result` に格納する。エラー時は `isCalculating` を `false` に戻す。
 */
export const useCalculationStore = create<CalculationStore>((set) => ({
  result: null,
  isCalculating: false,

  calculate: (plan, gameData) => {
    set({ isCalculating: true });
    try {
      const result = calculate(plan, gameData);
      set({ result, isCalculating: false });
    } catch (e) {
      console.error('計算エラー', e);
      set({ isCalculating: false });
    }
  },

  clear: () => set({ result: null }),
}));
