import { useState } from 'react';

type Section = 'quickstart' | 'calculator' | 'graph' | 'plans' | 'items' | 'settings';

const SECTIONS: { id: Section; emoji: string; title: string }[] = [
  { id: 'quickstart',  emoji: '🚀', title: 'クイックスタート' },
  { id: 'calculator',  emoji: '⚙️', title: '計算機画面' },
  { id: 'graph',       emoji: '🌲', title: '依存グラフ' },
  { id: 'plans',       emoji: '📁', title: 'プラン管理' },
  { id: 'items',       emoji: '📦', title: 'アイテムブラウザ' },
  { id: 'settings',    emoji: '🔧', title: '設定' },
];

export default function HelpPage() {
  const [active, setActive] = useState<Section>('quickstart');

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: '#1a1a2e' }}>
      {/* Left TOC */}
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

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '32px 48px' }}>
        {active === 'quickstart' && <QuickStart />}
        {active === 'calculator' && <CalculatorGuide />}
        {active === 'graph' && <GraphGuide />}
        {active === 'plans' && <PlansGuide />}
        {active === 'items' && <ItemsGuide />}
        {active === 'settings' && <SettingsGuide />}
      </div>
    </div>
  );
}

// ─── Shared Styles ───────────────────────────────────────────────────────────

const H1 = ({ children }: { children: React.ReactNode }) => (
  <h1 style={{ color: '#f5a623', fontSize: '26px', fontWeight: 700, margin: '0 0 8px' }}>
    {children}
  </h1>
);

const H2 = ({ children }: { children: React.ReactNode }) => (
  <h2 style={{ color: '#e0e0e0', fontSize: '17px', fontWeight: 700, margin: '32px 0 12px', borderBottom: '1px solid #0f3460', paddingBottom: '8px' }}>
    {children}
  </h2>
);

const P = ({ children }: { children: React.ReactNode }) => (
  <p style={{ color: '#c0c0cc', fontSize: '14px', lineHeight: 1.75, margin: '0 0 12px' }}>
    {children}
  </p>
);

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

const KV = ({ label, value }: { label: string; value: string }) => (
  <div style={{ display: 'flex', gap: '12px', padding: '8px 12px', borderBottom: '1px solid #0f3460' }}>
    <div style={{ color: '#f5a623', fontSize: '13px', fontWeight: 600, minWidth: '160px' }}>{label}</div>
    <div style={{ color: '#c0c0cc', fontSize: '13px', lineHeight: 1.6 }}>{value}</div>
  </div>
);

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

// ─── Sections ────────────────────────────────────────────────────────────────

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
        右パネルに計算結果が 3 種類のビューで表示されます。
        <br />
        <b style={{ color: '#e0e0e0' }}>📊 テーブル</b> — 素材一覧（必要量・台数・製造量・余剰）
        <br />
        <b style={{ color: '#e0e0e0' }}>🏭 建物</b> — 種別ごとの製造機数と消費電力
        <br />
        <b style={{ color: '#e0e0e0' }}>🌲 依存グラフ</b> — 素材の依存関係をグラフで可視化
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

function CalculatorGuide() {
  return (
    <div>
      <H1>⚙️ 計算機画面</H1>
      <P>メインの生産計算ページです。左パネルで目標を設定し、右パネルで結果を確認します。</P>

      <H2>左パネル — 目標設定</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="ACTIVE PLAN" value="現在編集中のプラン名。クリックすると直接編集できます" />
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

      <H2>🏭 建物ビュー</H2>
      <P>
        必要な製造機を種類別に集計して表示します。各カードには台数と消費電力（MW）が表示されます。
        電力は製造機の基準消費電力 × 台数で計算されます。
      </P>
    </div>
  );
}

function GraphGuide() {
  return (
    <div>
      <H1>🌲 依存グラフ</H1>
      <P>
        計算機画面の「🌲 依存グラフ」タブで表示される、素材の依存関係を視覚化したインタラクティブグラフです。
        どの素材が何の素材を必要とするか、製造の流れを一目で把握できます。
      </P>

      <H2>ノードの見方</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="🔵 青枠・青背景ノード" value='生産目標（TARGET）として設定したアイテム。「TARGET」バッジ付き' />
        <KV label="🟡 黄枠ノード" value="中間素材（製造が必要なアイテム）" />
        <KV label="🟢 緑枠ノード" value="原材料（Raw Resource）。採掘のみで製造不要" />
        <KV label="XX /min" value="このノードで必要な 1 分あたりの量" />
        <KV label="× 数字" value="必要な製造機の台数（切り上げ整数）" />
        <KV label="ノード下部の小テキスト" value="使用する製造機の名前" />
      </div>

      <H2>グラフの操作</H2>
      <div style={{ background: '#0f3460', border: '1px solid #1a3a6a', borderRadius: '8px', overflow: 'hidden', margin: '12px 0' }}>
        <KV label="ノードをドラッグ" value="ノードを自由に移動できます。位置はプランごとに自動保存されます" />
        <KV label="背景をドラッグ" value="グラフ全体をパン（スクロール）します" />
        <KV label="マウスホイール / ピンチ" value="ズームイン・ズームアウト" />
        <KV label="🔄 配置リセット" value="手動で移動したノードをすべて自動レイアウトに戻します" />
        <KV label="⤢ 最大化" value="グラフを全画面表示に切り替えます（⤓ 縮小で元に戻る）" />
        <KV label="右下のミニマップ" value="グラフ全体の俯瞰。クリックで任意の位置へジャンプ" />
        <KV label="左下の ＋ / − ボタン" value="ズームの調整" />
      </div>

      <H2>グラフの構造</H2>
      <P>
        グラフは<b style={{ color: '#e0e0e0' }}>1 対 1 のツリー構造</b>です。
        同じ素材が複数の親アイテムから必要とされる場合でも、それぞれ独立したノードとして展開されます。
        DAG（有向非巡回グラフ）のような複数のエッジが 1 つのノードに集約される形式ではありません。
      </P>
      <Screen>
        例: 「鉄のインゴット」が「鉄板」と「鉄のロッド」の両方で必要な場合{'\n'}
        → 「鉄のインゴット」ノードが 2 つ独立して表示されます{'\n'}
        → それぞれのノードの「必要量/分」は各親の計算に基づいた値になります
      </Screen>
      <Tip>
        ノードの位置はプランごとに localStorage に保存されます。
        「🔄 配置リセット」を押すと位置情報が削除され、自動レイアウトに戻ります。
      </Tip>
    </div>
  );
}

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
        ・依存グラフのノード配置位置（手動移動した場合）{'\n'}
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
          ['⛏️ 資源', '鉄鉱石・銅鉱石など採掘で得られる原材料'],
          ['🔩 インゴット', '精錬・加工されたインゴット類'],
          ['🔧 基本部品', '鉄板・ネジ・鋼梁など基礎部品'],
          ['⚡ 電子機器', 'ワイヤー・ケーブル・回路基板など'],
          ['⚙️ 産業用部品', 'モーター・ローター・ステーターなど'],
          ['💻 通信機器', 'コンピューター・水晶発振器・AIリミッターなど'],
          ['🧴 石油製品', 'プラスチック・ゴム・燃料など'],
          ['🔥 燃料', 'ターボ燃料・ロケット燃料など高度な燃料'],
          ['🪨 鉱物', 'コンクリート・シリカなど建材系'],
          ['🧪 先進精製', 'アルミのスクラップなど精製素材'],
          ['☢️ 核燃料', 'ウラン・プルトニウムなど核関連'],
          ['🚀 軌道EV', 'スペースエレベーター向け部品'],
          ['💧 流体', '原油・水・窒素ガスなどの液体・気体'],
          ['🛡️ 装備', 'ジェットパック・ガスマスクなど装備品'],
          ['✨ 特殊', 'SAMトークンなど特殊素材'],
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
        <KV label="バージョン" value="Satisfactory Factory Planner v1.0" />
        <KV label="対応バージョン" value="Satisfactory 1.0 のゲームデータに基づいています" />
        <KV label="データ数" value="アイテム 70+、レシピ 50+、マシーン 8 種類" />
        <KV label="保存方式" value="ブラウザの localStorage（サーバー不要・オフライン動作）" />
      </div>
    </div>
  );
}
