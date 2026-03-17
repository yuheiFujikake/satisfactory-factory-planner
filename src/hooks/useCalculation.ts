import { useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlanStore } from '../stores/planStore';
import { useGameDataStore } from '../stores/gameDataStore';
import { useCalculationStore } from '../stores/calculationStore';

/**
 * プランの自動計算とデバウンス処理を担うカスタムフック。
 *
 * `currentPlan` またはゲームデータが変化するたびに、指定した遅延後に計算を実行する。
 * 生産目標が空の場合は計算結果をクリアする。
 *
 * @param autoCalculate - 自動計算を有効にするかどうか（デフォルト: `true`）
 * @param debounceMs - 計算実行までのデバウンス遅延（ミリ秒、デフォルト: 500）
 * @returns `runCalculation` — 手動で計算を実行するコールバック
 */
export function useCalculation(autoCalculate = true, debounceMs = 500) {
  const currentPlan = usePlanStore(s => s.currentPlan);
  // ゲームデータは頻繁に変わらないが、useShallow で不要な再レンダリングを防ぐ
  const gameData = useGameDataStore(useShallow(s => ({
    items: s.items,
    recipes: s.recipes,
    machines: s.machines,
  })));
  const calculate = useCalculationStore(s => s.calculate);
  const clear = useCalculationStore(s => s.clear);
  // デバウンス用タイマーの参照（再レンダリングをまたいで保持する）
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * 計算を即時実行するコールバック。
   * 目標が空の場合は計算結果をクリアする。
   */
  const runCalculation = useCallback(() => {
    if (!currentPlan || currentPlan.targets.length === 0) {
      clear();
      return;
    }
    calculate(currentPlan, gameData);
  }, [currentPlan, gameData, calculate, clear]);

  // autoCalculate が有効な場合、プランまたはゲームデータの変化をデバウンスして計算する
  useEffect(() => {
    if (!autoCalculate) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(runCalculation, debounceMs);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [autoCalculate, debounceMs, runCalculation]);

  return { runCalculation };
}
