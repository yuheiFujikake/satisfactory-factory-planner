import type { Recipe } from '../types/game.types';
import { useGameDataStore } from '../stores/gameDataStore';
import { useSettingsStore } from '../stores/settingsStore';
import { formatRate } from '../utils/math';

interface RecipeCardProps {
  recipe: Recipe;
  selected?: boolean;
  onClick?: () => void;
}

export default function RecipeCard({ recipe, selected, onClick }: RecipeCardProps) {
  const items = useGameDataStore(s => s.items);
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const machine = machines[recipe.machineId];
  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : recipe.machineId;
  const recipeName = language === 'ja' ? recipe.nameJa : recipe.name;

  return (
    <div
      onClick={onClick}
      style={{
        background: selected ? 'rgba(245, 166, 35, 0.1)' : '#0f3460',
        border: `2px solid ${selected ? '#f5a623' : '#1a3a6a'}`,
        borderRadius: '8px',
        padding: '12px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <div style={{ fontWeight: 700, color: selected ? '#f5a623' : '#e0e0e0', fontSize: '13px' }}>
          {recipeName}
        </div>
        {recipe.isAlternate && (
          <span style={{
            background: 'rgba(255, 152, 0, 0.2)',
            border: '1px solid rgba(255, 152, 0, 0.5)',
            color: '#ff9800',
            fontSize: '10px',
            padding: '1px 6px',
            borderRadius: '3px',
          }}>
            代替
          </span>
        )}
      </div>

      <div style={{ fontSize: '11px', color: '#a0a0b0', marginBottom: '8px' }}>
        🏭 {machineName} • ⏱️ {recipe.craftTimeSeconds}s
      </div>

      {/* Inputs */}
      <div style={{ marginBottom: '6px' }}>
        <div style={{ fontSize: '10px', color: '#a0a0b0', marginBottom: '4px' }}>INPUT</div>
        {recipe.inputs.map(input => {
          const item = items[input.itemId];
          const name = item ? (language === 'ja' ? item.nameJa : item.name) : input.itemId;
          return (
            <div key={input.itemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e0e0e0', marginBottom: '2px' }}>
              <span>{name}</span>
              <span style={{ color: '#ff9800' }}>{formatRate(input.amountPerMinute)}/min</span>
            </div>
          );
        })}
      </div>

      {/* Outputs */}
      <div>
        <div style={{ fontSize: '10px', color: '#a0a0b0', marginBottom: '4px' }}>OUTPUT</div>
        {recipe.outputs.map(output => {
          const item = items[output.itemId];
          const name = item ? (language === 'ja' ? item.nameJa : item.name) : output.itemId;
          return (
            <div key={output.itemId} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#e0e0e0', marginBottom: '2px' }}>
              <span>{name}</span>
              <span style={{ color: '#4caf50' }}>{formatRate(output.amountPerMinute)}/min</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
