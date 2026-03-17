import { create } from 'zustand';
import type { Item, Recipe, Machine } from '../types/game.types';
import itemsData from '../data/items.json';
import recipesData from '../data/recipes.json';
import machinesData from '../data/machines.json';

/**
 * ゲームマスターデータを保持するストアのインターフェース定義。
 *
 * アイテム・レシピ・マシンの辞書と、レシピ検索用のインデックスを提供する。
 * データはビルド時の JSON から生成され、実行中は不変。
 */
interface GameDataStore {
  /** アイテム ID をキーとするアイテム辞書 */
  items: Record<string, Item>;
  /** レシピ ID をキーとするレシピ辞書 */
  recipes: Record<string, Recipe>;
  /** マシン ID をキーとするマシン辞書 */
  machines: Record<string, Machine>;
  /** アイテム ID をキーとする「そのアイテムを出力するレシピ」一覧 */
  recipesByOutput: Record<string, Recipe[]>;
  /**
   * 指定アイテムを出力するレシピ一覧を返す。
   * @param itemId - 検索対象のアイテム ID
   * @returns 該当するレシピの配列（存在しない場合は空配列）
   */
  getRecipesForItem: (itemId: string) => Recipe[];
  /**
   * 指定アイテムのデフォルトレシピを返す。
   *
   * 標準レシピ（`isAlternate === false`）を優先し、
   * 標準レシピが存在しない場合は先頭レシピを返す。
   *
   * @param itemId - 検索対象のアイテム ID
   * @returns デフォルトレシピ（レシピが存在しない場合は `undefined`）
   */
  getDefaultRecipe: (itemId: string) => Recipe | undefined;
}

/**
 * `id` プロパティを持つオブジェクトの配列を、ID をキーとする辞書に変換する。
 *
 * @param arr - `id` フィールドを持つオブジェクトの配列
 * @returns ID をキーとするレコード
 */
function indexById<T extends { id: string }>(arr: T[]): Record<string, T> {
  const map: Record<string, T> = {};
  for (const item of arr) map[item.id] = item;
  return map;
}

/**
 * レシピ辞書から「出力アイテム ID → レシピ配列」の逆引きインデックスを構築する。
 *
 * 1 つのレシピが複数の出力を持つ場合、各出力アイテムのエントリにそのレシピが追加される。
 *
 * @param recipes - レシピ ID をキーとするレシピ辞書
 * @returns 出力アイテム ID をキーとするレシピ配列のマップ
 */
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

// モジュールロード時にゲームデータを一度だけ構築し、ストア全体で共有する
const items = indexById(itemsData as Item[]);
const recipes = indexById(recipesData as Recipe[]);
const machines = indexById(machinesData as Machine[]);
const recipesByOutput = buildRecipesByOutput(recipes);

/**
 * ゲームマスターデータを管理する Zustand ストア。
 *
 * データはアプリ起動時に JSON ファイルから一度だけ読み込まれ、
 * 実行中に変更されることはない（読み取り専用）。
 * setter を持たないため `set` は不要。
 */
export const useGameDataStore = create<GameDataStore>(() => ({
  items,
  recipes,
  machines,
  recipesByOutput,
  getRecipesForItem: (itemId: string) => recipesByOutput[itemId] || [],
  getDefaultRecipe: (itemId: string) => {
    const list = recipesByOutput[itemId] || [];
    // 標準レシピを優先。存在しなければ先頭レシピを返す
    return list.find(r => !r.isAlternate) || list[0];
  },
}));
