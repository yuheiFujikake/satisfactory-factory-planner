import { useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CalculatorPage from './pages/CalculatorPage';
import PlanManagerPage from './pages/PlanManagerPage';
import ItemBrowserPage from './pages/ItemBrowserPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import { usePlanStore } from './stores/planStore';

function App() {
  const initFromStorage = usePlanStore(s => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<CalculatorPage />} />
          <Route path="plans" element={<PlanManagerPage />} />
          <Route path="items" element={<ItemBrowserPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
