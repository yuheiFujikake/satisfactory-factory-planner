import { create } from 'zustand';

interface UiStore {
  selectedItemId: string | null;
  recipeSelectorOpen: boolean;
  recipeSelectorItemId: string | null;
  activeTab: 'tree' | 'table' | 'machines';
  setSelectedItem: (itemId: string | null) => void;
  openRecipeSelector: (itemId: string) => void;
  closeRecipeSelector: () => void;
  setActiveTab: (tab: 'tree' | 'table' | 'machines') => void;
}

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
