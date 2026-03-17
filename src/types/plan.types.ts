/**
 * 生産計画の個別目標を表すインターフェース。
 *
 * 「どのアイテムを毎分いくつ生産したいか」を保持する。
 */
export interface ProductionTarget {
  /** 目標 ID（UUID） */
  id: string;
  /** 生産したいアイテムの ID */
  itemId: string;
  /** 目標生産量（毎分） */
  amountPerMinute: number;
}

/**
 * 工場グループを表すインターフェース。
 *
 * 複数の生産目標をグループ化して管理するための情報を保持する。
 */
export interface FactoryGroup {
  /** グループ ID（UUID） */
  id: string;
  /** グループ名 */
  name: string;
  /** グループカラー（CSS カラー文字列） */
  color: string;
  /** グループに属する生産目標 ID の配列 */
  targetIds: string[];
  /** グループのメモ */
  note: string;
}

/**
 * 生産プランを表すインターフェース。
 *
 * 生産目標・レシピオーバーライド・オーバークロック設定・グループ情報を包括する。
 * localStorage に JSON として永続化される。
 */
export interface ProductionPlan {
  /** プラン ID（UUID） */
  id: string;
  /** プラン名 */
  name: string;
  /** 作成日時（ISO 8601 文字列） */
  createdAt: string;
  /** 最終更新日時（ISO 8601 文字列） */
  updatedAt: string;
  /** データスキーマのバージョン（マイグレーション判定に使用） */
  version: number;
  /** 生産目標の一覧 */
  targets: ProductionTarget[];
  /** アイテム ID → レシピ ID のオーバーライド設定 */
  recipeOverrides: Record<string, string>;
  /** アイテム ID → オーバークロック率（1.0 = 100%）のマップ */
  overclock: Record<string, number>;
  /** 工場グループの一覧 */
  groups: FactoryGroup[];
}

/**
 * アプリケーション設定を表すインターフェース。
 *
 * localStorage の `sfp-settings` キーに永続化される。
 */
export interface AppSettings {
  /** 表示言語（"ja" = 日本語, "en" = 英語） */
  language: "ja" | "en";
  /** カラーテーマ */
  theme: "dark" | "light" | "system";
  /** デフォルトオーバークロック率（1.0 = 100%） */
  defaultOverclock: number;
  /** 代替レシピ（オルタネート）を表示するかどうか */
  showAlternateRecipes: boolean;
}
