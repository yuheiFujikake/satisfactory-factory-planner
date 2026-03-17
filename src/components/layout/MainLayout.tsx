import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useIsMobile } from '../../hooks/useIsMobile';

/**
 * アプリ全体の共通レイアウトコンポーネント。
 *
 * デスクトップではサイドバーを左側に配置し、モバイルではボトムナビゲーションに切り替える。
 * ページコンテンツは `<Outlet>` でレンダリングされる。
 */
export default function MainLayout() {
  const isMobile = useIsMobile();

  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#1a1a2e',
    }}>
      {/* デスクトップではサイドバーを左側に表示 */}
      {!isMobile && <Sidebar />}
      <main style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#1a1a2e',
        // モバイルではボトムナビゲーション分の余白を確保する
        paddingBottom: isMobile ? '60px' : 0,
      }}>
        <Outlet />
      </main>
      {/* モバイルではサイドバーをボトムナビゲーションとして表示 */}
      {isMobile && <Sidebar />}
    </div>
  );
}
