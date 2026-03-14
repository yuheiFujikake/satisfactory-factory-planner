import { formatRate } from '../utils/math';

interface ProductionRateBadgeProps {
  rate: number;
  color?: string;
  unit?: string;
}

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
