import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';

export default function MainLayout() {
  return (
    <div style={{
      display: 'flex',
      height: '100vh',
      width: '100vw',
      overflow: 'hidden',
      backgroundColor: '#1a1a2e',
    }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        backgroundColor: '#1a1a2e',
      }}>
        <Outlet />
      </main>
    </div>
  );
}
