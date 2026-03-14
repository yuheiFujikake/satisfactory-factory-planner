import { usePlanStore } from '../stores/planStore';

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

  const handleExport = () => {
    const json = exportPlan();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentPlan?.name || 'plan'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

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
