import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { useGameDataStore } from '../../stores/gameDataStore';
import { useSettingsStore } from '../../stores/settingsStore';

/** MachineNode のデータ型 */
interface MachineNodeData {
  /** マシン ID */
  machineId: string;
  /** 建物台数 */
  count: number;
  /** 消費電力（MW） */
  powerConsumptionMW: number;
  [key: string]: unknown;
}

/**
 * 依存グラフ上でマシン情報を表示するノードコンポーネント。
 *
 * 建物名・台数・消費電力を表示する。
 * `React.memo` でラップして不要な再レンダリングを防ぐ。
 */
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
      <div style={{ marginTop: '4px' }}>台数: <strong>{nodeData.count}</strong></div>
      <div>消費電力: <strong>{nodeData.powerConsumptionMW.toFixed(1)} MW</strong></div>
      <Handle type="source" position={Position.Bottom} style={{ background: '#ff9800' }} />
    </div>
  );
});

MachineNode.displayName = 'MachineNode';

export default MachineNode;
