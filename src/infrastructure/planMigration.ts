import type { ProductionPlan } from '../types/plan.types';

/** アプリケーションの現行プランバージョン */
const CURRENT_VERSION = 1;

/**
 * 旧バージョンのプランデータを現行バージョンに移行する。
 *
 * バージョンが一致している場合はそのまま返す。
 * 新しいバージョンへの移行ロジックはここに追加していく。
 *
 * @param plan - 移行対象のプランデータ
 * @returns 現行バージョンに移行済みのプランデータ
 */
export function migratePlan(plan: ProductionPlan): ProductionPlan {
  if (plan.version === CURRENT_VERSION) return plan;
  // 将来のマイグレーション処理をここに追加
  return { ...plan, version: CURRENT_VERSION };
}
