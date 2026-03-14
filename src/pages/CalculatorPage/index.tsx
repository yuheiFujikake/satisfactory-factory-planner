import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';
import TargetPanel from './TargetPanel';
import ResultPanel from './ResultPanel';
import RecipeSelector from './RecipeSelector';
import { useCalculation } from '../../hooks/useCalculation';
import { useCalculationStore } from '../../stores/calculationStore';
import { usePlanStore } from '../../stores/planStore';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useIsMobile } from '../../hooks/useIsMobile';

type MobilePanel = 'targets' | 'results';

export default function CalculatorPage() {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const gameData = useGameDataStore(useShallow(s => ({ items: s.items, recipes: s.recipes, machines: s.machines })));
  const calculate = useCalculationStore(s => s.calculate);
  const isMobile = useIsMobile();
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('targets');

  useCalculation(true, 600);

  const handleManualCalculate = () => {
    if (currentPlan) {
      calculate(currentPlan, gameData);
      if (isMobile) setMobilePanel('results');
    }
  };

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', backgroundColor: '#1a1a2e' }}>
        {/* Mobile tab switcher */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid #0f3460',
          backgroundColor: '#16213e',
          flexShrink: 0,
        }}>
          <button
            onClick={() => setMobilePanel('targets')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: mobilePanel === 'targets' ? 'rgba(245,166,35,0.15)' : 'transparent',
              color: mobilePanel === 'targets' ? '#f5a623' : '#a0a0b0',
              fontSize: '13px',
              fontWeight: mobilePanel === 'targets' ? 700 : 400,
              cursor: 'pointer',
              borderBottom: mobilePanel === 'targets' ? '2px solid #f5a623' : '2px solid transparent',
            }}
          >
            🎯 目標設定
          </button>
          <button
            onClick={() => setMobilePanel('results')}
            style={{
              flex: 1,
              padding: '12px 0',
              border: 'none',
              background: mobilePanel === 'results' ? 'rgba(245,166,35,0.15)' : 'transparent',
              color: mobilePanel === 'results' ? '#f5a623' : '#a0a0b0',
              fontSize: '13px',
              fontWeight: mobilePanel === 'results' ? 700 : 400,
              cursor: 'pointer',
              borderBottom: mobilePanel === 'results' ? '2px solid #f5a623' : '2px solid transparent',
            }}
          >
            📊 計算結果
          </button>
        </div>

        {/* Panel content */}
        <div style={{ flex: 1, overflow: 'hidden', display: 'flex' }}>
          {mobilePanel === 'targets' && (
            <TargetPanel onCalculate={handleManualCalculate} />
          )}
          {mobilePanel === 'results' && (
            <ResultPanel />
          )}
        </div>

        <RecipeSelector />
      </div>
    );
  }

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
