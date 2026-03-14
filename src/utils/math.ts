export function ceilFixed(n: number, decimals = 2): number {
  return Math.ceil(n * Math.pow(10, decimals)) / Math.pow(10, decimals);
}

export function formatRate(rate: number): string {
  if (rate % 1 === 0) return rate.toString();
  return rate.toFixed(2).replace(/\.?0+$/, '');
}
