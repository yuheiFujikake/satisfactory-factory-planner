import { APP_VERSION } from '../../version';

/** 更新履歴の 1 バージョン分のデータ */
interface ChangeEntry {
  /** バージョン番号文字列（例: "1.1"） */
  version: string;
  /** リリース日（YYYY-MM-DD 形式） */
  date: string;
  /** 最新バージョンかどうか */
  isLatest?: boolean;
  /** セクション（見出し + 変更項目リスト）の配列 */
  sections: { heading: string; items: string[] }[];
}

const CHANGELOG: ChangeEntry[] = [
  {
    version: '1.2',
    date: '2026-03-22',
    isLatest: true,
    sections: [
      {
        heading: 'ドキュメント・品質改善',
        items: [
          '📖 使い方ページを全面改訂 — 各機能の説明と UI ラベルを最新状態に完全同期',
          '🌐 UI テキストを日本語に統一 — 設定ページのアプリ情報など英語混じりの文言を修正',
          '🛠️ 全ソースファイルに日本語 TSDoc コメントを整備 — 開発者向け可読性を大幅に向上',
        ],
      },
    ],
  },
  {
    version: '1.1',
    date: '2026-03-17',
    sections: [
      {
        heading: '新機能',
        items: [
          '🏗️ 製造ライングラフを追加 — 素材フローを左→右の有向グラフで可視化。原材料（左端）から生産目標（右端）へ矢印が流れ、各エッジに /min の流量を表示します。',
          '✂️ 原材料の分割機能 — 複数の消費先を持つ原材料ノードを右クリックメニューまたはノード上の「✂ 分割」ボタンで消費先ごとに独立したノードへ分割できます。「統合」で元の状態に戻せます。分割状態はプランごとに保存されます。',
          '📦 余剰ノード — 台数切り上げで生じた余剰量を専用の緑破線ノードで可視化。右上の「📦 余剰」ボタンで表示・非表示を切り替えられます。',
          '🖱️ 右クリックメニュー — ノードを右クリックするとコンテキストメニューが表示され、分割・統合・依存先の一括選択が行えます。',
        ],
      },
      {
        heading: '選択 & ハイライト',
        items: [
          '選択ノードの依存元（素材供給元）をオレンジ枠＋グローで強調表示',
          '選択ノードへの依存先エッジをオレンジ、供給先エッジを青でハイライト',
          '依存関係のないノードを opacity 45% で半透明化し、関連ノードを際立たせる',
          'Ctrl ＋ クリックでそのノードと依存する全子ノードを一括選択',
          'Shift ＋ ドラッグの矩形選択は「完全に枠内に収まったノードのみ」選択するモードに変更',
        ],
      },
      {
        heading: 'UI・操作改善',
        items: [
          'スクロール操作を整理 — ホイールで縦スクロール、Shift＋ホイールで横スクロール、Ctrl＋ホイールでズーム',
          'ノードドラッグ後に接続ハンドルの位置を自動並び替え（接続先の上下位置に追従）',
          '📐 スナップ / 🔄 配置リセット / ⤢ 最大表示ボタンを右上パネルに配置',
          '使い方ページを製造ライン中心に全面更新',
        ],
      },
    ],
  },
  {
    version: '1.1',
    date: '2026-03-17',
    sections: [
      {
        heading: '新機能',
        items: [
          '⛏️ 製造地タブを追加 — 計算結果のアイテムをインゴット・液体原材料の組み合わせ別にグループ表示。インゴットのみ（🔩）・液体のみ（💧）・混在（🔩💧）で色分けされたアコーディオン形式で表示されます。',
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
          'プラン管理 — 複数プランの保存・読込・JSON エクスポート/インポート',
          'アイテムブラウザ — カテゴリ別検索・詳細パネル・代替レシピ確認',
          '使い方ガイド — クイックスタートから各機能の詳細まで',
          '日本語 / 英語 表示切替対応',
        ],
      },
    ],
  },
];

/**
 * 更新履歴ページコンポーネント。
 *
 * `CHANGELOG` 定数をバージョン降順で表示し、各バージョンの変更内容を
 * セクション別にリスト表示する。最新バージョンには「最新」バッジを付与する。
 */
export default function ChangelogPage() {
  return (
    <div style={{ height: '100%', overflow: 'auto', background: '#1a1a2e' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto', padding: '32px 24px' }}>

        {/* ヘッダー */}
        <div style={{ marginBottom: '32px' }}>
          <h1 style={{ color: '#f5a623', fontSize: '24px', fontWeight: 700, margin: '0 0 6px' }}>
            📋 更新履歴
          </h1>
          <p style={{ color: '#a0a0b0', fontSize: '13px', margin: 0 }}>
            Satisfactory Factory Planner — 現在のバージョン: <span style={{ color: '#e0e0e0', fontWeight: 600 }}>v{APP_VERSION}</span>
          </p>
        </div>

        {/* エントリー一覧 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {CHANGELOG.map(entry => (
            <div key={entry.version}>
              {/* バージョン見出し */}
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

              {/* セクション */}
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
