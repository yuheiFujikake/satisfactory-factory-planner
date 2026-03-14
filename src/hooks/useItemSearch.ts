import { useState, useMemo } from 'react';
import { useGameDataStore } from '../stores/gameDataStore';
import { useSettingsStore } from '../stores/settingsStore';
import type { Item } from '../types/game.types';

export function useItemSearch(initialQuery = '') {
  const [query, setQuery] = useState(initialQuery);
  const items = useGameDataStore(s => s.items);
  const language = useSettingsStore(s => s.language);

  const filteredItems = useMemo((): Item[] => {
    const q = query.trim().toLowerCase();
    const allItems = Object.values(items);
    if (!q) return allItems;

    return allItems.filter(item => {
      const nameEn = item.name.toLowerCase();
      const nameJa = item.nameJa.toLowerCase();
      const id = item.id.toLowerCase();
      return nameEn.includes(q) || nameJa.includes(q) || id.includes(q);
    });
  }, [query, items, language]);

  return { query, setQuery, filteredItems };
}
