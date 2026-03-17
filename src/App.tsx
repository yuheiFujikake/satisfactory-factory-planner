import { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import MainLayout from './components/layout/MainLayout';
import CalculatorPage from './pages/CalculatorPage';
import PlanManagerPage from './pages/PlanManagerPage';
import ItemBrowserPage from './pages/ItemBrowserPage';
import SettingsPage from './pages/SettingsPage';
import HelpPage from './pages/HelpPage';
import ChangelogPage from './pages/ChangelogPage';
import WelcomeModals from './components/WelcomeModals';
import { usePlanStore } from './stores/planStore';
import { trackPageView } from './lib/analytics';

/**
 * ルート変更のたびにページビューイベントを GA4 へ送信するコンポーネント。
 *
 * `useLocation` を使用するため `BrowserRouter` の内側に配置する必要がある。
 * 戻り値は `null`（DOM を描画しない）。
 */
function PageTracker() {
  const { pathname } = useLocation();
  useEffect(() => {
    trackPageView(pathname);
  }, [pathname]);
  return null;
}

/**
 * アプリケーションのルートコンポーネント。
 *
 * `BrowserRouter` でルーティングを提供し、`MainLayout` の子として各ページをレンダリングする。
 * 初回マウント時に `initFromStorage` を呼び出して localStorage からプランを復元する。
 */
function App() {
  const initFromStorage = usePlanStore(s => s.initFromStorage);

  useEffect(() => {
    initFromStorage();
  }, [initFromStorage]);

  return (
    <BrowserRouter>
      <PageTracker />
      <WelcomeModals />
      <Routes>
        <Route path="/" element={<MainLayout />}>
          <Route index element={<CalculatorPage />} />
          <Route path="plans" element={<PlanManagerPage />} />
          <Route path="items" element={<ItemBrowserPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="help" element={<HelpPage />} />
          <Route path="changelog" element={<ChangelogPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
