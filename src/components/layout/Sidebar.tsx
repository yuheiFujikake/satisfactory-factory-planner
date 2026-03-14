import { NavLink } from 'react-router-dom';
import { Calculator, FolderOpen, Package, Settings, HelpCircle } from 'lucide-react';
import { usePlanStore } from '../../stores/planStore';
import { useIsMobile } from '../../hooks/useIsMobile';

const navItems = [
  { to: '/',         icon: Calculator,  label: '計算機',   exact: true  },
  { to: '/plans',    icon: FolderOpen,  label: 'プラン',   exact: false },
  { to: '/items',    icon: Package,     label: 'アイテム', exact: false },
  { to: '/settings', icon: Settings,    label: '設定',     exact: false },
  { to: '/help',     icon: HelpCircle,  label: '使い方',   exact: false },
];

export default function Sidebar() {
  const currentPlan = usePlanStore(s => s.currentPlan);
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '60px',
        backgroundColor: '#16213e',
        borderTop: '1px solid #0f3460',
        display: 'flex',
        zIndex: 1000,
      }}>
        {navItems.map(item => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.exact}
            style={({ isActive }) => ({
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '3px',
              textDecoration: 'none',
              color: isActive ? '#f5a623' : '#a0a0b0',
              backgroundColor: isActive ? 'rgba(245,166,35,0.1)' : 'transparent',
              fontSize: '10px',
              fontWeight: isActive ? 700 : 400,
              padding: '6px 0',
            })}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    );
  }

  return (
    <aside style={{
      width: '220px', minWidth: '220px',
      backgroundColor: '#16213e', borderRight: '1px solid #0f3460',
      display: 'flex', flexDirection: 'column', height: '100vh', position: 'sticky', top: 0,
    }}>
      <div style={{ padding: '20px 16px', borderBottom: '1px solid #0f3460' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>⚙️</span>
          <div>
            <div style={{ color: '#f5a623', fontWeight: 700, fontSize: '14px', lineHeight: 1.2 }}>SF Factory</div>
            <div style={{ color: '#a0a0b0', fontSize: '11px' }}>Planner</div>
          </div>
        </div>
      </div>

      {currentPlan && (
        <div style={{ padding: '12px 16px', borderBottom: '1px solid #0f3460', backgroundColor: '#0f3460' }}>
          <div style={{ color: '#a0a0b0', fontSize: '10px', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Current Plan</div>
          <div style={{ color: '#f5a623', fontSize: '13px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{currentPlan.name}</div>
          <div style={{ color: '#a0a0b0', fontSize: '11px', marginTop: '2px' }}>{currentPlan.targets.length} targets</div>
        </div>
      )}

      <nav style={{ flex: 1, padding: '12px 8px' }}>
        {navItems.map(item => (
          <NavLink key={item.to} to={item.to} end={item.exact}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: '12px',
              padding: '10px 12px', borderRadius: '8px', marginBottom: '4px',
              textDecoration: 'none',
              color: isActive ? '#f5a623' : '#a0a0b0',
              backgroundColor: isActive ? 'rgba(245,166,35,0.15)' : 'transparent',
              transition: 'all 0.2s', fontSize: '14px', fontWeight: isActive ? 600 : 400,
            })}
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px 16px', borderTop: '1px solid #0f3460', color: '#a0a0b0', fontSize: '10px', textAlign: 'center' }}>
        Satisfactory Factory Planner v1.0
      </div>
    </aside>
  );
}
