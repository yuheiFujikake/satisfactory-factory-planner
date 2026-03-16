import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { APP_VERSION, WHATS_NEW } from '../version';

const KEY_WELCOME = 'sfp-welcome-shown';
const KEY_VERSION = 'sfp-last-seen-version';

type ModalType = 'welcome' | 'whats-new' | null;

// ── Shared modal shell ────────────────────────────────────────────────────────

interface ShellProps {
  children: React.ReactNode;
}

function ModalShell({ children }: ShellProps) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 3000,
      background: 'rgba(0,0,0,0.75)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '20px',
    }}>
      <div style={{
        background: '#16213e',
        border: '1px solid #1a3a6a',
        borderRadius: '14px',
        width: '100%', maxWidth: '480px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
        overflow: 'hidden',
      }}>
        {children}
      </div>
    </div>
  );
}

// ── Suppress checkbox ─────────────────────────────────────────────────────────

interface SuppressProps {
  checked: boolean;
  onChange: (v: boolean) => void;
}

function SuppressCheckbox({ checked, onChange }: SuppressProps) {
  return (
    <label style={{
      display: 'flex', alignItems: 'center', gap: '8px',
      cursor: 'pointer', userSelect: 'none',
    }}>
      <input
        type="checkbox"
        checked={checked}
        onChange={e => onChange(e.target.checked)}
        style={{ width: '14px', height: '14px', accentColor: '#f5a623', cursor: 'pointer' }}
      />
      <span style={{ color: '#808090', fontSize: '12px' }}>次回から表示しない</span>
    </label>
  );
}

// ── Welcome modal ─────────────────────────────────────────────────────────────

interface WelcomeProps {
  onClose: (suppress: boolean) => void;
}

function WelcomeModal({ onClose }: WelcomeProps) {
  const [suppress, setSuppress] = useState(true);

  return (
    <ModalShell>
      {/* Header */}
      <div style={{ padding: '24px 24px 0', textAlign: 'center' }}>
        <div style={{ fontSize: '40px', marginBottom: '12px' }}>👋</div>
        <h2 style={{ color: '#f5a623', fontSize: '20px', fontWeight: 700, margin: '0 0 8px' }}>
          ようこそ！
        </h2>
        <p style={{ color: '#a0a0b0', fontSize: '13px', margin: 0, lineHeight: 1.6 }}>
          Satisfactory Factory Planner は、工場の生産計画を自動計算するツールです。
        </p>
      </div>

      {/* Steps */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {[
          { n: 1, title: 'プランを作成', desc: '左パネルの「＋」ボタンでプランを作成します' },
          { n: 2, title: 'アイテムを追加', desc: '「＋ アイテムを追加」で目標部品と生産量を設定します' },
          { n: 3, title: '計算を実行', desc: '「⚙️ 計算実行」で全素材・製造機台数・電力を自動計算します' },
        ].map(step => (
          <div key={step.n} style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
            <div style={{
              width: '24px', height: '24px', borderRadius: '50%',
              background: '#f5a623', color: '#1a1a2e',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontWeight: 700, fontSize: '12px', flexShrink: 0, marginTop: '1px',
            }}>{step.n}</div>
            <div>
              <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '13px' }}>{step.title}</div>
              <div style={{ color: '#a0a0b0', fontSize: '12px', marginTop: '2px' }}>{step.desc}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Help link */}
      <div style={{
        margin: '0 24px 16px',
        padding: '10px 14px',
        background: 'rgba(245,166,35,0.07)',
        border: '1px solid rgba(245,166,35,0.2)',
        borderRadius: '8px',
        fontSize: '12px', color: '#d0b070',
      }}>
        💡 詳しい操作方法は{' '}
        <Link
          to="/help"
          style={{ color: '#f5a623', textDecoration: 'underline' }}
          onClick={() => onClose(suppress)}
        >
          使い方ページ
        </Link>
        {' '}でいつでも確認できます。
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <SuppressCheckbox checked={suppress} onChange={setSuppress} />
        <button
          onClick={() => onClose(suppress)}
          style={{
            background: '#f5a623', color: '#1a1a2e',
            border: 'none', borderRadius: '8px',
            padding: '8px 20px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          はじめる →
        </button>
      </div>
    </ModalShell>
  );
}

// ── What's New modal ──────────────────────────────────────────────────────────

interface WhatsNewProps {
  onClose: (suppress: boolean) => void;
}

function WhatsNewModal({ onClose }: WhatsNewProps) {
  const [suppress, setSuppress] = useState(true);

  return (
    <ModalShell>
      {/* Header */}
      <div style={{ padding: '22px 24px 16px', borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '22px' }}>🆕</span>
          <div>
            <h2 style={{ color: '#f5a623', fontSize: '17px', fontWeight: 700, margin: 0 }}>
              v{WHATS_NEW.version} の更新情報
            </h2>
            <div style={{ color: '#606070', fontSize: '11px', marginTop: '2px' }}>{WHATS_NEW.date}</div>
          </div>
        </div>
      </div>

      {/* Highlights */}
      <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {WHATS_NEW.highlights.map((h, i) => (
          <div key={i} style={{
            display: 'flex', gap: '10px', alignItems: 'flex-start',
            padding: '8px 12px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '6px',
          }}>
            <span style={{ color: '#c0c0cc', fontSize: '13px', lineHeight: 1.55 }}>{h}</span>
          </div>
        ))}
      </div>

      {/* Changelog link */}
      <div style={{ padding: '0 24px 16px', textAlign: 'right' }}>
        <Link
          to="/changelog"
          style={{ color: '#a0a0b0', fontSize: '12px', textDecoration: 'none' }}
          onClick={() => onClose(suppress)}
        >
          📋 更新履歴をすべて見る →
        </Link>
      </div>

      {/* Footer */}
      <div style={{
        padding: '14px 24px',
        borderTop: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      }}>
        <SuppressCheckbox checked={suppress} onChange={setSuppress} />
        <button
          onClick={() => onClose(suppress)}
          style={{
            background: '#f5a623', color: '#1a1a2e',
            border: 'none', borderRadius: '8px',
            padding: '8px 20px', fontWeight: 700, fontSize: '13px',
            cursor: 'pointer',
          }}
        >
          確認しました
        </button>
      </div>
    </ModalShell>
  );
}

// ── Controller ────────────────────────────────────────────────────────────────

export default function WelcomeModals() {
  const [modal, setModal] = useState<ModalType>(null);

  useEffect(() => {
    const welcomeShown = localStorage.getItem(KEY_WELCOME) === 'true';
    const lastVersion  = localStorage.getItem(KEY_VERSION);

    if (!welcomeShown) {
      setModal('welcome');
    } else if (lastVersion !== APP_VERSION) {
      setModal('whats-new');
    }
  }, []);

  const handleCloseWelcome = (suppress: boolean) => {
    if (suppress) {
      localStorage.setItem(KEY_WELCOME, 'true');
      localStorage.setItem(KEY_VERSION, APP_VERSION);
    }
    setModal(null);
  };

  const handleCloseWhatsNew = (suppress: boolean) => {
    if (suppress) {
      localStorage.setItem(KEY_VERSION, APP_VERSION);
    }
    setModal(null);
  };

  if (modal === 'welcome') return <WelcomeModal onClose={handleCloseWelcome} />;
  if (modal === 'whats-new') return <WhatsNewModal onClose={handleCloseWhatsNew} />;
  return null;
}
