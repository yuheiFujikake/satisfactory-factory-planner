import { create } from 'zustand';
import type { Item, Recipe, Machine } from '../types/game.types';
import itemsData from '../data/items.json';
import recipesData from '../data/recipes.json';
import machinesData from '../data/machines.json';

interface GameDataStore {
  items: Record<string, Item>;
  recipes: Record<string, Recipe>;
  machines: Record<string, Machine>;
  recipesByOutput: Record<string, Recipe[]>;
  getRecipesForItem: (itemId: string) => Recipe[];
  getDefaultRecipe: (itemId: string) => Recipe | undefined;
}

function indexById<T extends { id: string }>(arr: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of arr) map[item.id] = item;
  return map;
}

function buildRecipesByOutput(recipes: Record<string, Recipe>): Record<string, Recipe[]> {
  const map: Record<string, Recipe[]> = {};
  for (const recipe of Object.values(recipes)) {
    for (const output of recipe.outputs) {
      if (!map[output.itemId]) map[output.itemId] = [];
      map[output.itemId].push(recipe);
    }
  }
  return map;
}

const items = indexById(itemsData as Item[]);
const recipes = indexById(recipesData as Recipe[]);
const machines = indexById(machinesData as Machine[]);
const recipesByOutput = buildRecipesByOutput(recipes);

export const useGameDataStore = create<GameDataStore>(() => ({
  items,
  recipes,
  machines,
  recipesByOutput,
  getRecipesForItem: (itemId: string) => recipesByOutput[itemId] || [],
  getDefaultRecipe: (itemId: string) => {
    const list = recipesByOutput[itemId] || [];
    return list.find(r => !r.isAlternate) || list[0];
  },
}));
