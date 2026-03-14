export interface ProductionTarget {
  id: string;
  itemId: string;
  amountPerMinute: number;
}

export interface FactoryGroup {
  id: string;
  name: string;
  color: string;
  targetIds: string[];
  note: string;
}

export interface ProductionPlan {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  version: number;
  targets: ProductionTarget[];
  recipeOverrides: Record<string, string>;
  overclock: Record<string, number>;
  groups: FactoryGroup[];
}

export interface AppSettings {
  language: "ja" | "en";
  theme: "dark" | "light" | "system";
  defaultOverclock: number;
  showAlternateRecipes: boolean;
}
