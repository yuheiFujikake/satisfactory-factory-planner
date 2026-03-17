/**
 * 数値を指定した小数点以下桁数で切り上げる。
 *
 * 浮動小数点誤差を回避するために整数スケーリングを用いる。
 *
 * @param n - 切り上げ対象の数値
 * @param decimals - 小数点以下の桁数（デフォルト: 2）
 * @returns 指定桁数で切り上げた数値
 *
 * @example
 * ceilFixed(1.001, 2) // => 1.01
 * ceilFixed(3.0,   2) // => 3
 */
export function ceilFixed(n: number, decimals = 2): number {
  return Math.ceil(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

/**
 * 生産レートを表示用の文字列にフォーマットする。
 *
 * 整数値の場合は小数点を省略し、小数の場合は末尾のゼロを除去した
 * 2 桁固定小数点表記で返す。
 *
 * @param rate - フォーマット対象のレート（毎分）
 * @returns 表示用の文字列
 *
 * @example
 * formatRate(30)    // => "30"
 * formatRate(13.5)  // => "13.5"
 * formatRate(1.50)  // => "1.5"
 */
export function formatRate(rate: number): string {
  if (rate % 1 === 0) return rate.toString();
  return rate.toFixed(2).replace(/\.?0+$/, '');
}

/**
 * 必要台数・製造量・余剰量を計算する純関数。
 *
 * 計算式:
 * - effectiveRate（1台あたり出力）= requiredPerMinute / machineCountExact
 * - neededMachines = ceil(totalPerMinute / effectiveRate)
 * - productionPerMin = neededMachines × effectiveRate
 * - surplusPerMin = productionPerMin − totalPerMinute
 *
 * raw リソース（採掘物）または `machineCountExact` が 0 以下の場合は
 * すべて `null` を返す（計算不能を示す）。
 *
 * @param requiredPerMinute - このノード単体の必要量（毎分）
 * @param machineCountExact - 小数含む正確な必要台数
 * @param totalPerMinute - 集計後の合計必要量（毎分）
 * @param isRaw - raw リソース（鉄鉱石など採掘物）かどうか
 * @returns 必要台数・製造量・余剰量（計算不能な場合はすべて `null`）
 */
export function calcProductionStats(
  requiredPerMinute: number,
  machineCountExact: number,
  totalPerMinute: number,
  isRaw: boolean,
): { neededMachines: number | null; productionPerMin: number | null; surplusPerMin: number | null } {
  if (isRaw || machineCountExact <= 0 || totalPerMinute <= 0) {
    return { neededMachines: null, productionPerMin: null, surplusPerMin: null };
  }
  const effectiveRate = requiredPerMinute / machineCountExact;
  const neededMachines = Math.ceil(totalPerMinute / effectiveRate);
  const productionPerMin = neededMachines * effectiveRate;
  const surplusPerMin = productionPerMin - totalPerMinute;
  return { neededMachines, productionPerMin, surplusPerMin };
}
