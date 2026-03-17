import { useGameDataStore } from '../../stores/gameDataStore';
import { useUiStore } from '../../stores/uiStore';
import { usePlanStore } from '../../stores/planStore';
import { useSettingsStore } from '../../stores/settingsStore';
import RecipeCard from '../../components/RecipeCard';
import { trackEvent } from '../../lib/analytics';

/**
 * レシピ選択モーダルコンポーネント。
 *
 * `uiStore.recipeSelectorOpen` が `true` のときに表示され、
 * 対象アイテムのレシピ一覧を選択できる。
 * レシピを選択すると `planStore.setRecipeOverride` に反映され、GA4 イベントを送信する。
 */
export default function RecipeSelector() {
  const recipeSelectorOpen = useUiStore(s => s.recipeSelectorOpen);
  const recipeSelectorItemId = useUiStore(s => s.recipeSelectorItemId);
  const closeRecipeSelector = useUiStore(s => s.closeRecipeSelector);
  const items = useGameDataStore(s => s.items);
  const getRecipesForItem = useGameDataStore(s => s.getRecipesForItem);
  const setRecipeOverride = usePlanStore(s => s.setRecipeOverride);
  const currentPlan = usePlanStore(s => s.currentPlan);
  const language = useSettingsStore(s => s.language);

  if (!recipeSelectorOpen || !recipeSelectorItemId) return null;

  const item = items[recipeSelectorItemId];
  const recipes = getRecipesForItem(recipeSelectorItemId);
  const currentOverride = currentPlan?.recipeOverrides[recipeSelectorItemId];
  const itemName = item ? (language === 'ja' ? item.nameJa : item.name) : recipeSelectorItemId;

  /**
   * レシピを選択してオーバーライドに設定する。
   * @param recipeId - 選択したレシピ ID
   */
  const handleSelect = (recipeId: string) => {
    setRecipeOverride(recipeSelectorItemId, recipeId);
    trackEvent('recipe_change', { item_id: recipeSelectorItemId, recipe_id: recipeId });
    closeRecipeSelector();
  };

  return (
    <div
      onClick={closeRecipeSelector}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: '#16213e',
          border: '1px solid #0f3460',
          borderRadius: '12px',
          padding: '24px',
          width: '560px',
          maxWidth: '90vw',
          maxHeight: '80vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* ヘッダー */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div>
            <h2 style={{ color: '#f5a623', fontSize: '18px', fontWeight: 700, margin: 0 }}>
              レシピ選択
            </h2>
            <p style={{ color: '#a0a0b0', fontSize: '13px', margin: '4px 0 0' }}>
              {itemName}
            </p>
          </div>
          <button
            onClick={closeRecipeSelector}
            style={{
              background: 'transparent',
              border: '1px solid #0f3460',
              color: '#a0a0b0',
              cursor: 'pointer',
              borderRadius: '6px',
              padding: '6px 12px',
              fontSize: '13px',
            }}
          >
            ✕ 閉じる
          </button>
        </div>

        {/* レシピ一覧 */}
        <div style={{ overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {recipes.length === 0 ? (
            <div style={{ color: '#a0a0b0', textAlign: 'center', padding: '32px' }}>
              このアイテムのレシピが見つかりません
            </div>
          ) : (
            recipes.map(recipe => (
              <RecipeCard
                key={recipe.id}
                recipe={recipe}
                selected={currentOverride === recipe.id}
                onClick={() => handleSelect(recipe.id)}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
