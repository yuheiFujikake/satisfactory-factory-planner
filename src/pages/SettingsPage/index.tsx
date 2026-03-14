import { useSettingsStore } from '../../stores/settingsStore';

export default function SettingsPage() {
  const language = useSettingsStore(s => s.language);
  const theme = useSettingsStore(s => s.theme);
  const defaultOverclock = useSettingsStore(s => s.defaultOverclock);
  const showAlternateRecipes = useSettingsStore(s => s.showAlternateRecipes);
  const updateSettings = useSettingsStore(s => s.updateSettings);

  const sectionStyle = {
    background: '#16213e',
    border: '1px solid #0f3460',
    borderRadius: '10px',
    padding: '20px',
    marginBottom: '16px',
  };

  const labelStyle = {
    color: '#e0e0e0',
    fontSize: '14px',
    fontWeight: 600,
    marginBottom: '6px',
    display: 'block',
  };

  const subLabelStyle = {
    color: '#a0a0b0',
    fontSize: '12px',
    marginBottom: '12px',
    display: 'block',
  };

  const btnGroupStyle = (active: boolean) => ({
    padding: '8px 16px',
    borderRadius: '6px',
    border: `2px solid ${active ? '#f5a623' : '#0f3460'}`,
    background: active ? 'rgba(245, 166, 35, 0.15)' : 'transparent',
    color: active ? '#f5a623' : '#a0a0b0',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: active ? 700 : 400,
    transition: 'all 0.2s',
  });

  return (
    <div style={{ padding: '24px', maxWidth: '600px', margin: '0 auto' }}>
      <h1 style={{ color: '#f5a623', fontSize: '24px', fontWeight: 700, margin: '0 0 24px' }}>
        ⚙️ 設定
      </h1>

      {/* Language */}
      <div style={sectionStyle}>
        <span style={labelStyle}>言語 / Language</span>
        <span style={subLabelStyle}>アイテム名の表示言語を選択します</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnGroupStyle(language === 'ja')} onClick={() => updateSettings({ language: 'ja' })}>
            🇯🇵 日本語
          </button>
          <button style={btnGroupStyle(language === 'en')} onClick={() => updateSettings({ language: 'en' })}>
            🇺🇸 English
          </button>
        </div>
      </div>

      {/* Theme */}
      <div style={sectionStyle}>
        <span style={labelStyle}>テーマ</span>
        <span style={subLabelStyle}>現在はダークテーマのみサポートされています</span>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={btnGroupStyle(theme === 'dark')} onClick={() => updateSettings({ theme: 'dark' })}>
            🌙 ダーク
          </button>
          <button style={btnGroupStyle(theme === 'light')} onClick={() => updateSettings({ theme: 'light' })}>
            ☀️ ライト (準備中)
          </button>
          <button style={btnGroupStyle(theme === 'system')} onClick={() => updateSettings({ theme: 'system' })}>
            💻 システム (準備中)
          </button>
        </div>
      </div>

      {/* Default Overclock */}
      <div style={sectionStyle}>
        <span style={labelStyle}>デフォルトオーバークロック</span>
        <span style={subLabelStyle}>新しい計算に使用するデフォルトのオーバークロック率</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <input
            type="range"
            min="0.01"
            max="2.5"
            step="0.01"
            value={defaultOverclock}
            onChange={e => updateSettings({ defaultOverclock: parseFloat(e.target.value) })}
            style={{
              flex: 1,
              accentColor: '#f5a623',
              height: '6px',
            }}
          />
          <div style={{
            background: '#0f3460',
            border: '1px solid #1a3a6a',
            borderRadius: '6px',
            padding: '6px 14px',
            color: '#f5a623',
            fontWeight: 700,
            fontSize: '16px',
            minWidth: '70px',
            textAlign: 'center',
          }}>
            {(defaultOverclock * 100).toFixed(0)}%
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: '#a0a0b0', fontSize: '11px', marginTop: '4px' }}>
          <span>1%</span>
          <span>100%</span>
          <span>250%</span>
        </div>
      </div>

      {/* Alternate Recipes */}
      <div style={sectionStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <span style={labelStyle}>代替レシピを表示</span>
            <span style={subLabelStyle}>アイテムブラウザで代替レシピを表示します</span>
          </div>
          <button
            onClick={() => updateSettings({ showAlternateRecipes: !showAlternateRecipes })}
            style={{
              width: '48px',
              height: '26px',
              borderRadius: '13px',
              background: showAlternateRecipes ? '#f5a623' : '#0f3460',
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background 0.2s',
            }}
          >
            <div style={{
              position: 'absolute',
              top: '3px',
              left: showAlternateRecipes ? '25px' : '3px',
              width: '20px',
              height: '20px',
              borderRadius: '10px',
              background: 'white',
              transition: 'left 0.2s',
            }} />
          </button>
        </div>
      </div>

      {/* Info */}
      <div style={{
        ...sectionStyle,
        background: 'rgba(245, 166, 35, 0.05)',
        border: '1px solid rgba(245, 166, 35, 0.2)',
      }}>
        <span style={{ ...labelStyle, color: '#f5a623' }}>アプリ情報</span>
        <div style={{ color: '#a0a0b0', fontSize: '13px', lineHeight: 1.8 }}>
          <div>Satisfactory Factory Planner v1.0</div>
          <div>Based on Satisfactory 1.0 game data</div>
          <div>アイテム数: 70+</div>
          <div>レシピ数: 50+</div>
        </div>
      </div>
    </div>
  );
}
