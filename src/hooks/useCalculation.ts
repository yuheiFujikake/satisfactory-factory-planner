import { useEffect, useRef, useCallback } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { usePlanStore } from '../stores/planStore';
import { useGameDataStore } from '../stores/gameDataStore';
import { useCalculationStore } from '../stores/calculationStore';

export function useCalculation(autoCalculate = true, debounceMs = 500) {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const gameData = useGameDataStore(useShallow(s => ({
    items: s.items,
    recipes: s.recipes,
    machines: s.machines,
  })));
  const calculate = useCalculationStore(s => s.calculate);
  const clear = useCalculationStore(s => s.clear);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const runCalculation = useCallback(() => {
    if (!currentPlan || currentPlan.targets.length === 0) {
      clear();
      return;
    }
    calculate(currentPlan, gameData);
  }, [currentPlan, gameData, calculate, clear]);

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
