import { usePlanStore } from '../stores/planStore';
import { trackEvent } from '../lib/analytics';

/**
 * プラン管理操作をまとめたカスタムフック。
 *
 * `usePlanStore` の各アクションと、ファイル I/O（エクスポート・インポート）を
 * 組み合わせたハンドラを一括提供する。コンポーネントはこのフックを使うことで
 * ストアへの直接依存を避けられる。
 *
 * @returns プラン管理に必要な状態とアクションのセット
 */
export function usePlanManager() {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const savedPlans = usePlanStore(s => s.savedPlans);
  const createPlan = usePlanStore(s => s.createPlan);
  const loadPlan = usePlanStore(s => s.loadPlan);
  const savePlan = usePlanStore(s => s.savePlan);
  const deletePlan = usePlanStore(s => s.deletePlan);
  const addTarget = usePlanStore(s => s.addTarget);
  const removeTarget = usePlanStore(s => s.removeTarget);
  const updateTarget = usePlanStore(s => s.updateTarget);
  const setRecipeOverride = usePlanStore(s => s.setRecipeOverride);
  const updatePlanName = usePlanStore(s => s.updatePlanName);
  const exportPlan = usePlanStore(s => s.exportPlan);
  const importPlan = usePlanStore(s => s.importPlan);

  /**
   * 現在のプランを JSON ファイルとしてダウンロードする。
   *
   * ファイル名は `{プラン名}.json`。GA4 に `plan_export` イベントを送信する。
   */
  const handleExport = () => {
    const json = exportPlan();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPlan?.name || 'plan'}.json`;
    a.click();
    // Blob URL はダウンロード後に解放してメモリリークを防ぐ
    URL.revokeObjectURL(url);
    trackEvent('plan_export');
  };

  /**
   * ファイル選択ダイアログを開き、選択した JSON ファイルからプランをインポートする。
   *
   * 同一 ID のプランが既に存在する場合は上書きされる。
   * GA4 に `plan_import` イベントを送信する。
   */
  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        const json = ev.target?.result as string;
        importPlan(json);
        trackEvent('plan_import');
      };
      reader.readAsText(file);
    };
    input.click();
  };

  return {
    currentPlan,
    savedPlans,
    createPlan,
    loadPlan,
    savePlan,
    deletePlan,
    addTarget,
    removeTarget,
    updateTarget,
    setRecipeOverride,
    updatePlanName,
    handleExport,
    handleImport,
  };
}
