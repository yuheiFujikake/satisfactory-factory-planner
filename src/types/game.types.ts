/**
 * ゲーム内アイテムのカテゴリ分類。
 *
 * アイテムの種別を表す文字列リテラル型。
 * UI のフィルタリングやアイコン表示に使用する。
 */
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

/**
 * ゲーム内マシンのカテゴリ分類。
 */
export type MachineCategory = "smelter" | "constructor" | "assembler" | "manufacturer" | "refinery" | "blender" | "particle_accelerator" | "miner" | "other";

/**
 * ゲーム内アイテムを表すインターフェース。
 */
export interface Item {
  /** アイテム ID（英数字スネークケース） */
  id: string;
  /** 英語名 */
  name: string;
  /** 日本語名 */
  nameJa: string;
  /** アイテムカテゴリ */
  category: ItemCategory;
  /** ゲーム内ティア（解放段階） */
  tier: number;
  /** スタックサイズ */
  stackSize: number;
  /** AWESOME シンクへの投入ポイント */
  sinkPoints: number;
  /** アイコン画像 URL（省略可） */
  iconUrl?: string;
}

/**
 * レシピの入出力アイテムエントリを表すインターフェース。
 */
export interface RecipeItem {
  /** アイテム ID */
  itemId: string;
  /** 1サイクルあたりの数量 */
  amountPerCycle: number;
  /** 毎分あたりの数量 */
  amountPerMinute: number;
}

/**
 * 製造レシピを表すインターフェース。
 */
export interface Recipe {
  /** レシピ ID */
  id: string;
  /** 英語名 */
  name: string;
  /** 日本語名 */
  nameJa: string;
  /** 代替レシピかどうか（`true` = オルタネートレシピ） */
  isAlternate: boolean;
  /** 使用するマシンの ID */
  machineId: string;
  /** 製造時間（秒） */
  craftTimeSeconds: number;
  /** 入力アイテムのリスト */
  inputs: RecipeItem[];
  /** 出力アイテムのリスト */
  outputs: RecipeItem[];
}

/**
 * 製造マシンを表すインターフェース。
 */
export interface Machine {
  /** マシン ID */
  id: string;
  /** 英語名 */
  name: string;
  /** 日本語名 */
  nameJa: string;
  /** マシンカテゴリ */
  category: MachineCategory;
  /** 基本消費電力（MW） */
  powerConsumptionMW: number;
  /** オーバークロック設定 */
  overclock: {
    /** 最小オーバークロック率 */
    min: number;
    /** 最大オーバークロック率 */
    max: number;
    /** デフォルトオーバークロック率 */
    default: number;
  };
  /** アイコン画像 URL（省略可） */
  iconUrl?: string;
}

/**
 * マップ上の資源ノードを表すインターフェース。
 *
 * 採掘機を設置できる鉱脈の情報を保持する。
 */
export interface ResourceNode {
  /** リソースノード ID */
  id: string;
  /** 採掘されるアイテムの ID */
  itemId: string;
  /** 採掘ノードの純度（採掘速度に影響） */
  purity: "impure" | "normal" | "pure";
  /** 基本採掘レート（毎分） */
  baseExtractionRate: number;
}
