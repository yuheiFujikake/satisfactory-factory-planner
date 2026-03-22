import { useState } from 'react';
import { useIsMobile } from '../../hooks/useIsMobile';

/** ヘルプページのセクション識別子 */
type Section = 'quickstart' | 'calculator' | 'line' | 'plans' | 'items' | 'settings';

const SECTIONS: { id: Section; emoji: string; title: string }[] = [
  { id: 'quickstart',  emoji: '🚀', title: 'クイックスタート' },
  { id: 'calculator',  emoji: '⚙️', title: '計算機画面' },
  { id: 'line',        emoji: '🏗️', title: '製造ライン' },
  { id: 'plans',       emoji: '📁', title: 'プラン管理' },
  { id: 'items',       emoji: '📦', title: 'アイテムブラウザ' },
  { id: 'settings',    emoji: '🔧', title: '設定' },
];

/**
 * 使い方ガイドページコンポーネント。
 *
 * 左サイドバーの目次（デスクトップ）または横スクロールタブ（モバイル）で
 * セクションを切り替えながら各機能の説明を閲覧できる。
 */
export default function HelpPage() {
  const [active, setActive] = useState<Section>('quickstart');
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 60px)', background: '#1a1a2e', overflow: 'hidden' }}>
        {/* モバイル: 横スクロール可能なタブバー */}
        <div style={{
          display: 'flex',
          overflowX: 'auto',
          borderBottom: '1px solid #0f3460',
          background: '#16213e',
          flexShrink: 0,
          WebkitOverflowScrolling: 'touch' as React.CSSProperties['WebkitOverflowScrolling'],
        }}>
          {SECTIONS.map(s => (
            <button
              key={s.id}
              onClick={() => setActive(s.id)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '3px',
                padding: '10px 14px',
                border: 'none',
                borderBottom: active === s.id ? '2px solid #f5a623' : '2px solid transparent',
                background: 'transparent',
                color: active === s.id ? '#f5a623' : '#a0a0b0',
                cursor: 'pointer',
                fontSize: '10px',
                fontWeight: active === s.id ? 700 : 400,
                whiteSpace: 'nowrap',
                flexShrink: 0,
              }}
            >
              <span style={{ fontSize: '18px' }}>{s.emoji}</span>
              <span>{s.title}</span>
            </button>
          ))}
        </div>

        {/* コンテンツ */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 16px' }}>
          {active === 'quickstart' && <QuickStart />}
          {active === 'calculator' && <CalculatorGuide />}
          {active === 'line' && <ProductionLineGuide />}
          {active === 'plans' && <PlansGuide />}
          {active === 'items' && <ItemsGuide />}
          {active === 'settings' && <SettingsGuide />}
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#1a1a2e' }}>
      {/* 左サイドバー: 目次 */}
      <div style={{
        width: '220px',
        minWidth: '220px',
        borderRight: '1px solid #0f3460',
        padding: '20px 12px',
        overflowY: 'auto',
        background: '#16213e',
      }}>
        <div style={{ color: '#f5a623', fontWeight: 700, fontSize: '13px', marginBottom: '16px', padding: '0 4px' }}>
          📖 使い方ガイド
        </div>
        {SECTIONS.map(s => (
          <button
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              width: '100%',
              padding: '8px 10px',
              borderRadius: '6px',
              border: 'none',
              background: active === s.id ? 'rgba(245,166,35,0.15)' : 'transparent',
              color: active === s.id ? '#f5a623' : '#a0a0b0',
              cursor: 'pointer',
              fontSize: '13px',
              fontWeight: active === s.id ? 600 : 400,
              textAlign: 'left',
              marginBottom: '2px',
              transition: 'all 0.15s',
            }}
          >
            <span>{s.emoji}</span>
            <span>{s.title}</span>
          </button>
        ))}
      </div>

      {/* コンテンツ */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
        {active === 'quickstart' && <QuickStart />}
        {active === 'calculator' && <CalculatorGuide />}
        {active === 'line' && <ProductionLineGuide />}
        {active === 'plans' && <PlansGuide />}
        {active === 'items' && <ItemsGuide />}
        {active === 'settings' && <SettingsGuide />}
      </div>
    </div>
  );
}

// ─── 共有スタイルコンポーネント ───────────────────────────────────────────────

/** ヘルプページ用の大見出しコンポーネント */
const H1 = ({ children }: { children: React.ReactNode }) => (
  <h1 style={{ color: '#f5a623', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' }}>
    {children}
  </h1>
);

/** ヘルプページ用の中見出しコンポーネント（下線区切り付き） */
const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ color: '#e0e0e0', fontSize: '17px', fontWeight: 700, margin: '32px 0 12px', borderBottom: '1px solid #0f3460', paddingBottom: '8px' }}>
    {children}
  </h2>
);

const H3 = ({ children }: { children: React.ReactNode }) => (
  <h3 style={{ color: '#c0c8d8', fontSize: '14px', fontWeight: 700, margin: '20px 0 8px' }}>
    {children}
  </h3>
);

/** ヘルプページ用の本文段落コンポーネント */

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: '#c0c0cc', fontSize: '14px', lineHeight: 1.75, margin: '0 0 12px' }}>
    {children}
  </p>
);

/** ヘルプページ用のヒントブロックコンポーネント（オレンジ左ボーダー） */
const Tip = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'rgba(245,166,35,0.08)',
    border: '1px solid rgba(245,166,35,0.3)',
    borderLeft: '3px solid #f5a623',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#d0b070',
    margin: '12px 0',
    lineHeight: 1.6,
  }}>
    💡 {children}
  </div>
);

/** ヘルプページ用の補足情報ブロックコンポーネント（ブルー左ボーダー） */
const Note = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'rgba(100,181,246,0.08)',
    border: '1px solid rgba(100,181,246,0.3)',
    borderLeft: '3px solid #64b5f6',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#90bcd8',
    margin: '12px 0',
    lineHeight: 1.6,
  }}>
    ℹ️ {children}
  </div>
);

/** ヘルプページ用の警告ブロックコンポーネント（赤左ボーダー） */
const Warn = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: 'rgba(244,67,54,0.08)',
    border: '1px solid rgba(244,67,54,0.3)',
    borderLeft: '3px solid #f44336',
    borderRadius: '6px',
    padding: '10px 14px',
    fontSize: '13px',
    color: '#e57373',
    margin: '12px 0',
    lineHeight: 1.6,
  }}>
    ⚠️ {children}
  </div>
);

/** ヘルプページ用の手順ステップコンポーネント（番号バッジ + タイトル + 説明） */
const Step = ({ n, title, children }: { n: number; title: string; children: React.ReactNode }) => (
  <div style={{ display: 'flex', gap: '16px', marginBottom: '20px' }}>
    <div style={{
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      background: '#f5a623',
      color: '#1a1a2e',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontWeight: 700,
      fontSize: '14px',
      flexShrink: 0,
      marginTop: '2px',
    }}>{n}</div>
    <div>
      <div style={{ color: '#e0e0e0', fontWeight: 600, fontSize: '14px', marginBottom: '4px' }}>{title}</div>
      <div style={{ color: '#a0a0b0', fontSize: '13px', lineHeight: 1.65 }}>{children}</div>
    </div>
  </div>
);

/** ヘルプページ用のキー・バリュー行コンポーネント（機能名 + 説明の一覧表示に使用） */
const KV = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: '12px', padding: '8px 12px', borderBottom: '1px solid #0f3460' }}>
    <div style={{ color: '#f5a623', fontSize: '13px', fontWeight: 600, minWidth: '160px' }}>{label}</div>
    <div style={{ color: '#c0c0cc', fontSize: '13px', lineHeight: 1.6 }}>{value}</div>
  </div>
);

/** ヘルプページ用の疑似ターミナル表示コンポーネント（操作手順などをモノスペースで表示） */
const Screen = ({ children }: { children: React.ReactNode }) => (
  <div style={{
    background: '#0f3460',
    border: '1px solid #1a3a6a',
    borderRadius: '8px',
    padding: '16px',
    margin: '12px 0',
    fontFamily: 'monospace',
    fontSize: '12px',
    color: '#a0a0b0',
    lineHeight: 1.8,
  }}>{children}</div>
);

// カラーバッジ
const Badge = ({ color, bg, children }: { color: string; bg: string; children: React.ReactNode }) => (
  <span style={{
    display: 'inline-block',
    background: bg,
    border: `1px solid ${color}`,
    borderRadius: '4px',
    padding: '1px 7px',
    fontSize: '12px',
    color,
    fontWeight: 700,
    marginRight: '4px',
  }}>{children}</span>
);

// ─── セクションコンポーネント ─────────────────────────────────────────────────

/** クイックスタートセクション: 基本的な 5 ステップの使い方を説明する */
function QuickStart() {
  return (
    <div>
      <H1>🚀 クイックスタート</H1>
      <P>
        Satisfactory Factory Planner は、ゲーム「Satisfactory」の工場設計を支援するツールです。
        目標とする部品を設定するだけで、必要な全素材・製造機の台数・電力を自動計算します。
      </P>

      <H2>基本的な使い方（5ステップ）</H2>

      <Step n={1} title="プランを作成する">
        左パネル上部の「<b style={{ color: '#f5a623' }}>＋</b>」ボタンをクリックし、プラン名を入力して「作成」を押します。
        プランは複数作成・切り替えができます。名前は後からでもクリックで編集できます。
      </Step>

      <Step n={2} title="生産目標のアイテムを追加する">
        「<b style={{ color: '#f5a623' }}>＋ アイテムを追加</b>」ボタンをクリックするとアイテム選択モーダルが開きます。
        カテゴリで絞り込んだり、名前で検索して目的のアイテムをカード選択してください。
        選択後は確認画面で 1 分間あたりの生産量を設定してから「＋ 追加する」を押します。
      </Step>

      <Step n={3} title="計算を実行する">
        「<b style={{ color: '#f5a623' }}>⚙️ 計算実行</b>」ボタンを押すと、設定した目標の依存ツリーが展開され、
        全素材・製造機台数・消費電力が計算されます。
      </Step>

      <Step n={4} title="結果を確認する">
        右パネルに計算結果が 4 種類のビューで表示されます。
        <br />
        <b style={{ color: '#e0e0e0' }}>📊 テーブル</b> — 素材一覧（必要量・台数・製造量・余剰）
        <br />
        <b style={{ color: '#e0e0e0' }}>🏭 建設物</b> — 種別ごとの製造機数と消費電力
        <br />
        <b style={{ color: '#e0e0e0' }}>🏗️ 製造ライン</b> — 素材の依存関係と製造フローをグラフで可視化
        <br />
        <b style={{ color: '#e0e0e0' }}>⛏️ 製造地</b> — アイテムをインゴット・液体原材料の組み合わせ別に分類
      </Step>

      <Step n={5} title="プランを保存・管理する">
        計算結果はプランと共に自動でブラウザに保存されます。
        「📁 プラン」ページから複数プランの一覧管理・エクスポート・インポートができます。
      </Step>

      <Tip>
        代替レシピを使いたい場合は、テーブルの「変更」ボタンまたは目標アイテム横の ⚙️ アイコンでレシピを切り替えられます。
        変更後は「⚙️ 計算実行」で再計算してください。
      </Tip>
    </div>
  );
}

/** 計算機画面セクション: 左右パネルの各操作説明 */
function CalculatorGuide() {
  return (
    <div>
      <H1>⚙️ 計算機画面</H1>
      <P>メインの生産計算ページです。左パネルで目標を設定し、右パネルで結果を確認します。</P>

      <H2>左パネル — 目標設定</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="現在のプラン" value="現在編集中のプラン名。クリックすると直接編集できます" />
        <KV label="＋ ボタン（右上）" value="新しいプランを作成します。名前を入力して Enter または「作成」" />
        <KV label="📂 ボタン" value="保存済みのプラン一覧を表示し、切り替えられます" />
        <KV label="生産目標リスト" value="追加したアイテムと 1 分あたりの生産量を一覧表示します" />
        <KV label="数量入力欄" value="各アイテムの必要量を直接編集できます（/分単位）" />
        <KV label="⚙️ アイコン" value="アイテムのレシピを変更します（代替レシピ対応）" />
        <KV label="🗑️ アイコン" value="目標からアイテムを削除します" />
        <KV label="＋ アイテムを追加" value="アイテム選択モーダルを開きます" />
        <KV label="⚙️ 計算実行" value="依存ツリーを展開して必要素材・機械台数・電力を計算します" />
      </div>

      <H2>アイテム選択モーダル</H2>
      <P>「＋ アイテムを追加」で開くモーダルの操作方法：</P>
      <Screen>
        ① カテゴリタブで絞り込み（資源・インゴット・基本部品 など）{'\n'}
        ② テキスト検索（日本語・英語どちらでも対応）{'\n'}
        ③ カードをクリックしてアイテムを選択{'\n'}
        ④ 確認画面で 1 分間あたりの生産量を入力{'\n'}
        ⑤「＋ 追加する」で目標リストに追加
      </Screen>

      <Tip>生産量のデフォルト値は、そのアイテムの標準レシピの 1 台あたりの出力量に設定されています。</Tip>

      <H2>右パネル — サマリーバー</H2>
      <P>計算結果の合計が上部に常に表示されます。</P>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="総電力" value="全製造機の合計消費電力（MW）" />
        <KV label="アイテム種類" value="計算に含まれる素材の種類数（原材料含む）" />
        <KV label="建物種類" value="使用する製造機の種類数" />
        <KV label="総建物数" value="全製造機の合計台数（切り上げ整数）" />
      </div>

      <H2>📊 テーブルビュー — カラム説明</H2>
      <P>
        素材の一覧を表形式で表示します。表示順は「生産目標アイテム → 中間素材（製造ステップ数が多いものが上）→ 原材料」の順です。
      </P>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="アイテム" value="製造するアイテム名。原材料（採掘のみ）は緑色で「raw」バッジ付き" />
        <KV label="必要量/分" value="生産目標を達成するために必要な 1 分あたりの数量（全ツリーの集計値）" />
        <KV label="建物" value="このアイテムの製造に使用するマシーン名" />
        <KV label="必要台数" value="必要量を満たすために必要なマシーンの台数（切り上げ整数）" />
        <KV label="製造量/分" value="必要台数分のマシーンが 1 分間に実際に製造する数量" />
        <KV label="余剰量/分" value="「製造量/分」−「必要量/分」。余剰がある場合は緑色の「+X.XX」で表示" />
        <KV label="レシピ" value="「変更」ボタンで使用レシピを切り替えられます（代替レシピ対応）" />
      </div>
      <Note>
        「余剰量/分」が 0 より大きい場合、マシーンが少し余裕を持って稼働していることを意味します。
        切り上げにより必ず余剰が発生するのは正常な動作です。
      </Note>
      <Tip>
        レシピを変更した場合は必ず「⚙️ 計算実行」で再計算してください。変更しただけでは結果に反映されません。
      </Tip>

      <H2>🏭 建設物ビュー</H2>
      <P>
        必要な製造機を種類別に集計して表示します。各カードには台数と消費電力（MW）が表示されます。
        電力は製造機の基準消費電力 × 台数で計算されます。
      </P>

      <H2>⛏️ 製造地タブ</H2>
      <P>
        計算結果のアイテムを「インゴット・液体原材料の組み合わせ」別にグループ化して表示します。
        どの製造ラインがどの原材料ベースで動いているかを把握するのに便利です。
      </P>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="🔩 インゴットのみ（オレンジ）" value="インゴットだけを原材料とするアイテムのグループ" />
        <KV label="💧 液体のみ（ブルー）" value="水・原油・窒素ガスなど液体原材料だけを使うアイテムのグループ" />
        <KV label="🔩 インゴット＋液体（パープル）" value="インゴットと液体原材料を組み合わせるアイテムのグループ" />
      </div>
      <Note>
        鉱石・鉱物（石灰石・石炭など）を直接原材料とするアイテムはこのタブには表示されません。
        それらはインゴット・液体ベースに分類できないためです。
      </Note>
    </div>
  );
}

/** 製造ラインセクション: ノード操作・統合・分割の説明 */
function ProductionLineGuide() {
  return (
    <div>
      <H1>🏗️ 製造ライン</H1>
      <P>
        計算機画面の「🏗️ 製造ライン」タブで表示される、製造フローを可視化したインタラクティブグラフです。
        原材料（左端）から生産目標アイテム（右端）に向かって左→右に流れる構造で、
        矢印は「素材が製品を生産するために供給される方向」を示します。
      </P>

      <H2>グラフの基本構造</H2>
      <P>
        グラフは <b style={{ color: '#e0e0e0' }}>右から左へ</b> の依存関係で自動レイアウトされます。
        生産目標（右端）が最も右に配置され、その原材料が左に展開していきます。
        矢印は素材ノード（左）から製品ノード（右）へ向かって描かれ、ラベルに流量（/min）が表示されます。
      </P>
      <Screen>
        原材料（最左）→ 中間素材 → 中間素材 → 生産目標（最右）{'\n'}
        　　　　　　　　　　　　矢印の向き: 左 → 右（素材 → 製品）
      </Screen>

      <H2>ノードの見方</H2>
      <H3>通常アイテムノード</H3>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '8px 0' }}>
        <KV label="アイテム名（上部）" value="カテゴリ絵文字 ＋ アイテム名。カテゴリごとに枠の色が変わります" />
        <KV label="必要 XX/min（中央）" value="このアイテムを 1 分間に生産する必要量。生産目標は青、それ以外はオレンジ" />
        <KV label="⚙️ マシーン名 × N 台（下部）" value="使用する製造機名と必要台数（切り上げ整数）" />
        <KV label="余剰 +X.XX/min" value="台数切り上げにより生じる余剰量。緑色で表示" />
      </div>

      <H3>ノードのバッジ</H3>
      <P>
        <Badge color="#64b5f6" bg="rgba(100,181,246,0.15)">目標</Badge>
        生産目標として設定したアイテム。枠が青くなります。
      </P>
      <P>
        <Badge color="#4caf50" bg="rgba(76,175,80,0.1)">Raw Resource</Badge>
        採掘のみで入手できる原材料。製造機は不要です。
      </P>

      <H3>余剰ノード（緑の破線）</H3>
      <P>
        台数切り上げにより発生した余剰量を示す専用ノードです。
        親アイテムノードの下に緑の破線枠で表示され、製造余剰の量を緑色で表します。
        「📦 余剰」ボタンで表示・非表示を切り替えられます。
      </P>

      <H2>矢印（エッジ）の見方</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="オレンジの矢印" value="通常のフロー（素材 → 製品）。ラベルに 1 分あたりの供給量を表示" />
        <KV label="緑の破線矢印" value="余剰フロー。アイテムノードから余剰ノードへの接続" />
      </div>
      <P>
        各ノードの左右に表示される小さな丸（ハンドル）がエッジの接続点です。
        接続先が複数ある場合は、接続先ノードの上下位置に合わせてハンドルが自動的に並び替わります。
      </P>

      <H2>基本操作</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="ノードをドラッグ" value="ノードを移動。ドラッグ後、接続ハンドルの位置が自動で並び替わります。位置はプランごとに保存" />
        <KV label="右クリック / 中クリックでドラッグ" value="グラフ全体をパン（移動）します" />
        <KV label="Shift ＋ ドラッグ（空白部分）" value="矩形選択。完全に枠内に収まったノードだけが選択されます" />
        <KV label="Shift ＋ クリック" value="ノードを追加選択します" />
        <KV label="Ctrl ＋ クリック" value="そのノードと依存する全ての子ノードをまとめて選択します" />
        <KV label="複数選択後にドラッグ" value="選択したノードをまとめて移動します" />
        <KV label="マウスホイール（縦）" value="グラフを上下にスクロールします" />
        <KV label="Shift ＋ ホイール" value="グラフを左右にスクロールします" />
        <KV label="Ctrl ＋ ホイール" value="グラフの中心を基点にズームイン・ズームアウトします" />
        <KV label="左下 ＋ / − / 🏠 ボタン" value="ズーム調整・全体表示へフィット" />
      </div>

      <H2>ノード選択時のハイライト</H2>
      <P>
        ノードを選択すると、選択ノードと依存関係のあるノード・エッジが強調表示され、無関係なノードは薄く表示されます。
      </P>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="シアン枠（選択中）" value="現在選択されているノード" />
        <KV label="オレンジ枠 ＋ グロー（依存元）" value="選択ノードに素材を供給している子ノード（依存元）。オレンジの矢印で接続" />
        <KV label="青い矢印（依存先へ）" value="選択ノードが素材を供給している先のエッジが青くなります" />
        <KV label="半透明（無関係）" value="選択ノードと依存関係のないノードは opacity 45% に暗くなります" />
      </div>
      <Tip>
        Ctrl ＋ クリックで選択すると、そのノードを起点に依存する全ての素材ノード（子・孫…）が一括選択されます。
        まとめて移動したいときに便利です。
      </Tip>

      <H2>右クリックメニュー</H2>
      <P>
        ノードを右クリックすると、そのノードに対する操作メニューが表示されます。
      </P>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="✂ 分割" value="原材料ノードを消費先ごとに分割します。複数の消費先を持つ原材料のみ表示" />
        <KV label="⊕ 統合" value="分割済み原材料ノードを再び 1 つに統合します。分割中のノードのみ表示" />
        <KV label="⬦ 依存先をすべて選択" value="そのノードに依存する全ての子ノード（余剰ノード含む）をまとめて選択します" />
      </div>

      <H2>原材料の分割機能</H2>
      <P>
        1 つの原材料が複数の製品から使われる場合、デフォルトでは 1 つのノードに集約されます。
        「分割」を使うと消費先ごとに独立したノードとして配置し直すことができます。
      </P>
      <Screen>
        例: 「鉄鉱石」が「鉄のインゴット」と「鋼材のインゴット」の両方で使われる場合{'\n'}
        {'\n'}
        【分割前】鉄鉱石（合計 XX/min） → 2 本の矢印で接続{'\n'}
        【分割後】鉄鉱石 A（XX/min）→ 鉄のインゴット{'\n'}
        　　　　　鉄鉱石 B（XX/min）→ 鋼材のインゴット{'\n'}
        {'\n'}
        → 工場内の配管・ベルトを分けて設計する際のイメージに合わせられる
      </Screen>
      <Note>
        分割状態はプランごとに保存されます。右クリックメニューの「統合」またはノード上の「統合」ボタンで元に戻せます。
      </Note>

      <H2>右上のコントロールボタン</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="📦 余剰（ON/OFF）" value="余剰ノードと余剰エッジの表示・非表示を切り替えます。ON 時はオレンジ強調" />
        <KV label="📐 スナップ（ON/OFF）" value="ON にするとノードを 20px グリッドに吸着させます。精密な整列に便利" />
        <KV label="🔄 配置リセット" value="手動移動したノードをすべて自動レイアウト（dagre RL）に戻します" />
        <KV label="⤢ 最大表示 / ⤓ 縮小" value="グラフを全画面表示にします" />
      </div>

      <H2>ノード配置の自動保存</H2>
      <P>
        ノードをドラッグして移動すると、その位置がプランごとにブラウザに自動保存されます。
        次回タブを開いたときも同じ配置が復元されます。
        「🔄 配置リセット」を押すと位置情報が削除され、dagre による自動レイアウトに戻ります。
      </P>
      <Note>
        分割状態はリセットされません。配置のみリセットされます。
      </Note>
    </div>
  );
}

/** プラン管理セクション: 保存・エクスポート・インポートの説明 */
function PlansGuide() {
  return (
    <div>
      <H1>📁 プラン管理</H1>
      <P>
        「プラン」ページ（左サイドバーの「プラン」）では、保存した生産計画を一覧管理できます。
        プランはブラウザの localStorage に保存されるため、サーバーへの接続は不要です。
      </P>

      <H2>プランページの操作</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="新規プラン作成" value="「新規プラン作成」ボタンから作成。計算機画面の「＋」ボタンでも作成できます" />
        <KV label="開く" value="アクティブでないプランの「開く」ボタンで切り替えます" />
        <KV label="エクスポート（↓）" value="アクティブなプランを JSON ファイルとしてダウンロードします" />
        <KV label="削除（🗑）" value="確認ダイアログの後、プランを完全に削除します" />
        <KV label="インポート" value="JSON ファイルを選択してプランを復元します" />
      </div>
      <Note>
        エクスポートはアクティブなプランのみ対応しています。
        他のプランをエクスポートしたい場合は、先に「開く」でアクティブに切り替えてください。
      </Note>

      <H2>プランに保存される情報</H2>
      <Screen>
        ・プラン名{'\n'}
        ・生産目標アイテムと必要量（/分）{'\n'}
        ・代替レシピの選択状態{'\n'}
        ・製造ラインのノード配置位置（手動移動した場合）{'\n'}
        ・製造ラインの原材料分割状態{'\n'}
        ・最終更新日時
      </Screen>

      <H2>計算機画面でのプラン操作</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="プラン名をクリック" value="プラン名をインライン編集できます（Enter または Escape で確定）" />
        <KV label="📂 ボタン" value="保存済みプラン一覧をドロップダウンで表示し、クリックで切り替え" />
        <KV label="＋ ボタン" value="新規プランを作成します" />
      </div>

      <H2>代替レシピの設定</H2>
      <P>
        ゲーム内で研究した代替レシピがある場合、計算機画面テーブルの「変更」ボタンまたはアイテム横の ⚙️ から選択できます。
        選択したレシピはプランに保存され、次回ロード時も維持されます。
        変更後は「⚙️ 計算実行」で再計算してください。
      </P>

      <Warn>
        プランデータはブラウザの localStorage に保存されます。
        ブラウザのキャッシュ・サイトデータを削除すると失われます。
        重要なプランは「エクスポート」で JSON ファイルとしてバックアップすることを推奨します。
      </Warn>
    </div>
  );
}

/** アイテムブラウザセクション: カテゴリ一覧・検索・詳細パネルの説明 */
function ItemsGuide() {
  return (
    <div>
      <H1>📦 アイテムブラウザ</H1>
      <P>
        左サイドバーの「アイテム」ページでは、ゲーム内の全アイテムとレシピを検索・閲覧できます。
        計算機画面に遷移しなくてもレシピ内容を事前確認できます。
      </P>

      <H2>基本的な使い方</H2>
      <Screen>
        ① カテゴリタブで絞り込み{'\n'}
        ② 検索バーでアイテム名を入力（日本語・英語対応）{'\n'}
        ③ カードをクリックすると右側に詳細パネルが表示される{'\n'}
        ④ 詳細パネルでは製造レシピの入出力・使用マシーン・Tier などを確認できる
      </Screen>

      <H2>カテゴリ一覧</H2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', margin: '12px 0' }}>
        {[
          ['⛏️ 資源', '鉄鉱石・銅鉱石・SAMなど採掘で得られる原材料'],
          ['🔩 インゴット', '精錬・加工されたインゴット類（FICSITEのインゴット含む）'],
          ['🔧 基本部品', '鉄板・ネジ・鋼梁など基礎部品（FICSITEの三角板含む）'],
          ['⚡ 電子機器', 'ワイヤー・回路基板・活性SAM・SAM変動機など'],
          ['⚙️ 産業用部品', 'モーター・ローター・布など工業部品'],
          ['💻 通信機器', 'コンピューター・水晶発振器・AIリミッターなど'],
          ['🧴 石油製品', 'プラスチック・ゴム・石油コークスなど'],
          ['🔥 燃料', 'ターボ燃料・ロケット燃料・イオン化燃料など'],
          ['🪨 鉱物', 'コンクリート・シリカ・圧縮石炭・銅粉など'],
          ['🧪 先進精製', 'アルミのスクラップ・陽極板など精製素材'],
          ['☢️ 核材料', 'ウラン・プルトニウム・フィクソニウムなど核関連'],
          ['⚛️ 量子', 'ダイヤモンド・時間結晶・暗黒物質・量子プロセッサーなど'],
          ['🚀 軌道EV', 'スペースエレベーター向け部品（AI拡張サーバーなど）'],
          ['💧 流体', '原油・水・窒素ガスなどの液体・気体'],
          ['🌿 バイオマス', 'バイオマス・葉・木材・菌糸類'],
          ['📦 包装資材', '空キャニスター・空流体タンク・梱包済みロケット燃料など'],
          ['💣 消耗品', '黒色火薬・無煙火薬など'],
          ['🏹 弾薬', '鉄のリバーなど射出物'],
          ['🛡️ 装備', 'ジェットパック・化学防護服など装備品'],
          ['✨ 特殊', 'パワーシャードなど特殊素材'],
        ].map(([cat, desc]) => (
          <div key={cat} style={{ background: '#0f3460', borderRadius: '6px', padding: '8px 12px' }}>
            <div style={{ color: '#e0e0e0', fontSize: '13px', fontWeight: 600, marginBottom: '2px' }}>{cat}</div>
            <div style={{ color: '#a0a0b0', fontSize: '11px' }}>{desc}</div>
          </div>
        ))}
      </div>

      <Tip>
        アイテム詳細パネルでは「このアイテムを作るレシピ」（標準・代替の両方）が表示されます。
        代替レシピが複数ある場合もここで事前確認できます。
        代替レシピの表示は「設定」ページの「代替レシピを表示」で切り替えられます。
      </Tip>
    </div>
  );
}

/** 設定セクション: 各設定項目とオーバークロック計算式の説明 */
function SettingsGuide() {
  return (
    <div>
      <H1>🔧 設定</H1>
      <P>左サイドバーの「設定」ページからアプリの動作をカスタマイズできます。設定は自動でブラウザに保存されます。</P>

      <H2>設定項目</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="言語" value="🇯🇵 日本語 / 🇺🇸 English を切り替えます。アイテム名・マシーン名の表示言語に影響します" />
        <KV label="テーマ" value="現在はダークテーマのみ対応しています（ライト・システムは準備中）" />
        <KV label="デフォルトOC率" value="デフォルトのオーバークロック率（1% ～ 250%）。現バージョンでは設定値を確認できますが、計算への自動適用は未対応です" />
        <KV label="代替レシピを表示" value="アイテムブラウザの詳細パネルで代替レシピを表示するかどうかを切り替えます" />
      </div>

      <H2>オーバークロックの計算式</H2>
      <P>
        製造機をオーバークロックすると生産速度が上がりますが、電力消費は指数的に増加します。
        計算機の建物ビューに表示される消費電力は以下の式で算出されます。
      </P>
      <Screen>
        有効生産量 = 基準生産量 × OC率{'\n'}
        消費電力   = 基準電力   × OC率 ^ 1.6{'\n'}
        {'\n'}
        例: OC 150%（1.5 倍速）→ 電力は約 1.83 倍{'\n'}
        例: OC 250%（2.5 倍速）→ 電力は約 4.66 倍
      </Screen>

      <H2>アプリ情報</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="バージョン" value="Satisfactory Factory Planner v1.2" />
        <KV label="対応バージョン" value="Satisfactory 1.0 のゲームデータに基づいています" />
        <KV label="データ数" value="アイテム 127、レシピ 107、マシーン 11 種類" />
        <KV label="保存方式" value="ブラウザの localStorage（サーバー不要・オフライン動作）" />
      </div>
    </div>
  );
}
