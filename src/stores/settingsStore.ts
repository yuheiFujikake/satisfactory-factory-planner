import { create } from 'zustand';
import type { AppSettings } from '../types/plan.types';

/** localStorage に使用するキー */
const SETTINGS_KEY = 'sfp-settings';

/**
 * アプリケーション設定のデフォルト値。
 *
 * localStorage に保存済みの設定が存在しない場合にフォールバックとして使用される。
 */
const DEFAULT_SETTINGS: AppSettings = {
  language: 'ja',
  theme: 'dark',
  defaultOverclock: 1.0,
  showAlternateRecipes: true,
};

/**
 * localStorage から設定を読み込む。
 *
 * 保存済みデータが存在する場合はデフォルト設定にマージして返す（部分保存に対応）。
 * データが存在しない場合や JSON のパースに失敗した場合はデフォルト設定を返す。
 *
 * @returns 復元済みのアプリケーション設定
 */
function loadSettings(): AppSettings {
  try {
    const data = localStorage.getItem(SETTINGS_KEY);
    if (data) return { ...DEFAULT_SETTINGS, ...JSON.parse(data) };
  } catch {}
  return DEFAULT_SETTINGS;
}

/**
 * アプリケーション設定ストアのインターフェース定義。
 *
 * `AppSettings` の全フィールドに加えて、設定を更新するアクションを持つ。
 */
interface SettingsStore extends AppSettings {
  /**
   * 設定を部分更新して localStorage に永続化する。
   * @param updates - 更新するフィールドのみを含む部分オブジェクト
   */
  updateSettings: (updates: Partial<AppSettings>) => void;
}

/**
 * アプリケーション設定を管理する Zustand ストア。
 *
 * 初期値は localStorage から復元され、`updateSettings()` による変更は
 * 即座に localStorage へ永続化される。
 */
export const useSettingsStore = create<SettingsStore>((set) => ({
  ...loadSettings(),
  updateSettings: (updates) => {
    set(state => {
      const next = { ...state, ...updates };
      // AppSettings のフィールドのみを明示的に保存し、ストア内部状態（関数など）は除外する
      localStorage.setItem(SETTINGS_KEY, JSON.stringify({
        language: next.language,
        theme: next.theme,
        defaultOverclock: next.defaultOverclock,
        showAlternateRecipes: next.showAlternateRecipes,
      }));
      return next;
    });
  },
}));
