import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';

interface MachineNodeData {
  machineId: string;
  count: number;
  powerConsumptionMW: number;
  [key: string]: unknown;
}

const MachineNode = memo(({ data }: NodeProps) => {
  const nodeData = data as MachineNodeData;
  const machines = useGameDataStore(s => s.machines);
  const language = useSettingsStore(s => s.language);

  const machine = machines[nodeData.machineId];
  const machineName = machine ? (language === 'ja' ? machine.nameJa : machine.name) : nodeData.machineId;

  return (
    <div
      style={{
        background: '#1a1a2e',
        border: '2px solid #ff9800',
        borderRadius: '8px',
        padding: '10px 14px',
        minWidth: '180px',
        color: '#e0e0e0',
        fontSize: '12px',
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#ff9800' }} />
      <div style={{ color: '#ff9800', fontWeight: 700 }}>🏭 {machineName}</div>
      <div style={{ marginTop: '4px' }}>Count: <strong>{nodeData.count}</strong></div>
      <div>Power: <strong>{nodeData.powerConsumptionMW.toFixed(1)} MW</strong></div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#ff9800' }} />
    </div>
  );
});

MachineNode.displayName = 'MachineNode';

export default MachineNode;
