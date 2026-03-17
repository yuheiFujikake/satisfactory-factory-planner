import type { Item } from '../types/game.types';

/** ItemIcon のプロパティ */
interface ItemIconProps {
  /** 表示するアイテム */
  item: Item;
  /** アイコンのサイズ（px、デフォルト: 32） */
  size?: number;
}

/** カテゴリ → 絵文字のマッピング */
const categoryEmoji: Record<string, string> = {
  ore: '⛏️',
  ingot: '🔶',
  part: '🔧',
  component: '⚡',
  fluid: '💧',
  equipment: '🛡️',
  special: '✨',
};

/** カテゴリ → 背景色のマッピング */
const categoryColor: Record<string, string> = {
  ore: '#8B7355',
  ingot: '#f5a623',
  part: '#64b5f6',
  component: '#ce93d8',
  fluid: '#4fc3f7',
  equipment: '#81c784',
  special: '#fff176',
};

/**
 * アイテムのカテゴリに応じた絵文字アイコンを表示するコンポーネント。
 *
 * @param item - 表示するアイテム
 * @param size - アイコンサイズ（px）
 */
export default function ItemIcon({ item, size = 32 }: ItemIconProps) {
  const emoji = categoryEmoji[item.category] || '📦';
  const color = categoryColor[item.category] || '#a0a0b0';

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '6px',
        background: `${color}20`,
        border: `1px solid ${color}60`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.5,
        flexShrink: 0,
      }}
      title={item.name}
    >
      {emoji}
    </div>
  );
}
