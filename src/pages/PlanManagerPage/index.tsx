import { useState } from 'react';
import { Plus, Trash2, Download, Upload, FolderOpen } from 'lucide-react';
import { usePlanManager } from '../../hooks/usePlanManager';

/**
 * プラン管理ページコンポーネント。
 *
 * 保存済みプランの一覧表示・新規作成・エクスポート・インポート・削除を行う。
 * アクティブなプランには「アクティブ」バッジを表示し、エクスポートはアクティブプランのみ対応。
 */
export default function PlanManagerPage() {
  const {
    currentPlan,
    savedPlans,
    createPlan,
    loadPlan,
    deletePlan,
    handleExport,
    handleImport,
  } = usePlanManager();
  const [newPlanName, setNewPlanName] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);

  /**
   * 新規プランを作成してフォームをリセットする。
   * プラン名が空の場合は「プラン N」（N は現在のプラン数 +1）をデフォルト名とする。
   */
  const handleCreate = () => {
    const name = newPlanName.trim() || `プラン ${savedPlans.length + 1}`;
    createPlan(name);
    setNewPlanName('');
    setShowCreateForm(false);
  };

  return (
    <div style={{ padding: '24px', maxWidth: '900px', margin: '0 auto' }}>
      {/* ヘッダー */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ color: '#f5a623', fontSize: '24px', fontWeight: 700, margin: '0 0 8px' }}>
          📋 プラン管理
        </h1>
        <p style={{ color: '#a0a0b0', fontSize: '14px', margin: 0 }}>
          生産プランの作成・管理・エクスポートができます
        </p>
      </div>

      {/* アクションボタン */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        <button
          onClick={() => setShowCreateForm(o => !o)}
          style={{
            background: '#f5a623',
            color: '#1a1a2e',
            border: 'none',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 700,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Plus size={16} /> 新規プラン作成
        </button>
        <button
          onClick={handleImport}
          style={{
            background: '#16213e',
            color: '#e0e0e0',
            border: '1px solid #0f3460',
            borderRadius: '8px',
            padding: '10px 20px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
          }}
        >
          <Upload size={16} /> インポート
        </button>
        {currentPlan && (
          <button
            onClick={handleExport}
            style={{
              background: '#16213e',
              color: '#e0e0e0',
              border: '1px solid #0f3460',
              borderRadius: '8px',
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Download size={16} /> エクスポート
          </button>
        )}
      </div>

      {/* 新規作成フォーム */}
      {showCreateForm && (
        <div style={{
          background: '#16213e',
          border: '1px solid #0f3460',
          borderRadius: '10px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ color: '#e0e0e0', fontSize: '14px', fontWeight: 600, marginBottom: '12px' }}>
            新しいプランを作成
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              autoFocus
              value={newPlanName}
              onChange={e => setNewPlanName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleCreate()}
              placeholder="プラン名を入力..."
              style={{
                flex: 1,
                background: '#1a1a2e',
                border: '1px solid #0f3460',
                borderRadius: '6px',
                color: '#e0e0e0',
                padding: '8px 12px',
                fontSize: '14px',
                outline: 'none',
              }}
            />
            <button
              onClick={handleCreate}
              style={{
                background: '#f5a623',
                color: '#1a1a2e',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 20px',
                fontWeight: 700,
                cursor: 'pointer',
              }}
            >
              作成
            </button>
            <button
              onClick={() => setShowCreateForm(false)}
              style={{
                background: 'transparent',
                color: '#a0a0b0',
                border: '1px solid #0f3460',
                borderRadius: '6px',
                padding: '8px 12px',
                cursor: 'pointer',
              }}
            >
              キャンセル
            </button>
          </div>
        </div>
      )}

      {/* プラン一覧 */}
      {savedPlans.length === 0 ? (
        <div style={{
          background: '#16213e',
          border: '1px solid #0f3460',
          borderRadius: '10px',
          padding: '48px',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: '48px', marginBottom: '16px' }}>📋</div>
          <div style={{ color: '#e0e0e0', fontSize: '16px', marginBottom: '8px' }}>プランがありません</div>
          <div style={{ color: '#a0a0b0', fontSize: '13px' }}>新規プランを作成してください</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {savedPlans.map(plan => {
            const isActive = plan.id === currentPlan?.id;
            return (
              <div
                key={plan.id}
                style={{
                  background: isActive ? 'rgba(245, 166, 35, 0.08)' : '#16213e',
                  border: `2px solid ${isActive ? '#f5a623' : '#0f3460'}`,
                  borderRadius: '10px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: '16px',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{
                      color: isActive ? '#f5a623' : '#e0e0e0',
                      fontWeight: 700,
                      fontSize: '16px',
                    }}>
                      {plan.name}
                    </span>
                    {isActive && (
                      <span style={{
                        background: '#f5a623',
                        color: '#1a1a2e',
                        fontSize: '10px',
                        fontWeight: 700,
                        padding: '2px 8px',
                        borderRadius: '3px',
                      }}>
                        アクティブ
                      </span>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '16px', color: '#a0a0b0', fontSize: '12px' }}>
                    <span>🎯 {plan.targets.length} 目標</span>
                    <span>🔧 {Object.keys(plan.recipeOverrides).length} レシピオーバーライド</span>
                    <span>📅 {new Date(plan.updatedAt).toLocaleDateString('ja-JP')}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
                  {!isActive && (
                    <button
                      onClick={() => loadPlan(plan.id)}
                      style={{
                        background: '#0f3460',
                        color: '#e0e0e0',
                        border: '1px solid #1a3a6a',
                        borderRadius: '6px',
                        padding: '6px 14px',
                        fontSize: '12px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                      }}
                    >
                      <FolderOpen size={14} /> 開く
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (isActive) handleExport();
                    }}
                    title="エクスポート"
                    disabled={!isActive}
                    style={{
                      background: 'transparent',
                      color: isActive ? '#a0a0b0' : '#555',
                      border: '1px solid #0f3460',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: isActive ? 'pointer' : 'default',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Download size={14} />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`「${plan.name}」を削除しますか？`)) {
                        deletePlan(plan.id);
                      }
                    }}
                    title="削除"
                    style={{
                      background: 'transparent',
                      color: '#f44336',
                      border: '1px solid rgba(244,67,54,0.3)',
                      borderRadius: '6px',
                      padding: '6px 10px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
