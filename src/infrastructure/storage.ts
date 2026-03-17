import type { ProductionPlan } from '../types/plan.types';

/** localStorage に使用するキー */
const PLANS_KEY = 'sfp-saved-plans';

/**
 * 全プランを localStorage に保存する。
 *
 * JSON のシリアライズ失敗やストレージ容量超過時は
 * コンソールにエラーを出力して処理を続行する。
 *
 * @param plans - 保存するプランの配列
 */
export function savePlans(plans: ProductionPlan[]): void {
  try {
    localStorage.setItem(PLANS_KEY, JSON.stringify(plans));
  } catch (e) {
    console.error('プランの保存に失敗しました', e);
  }
}

/**
 * localStorage から全プランを読み込む。
 *
 * データが存在しない場合や JSON のパースに失敗した場合は空配列を返す。
 *
 * @returns 保存済みプランの配列（存在しない場合は `[]`）
 */
export function loadPlans(): ProductionPlan[] {
  try {
    const data = localStorage.getItem(PLANS_KEY);
    if (data) return JSON.parse(data) as ProductionPlan[];
  } catch (e) {
    console.error('プランの読み込みに失敗しました', e);
  }
  return [];
}
