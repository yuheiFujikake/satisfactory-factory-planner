export interface CalculationNode {
  itemId: string;
  recipeId?: string;
  requiredPerMinute: number;
  machineCount: number;
  machineCountExact: number;
  overclockRate: number;
  children: CalculationNode[];
  isRawResource: boolean;
  isCyclic?: boolean;
}

export interface MachineSummary {
  machineId: string;
  count: number;
  powerConsumptionMW: number;
}

export interface AggregatedItem {
  itemId: string;
  totalPerMinute: number;
}

export interface CalculationResult {
  nodes: CalculationNode[];
  flatItems: AggregatedItem[];
  machineSummary: MachineSummary[];
  totalPowerMW: number;
}
