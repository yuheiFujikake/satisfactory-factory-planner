/**
 * 計算ツリーの1ノードを表すインターフェース。
 *
 * 再帰的な木構造で依存関係を表現する。
 * ルートノードが生産目標アイテム、子ノードがその材料を示す。
 */
export interface CalculationNode {
  /** アイテム ID */
  itemId: string;
  /** 使用するレシピの ID（raw リソースの場合は未定義） */
  recipeId?: string;
  /** このノードで必要な生産量（毎分） */
  requiredPerMinute: number;
  /** 必要なマシン台数（切り上げ整数） */
  machineCount: number;
  /** 必要なマシン台数（小数含む正確な値） */
  machineCountExact: number;
  /** オーバークロック率（1.0 = 100%） */
  overclockRate: number;
  /** 材料ノードの配列（依存する中間素材・raw リソース） */
  children: CalculationNode[];
  /** raw リソース（採掘物）かどうか */
  isRawResource: boolean;
  /** 循環依存が検出されたノードかどうか（循環ガード用） */
  isCyclic?: boolean;
}

/**
 * マシン種別ごとの集計サマリー。
 */
export interface MachineSummary {
  /** マシン ID */
  machineId: string;
  /** 必要台数（切り上げ整数） */
  count: number;
  /** 合計消費電力（MW） */
  powerConsumptionMW: number;
}

/**
 * アイテムごとの合計生産量を表す集計エントリ。
 */
export interface AggregatedItem {
  /** アイテム ID */
  itemId: string;
  /** 合計必要量（毎分） */
  totalPerMinute: number;
}

/**
 * 計算実行の最終結果を格納するインターフェース。
 */
export interface CalculationResult {
  /** 生産目標ごとの計算ツリーのルートノード配列 */
  nodes: CalculationNode[];
  /** 全ツリーを横断したアイテム別合計量の一覧 */
  flatItems: AggregatedItem[];
  /** マシン種別ごとの集計サマリー */
  machineSummary: MachineSummary[];
  /** 工場全体の合計消費電力（MW） */
  totalPowerMW: number;
}
