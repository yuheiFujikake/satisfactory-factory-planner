import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import { useIsMobile } from '../../hooks/useIsMobile';

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
      {!isMobile && <Sidebar />}
      <main style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#1a1a2e',
        paddingBottom: isMobile ? '60px' : 0,
      }}>
        <Outlet />
      </main>
      {isMobile && <Sidebar />}
    </div>
  );
}
