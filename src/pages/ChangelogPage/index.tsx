import { APP_VERSION } from '../../version';

interface ChangeEntry {
  version: string;
  date: string;
  isLatest?: boolean;
  sections: { heading: string; items: string[] }[];
}

const CHANGELOG: ChangeEntry[] = [
  {
    version: '1.1',
    date: '2026-03-17',
    isLatest: true,
    sections: [
      {
        heading: '新機能',
        items: [
          '⛏️ 製造地タブを追加 — 計算結果のアイテムをインゴット・液体原材料の組み合わせ別にグループ表示します。インゴットのみ（🔩）・液体のみ（💧）・混在（🔩💧）で色分けされたアコーディオン形式で表示されます。',
        ],
      },
      {
        heading: 'ゲームデータ更新',
        items: [
          'アイテムを 127 種に拡充（旧: 70+）',
          'レシピを 107 件に拡充（旧: 50+）',
          'マシーンを 11 種に拡充（変換機・充填機・量子エンコーダーを追加）',
          'SAM / FICSITEシステム — SAM鉱石・活性SAM・FICSITEのインゴット・三角板・SAM変動機',
          '量子テクノロジー — ダイヤモンド・時間結晶・暗黒物質・量子エンコーダー・量子プロセッサーなど',
          '核燃料チェーン — ウラン燃料棒・プルトニウム燃料棒・フィクソニウム燃料棒など',
          '宇宙エレベーター高度部品 — AI拡張サーバー・弾道ワープドライブ・熱推進ロケットなど',
          'バイオマス系・包装資材・弾薬カテゴリを追加',
        ],
      },
      {
        heading: 'UI改善',
        items: [
          '製造地タブの表示形式をカード形式からアコーディオン形式に変更',
          '使い方ページの内容を最新情報に更新',
        ],
      },
      {
        heading: '不具合対応・内部改善',
        items: [
          '一部アイテムの日本語名を修正',
          'データ計算処理の改善',
        ],
      },
    ],
  },
  {
    version: '1.0',
    date: '2026-03-14',
    sections: [
      {
        heading: '初期リリース',
        items: [
          '生産計算機 — アイテムと目標生産量を設定し、全依存素材・製造機台数・余剰量を自動算出',
          '依存グラフ — React Flow によるインタラクティブな依存ツリー表示',
          'ノード統合・分割 — 重複ノードを1つにまとめて製造量を合算',
          'プラン管理 — 複数プランの保存・読込・JSON エクスポート/インポート',
          'アイテムブラウザ — カテゴリ別検索・詳細パネル・代替レシピ確認',
          '使い方ガイド — クイックスタートから各機能の詳細まで',
          '日本語 / 英語 表示切替対応',
        ],
      },
    ],
  },
];

export default function ChangelogPage() {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#1a1a2e' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#f5a623', fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
            📋 更新履歴
          </h1>
          <p style={{ color: '#a0a0b0', fontSize: '13px', margin: 0 }}>
            Satisfactory Factory Planner — 現在のバージョン: <span style={{ color: '#e0e0e0', fontWeight: 600 }}>v{APP_VERSION}</span>
          </p>
        </div>

        {/* Entries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {CHANGELOG.map(entry => (
            <div key={entry.version}>
              {/* Version heading */}
              <div style={{
                display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px',
              }}>
                <div style={{
                  background: entry.isLatest ? '#f5a623' : '#1a3a6a',
                  color: entry.isLatest ? '#1a1a2e' : '#a0a0b0',
                  fontWeight: 700, fontSize: '14px',
                  padding: '3px 12px', borderRadius: '20px',
                  flexShrink: 0,
                }}>
                  v{entry.version}
                </div>
                {entry.isLatest && (
                  <span style={{
                    background: 'rgba(76,175,80,0.15)', color: '#81c784',
                    fontSize: '11px', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '10px', border: '1px solid rgba(76,175,80,0.3)',
                  }}>
                    最新
                  </span>
                )}
                <span style={{ color: '#606070', fontSize: '12px' }}>{entry.date}</span>
              </div>

              {/* Sections */}
              <div style={{
                background: '#0f3460', border: '1px solid #1a3a6a',
                borderRadius: '10px', overflow: 'hidden',
              }}>
                {entry.sections.map((section, si) => (
                  <div
                    key={section.heading}
                    style={{ borderTop: si > 0 ? '1px solid rgba(255,255,255,0.06)' : 'none' }}
                  >
                    <div style={{
                      padding: '10px 16px 4px',
                      color: '#808090', fontSize: '10px', fontWeight: 700,
                      textTransform: 'uppercase', letterSpacing: '0.8px',
                    }}>
                      {section.heading}
                    </div>
                    <ul style={{ margin: 0, padding: '0 16px 12px 32px' }}>
                      {section.items.map((item, ii) => (
                        <li key={ii} style={{
                          color: '#c0c0cc', fontSize: '13px', lineHeight: 1.7,
                          paddingBottom: '2px',
                        }}>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
