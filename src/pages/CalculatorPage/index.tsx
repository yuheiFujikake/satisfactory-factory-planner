import { useShallow } from 'zustand/react/shallow';
import TargetPanel from './TargetPanel';
import ResultPanel from './ResultPanel';
import RecipeSelector from './RecipeSelector';
import { useCalculation } from '../../hooks/useCalculation';
import { useCalculationStore } from '../../stores/calculationStore';
import { usePlanStore } from '../../stores/planStore';
import { useGameDataStore } from '../../stores/gameDataStore';

export default function CalculatorPage() {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const gameData = useGameDataStore(useShallow(s => ({ items: s.items, recipes: s.recipes, machines: s.machines })));
  const calculate = useCalculationStore(s => s.calculate);

  // Auto-calculate on plan changes
  useCalculation(true, 600);

  const handleManualCalculate = () => {
    if (currentPlan) calculate(currentPlan, gameData);
  };

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      backgroundColor: '#1a1a2e',
    }}>
      <TargetPanel onCalculate={handleManualCalculate} />
      <ResultPanel />
      <RecipeSelector />
    </div>
  );
}
