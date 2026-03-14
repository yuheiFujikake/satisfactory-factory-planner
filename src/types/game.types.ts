export type ItemCategory =
  | "ore"           // 資源（鉱石類）
  | "ingot"         // インゴット
  | "standard_part" // 基本部品
  | "electronic"    // 電子機器
  | "industrial"    // 産業用部品
  | "communication" // 通信
  | "petroleum"     // 石油製品
  | "fuel"          // 燃料
  | "mineral"       // 鉱物（コンクリート等）
  | "advanced"      // 先進的な精製
  | "nuclear"       // 原子力
  | "space_elevator"// 軌道エレベーター
  | "fluid"         // 流体（液体系資源）
  | "equipment"     // 装備
  | "special";      // その他

export type MachineCategory = "smelter" | "constructor" | "assembler" | "manufacturer" | "refinery" | "blender" | "particle_accelerator" | "miner" | "other";

export interface Item {
  id: string;
  name: string;
  nameJa: string;
  category: ItemCategory;
  tier: number;
  stackSize: number;
  sinkPoints: number;
  iconUrl?: string;
}

export interface RecipeItem {
  itemId: string;
  amountPerCycle: number;
  amountPerMinute: number;
}

export interface Recipe {
  id: string;
  name: string;
  nameJa: string;
  isAlternate: boolean;
  machineId: string;
  craftTimeSeconds: number;
  inputs: RecipeItem[];
  outputs: RecipeItem[];
}

export interface Machine {
  id: string;
  name: string;
  nameJa: string;
  category: MachineCategory;
  powerConsumptionMW: number;
  overclock: {
    min: number;
    max: number;
    default: number;
  };
  iconUrl?: string;
}

export interface ResourceNode {
  id: string;
  itemId: string;
  purity: "impure" | "normal" | "pure";
  baseExtractionRate: number;
}
