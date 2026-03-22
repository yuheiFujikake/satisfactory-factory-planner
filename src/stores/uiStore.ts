import { create } from 'zustand';

/**
 * UI 状態を管理するストアのインターフェース定義。
 *
 * 選択中アイテム・レシピセレクターの開閉・アクティブタブなど、
 * ページをまたいで共有される UI の一時状態を保持する。
 * localStorage への永続化は行わない。
 */
interface UiStore {
  /** 選択中のアイテム ID（未選択の場合は `null`） */
  selectedItemId: string | null;
  /** レシピセレクターが開いているかどうか */
  recipeSelectorOpen: boolean;
  /** レシピセレクターの対象アイテム ID（閉じている場合は `null`） */
  recipeSelectorItemId: string | null;
  /** 計算結果パネルのアクティブタブ */
  activeTab: 'line' | 'table' | 'machines' | 'ores';
  /**
   * 選択アイテムを変更する。
   * @param itemId - 選択するアイテム ID（選択解除する場合は `null`）
   */
  setSelectedItem: (itemId: string | null) => void;
  /**
   * レシピセレクターを開く。
   * @param itemId - レシピを変更するアイテムの ID
   */
  openRecipeSelector: (itemId: string) => void;
  /** レシピセレクターを閉じる */
  closeRecipeSelector: () => void;
  /**
   * アクティブタブを切り替える。
   * @param tab - 表示するタブの識別子
   */
  setActiveTab: (tab: 'line' | 'table' | 'machines' | 'ores') => void;
}

/**
 * UI の一時状態を管理する Zustand ストア。
 *
 * ページ遷移やリロードで状態はリセットされる（永続化なし）。
 */
export const useUiStore = create<UiStore>((set) => ({
  selectedItemId: null,
  recipeSelectorOpen: false,
  recipeSelectorItemId: null,
  activeTab: 'table',

  setSelectedItem: (itemId) => set({ selectedItemId: itemId }),
  openRecipeSelector: (itemId) => set({ recipeSelectorOpen: true, recipeSelectorItemId: itemId }),
  closeRecipeSelector: () => set({ recipeSelectorOpen: false, recipeSelectorItemId: null }),
  setActiveTab: (tab) => set({ activeTab: tab }),
}));
