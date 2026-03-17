import { formatRate } from '../utils/math';

/** ProductionRateBadge のプロパティ */
interface ProductionRateBadgeProps {
  /** 表示するレート値 */
  rate: number;
  /** バッジの色（CSS カラー文字列、デフォルト: `#f5a623`） */
  color?: string;
  /** 単位文字列（デフォルト: `/min`） */
  unit?: string;
}

/**
 * 生産レートをバッジ形式で表示するコンポーネント。
 *
 * 数値は `formatRate` でフォーマットし、末尾に単位を付加する。
 */
export default function ProductionRateBadge({ rate, color = '#f5a623', unit = '/min' }: ProductionRateBadgeProps) {
  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      background: `${color}20`,
      border: `1px solid ${color}50`,
      borderRadius: '4px',
      padding: '2px 8px',
      color: color,
      fontSize: '12px',
      fontWeight: 600,
      fontVariantNumeric: 'tabular-nums',
      whiteSpace: 'nowrap',
    }}>
      {formatRate(rate)}{unit}
    </span>
  );
}
