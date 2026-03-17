import { useState, useMemo } from 'react';
import { useGameDataStore } from '../stores/gameDataStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Item } from '../types/game.types';

/**
 * アイテム検索ロジックを提供するカスタムフック。
 *
 * 入力クエリに基づき、英語名・日本語名・ID の部分一致でアイテムをフィルタリングする。
 * クエリが空の場合は全アイテムを返す。
 * `useMemo` によりクエリやアイテムが変化したときのみ再計算される。
 *
 * @param initialQuery - 初期検索クエリ（デフォルト: `''`）
 * @returns `query`（現在のクエリ）、`setQuery`（クエリ更新関数）、`filteredItems`（フィルタ済みアイテム配列）
 */
export function useItemSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const items = useGameDataStore(s => s.items);
  // 言語設定が変わるとアイテム名の優先表示が変わるため依存に含める
  const language = useSettingsStore(s => s.language);

  const filteredItems = useMemo((): Item[] => {
    const q = query.trim().toLowerCase();
    const allItems = Object.values(items);
    if (!q) return allItems;

    // 英語名・日本語名・ID のいずれかにクエリが含まれるアイテムを返す
    return allItems.filter(item => {
      const nameEn = item.name.toLowerCase();
      const nameJa = item.nameJa.toLowerCase();
      const id = item.id.toLowerCase();
      return nameEn.includes(q) || nameJa.includes(q) || id.includes(q);
    });
  }, [query, items, language]);

  return { query, setQuery, filteredItems };
}
