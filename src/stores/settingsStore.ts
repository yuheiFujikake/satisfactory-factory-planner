import { create } from 'zustand';
import type { AppSettings } from '../types/plan.types';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'ja',
  theme: 'dark',
  defaultOverclock: 1.0,
  showAlternateRecipes: true,
};

function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem('sfp-settings');
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {}
  return DEFAULT_SETTINGS;
}

interface SettingsStore extends AppSettings {
  updateSettings: (updates: Partial<AppSettings>) => void;
}

export const useSettingsStore = create<SettingsStore>((set) => ({
  ...loadSettings(),
  updateSettings: (updates) => {
    set(state => {
      const next = { ...state, ...updates };
      localStorage.setItem('sfp-settings', JSON.stringify({
        language: next.language,
        theme: next.theme,
        defaultOverclock: next.defaultOverclock,
        showAlternateRecipes: next.showAlternateRecipes,
      }));
      return next;
    });
  },
}));
