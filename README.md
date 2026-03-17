# Satisfactory Factory Planner

ゲーム「[Satisfactory](https://www.satisfactorygame.com/)」の工場設計を支援する Web アプリケーションです。
生産目標を設定するだけで、必要な全素材・製造機台数・消費電力を自動計算します。

---

## 機能

- **生産計算** — アイテムと目標生産量を設定すると、依存する全素材の必要量・製造機台数・余剰量を自動算出
- **複数プラン管理** — プランを複数作成し、用途ごとに切り替えて管理
- **依存グラフ** — 素材の依存関係をインタラクティブなツリーグラフで可視化（ノード位置の手動調整・保存に対応）
- **製造地タブ** — アイテムをインゴット・液体原材料の組み合わせ別にグループ化して表示
- **代替レシピ対応** — アイテムごとに使用レシピを切り替えて計算
- **アイテムブラウザ** — 全アイテム・レシピをカテゴリ別に検索・閲覧
- **エクスポート / インポート** — プランを JSON ファイルとして保存・復元
- **日本語 / 英語対応** — アイテム名・マシーン名の表示言語を切り替え可能
- **オフライン動作** — データはすべてブラウザの localStorage に保存（サーバー不要）

---

## 技術スタック

| カテゴリ | 使用技術 |
|---|---|
| UI フレームワーク | React 19 + TypeScript |
| ビルドツール | Vite 8 |
| 状態管理 | Zustand 5 |
| ルーティング | React Router 7 |
| グラフ描画 | @xyflow/react (React Flow) + dagre |
| スタイリング | Tailwind CSS v4 |
| アイコン | lucide-react |

---

## セットアップ

```bash
# リポジトリをクローン
git clone <repository-url>
cd satisfactory-factory-planner

# 依存パッケージをインストール
npm install

# 開発サーバーを起動（http://localhost:5173）
npm run dev

# プロダクションビルド
npm run build
```

---

## プロジェクト構成

```text
src/
├── data/               # ゲームデータ（JSON）
│   ├── items.json      # アイテム定義（127 種類）
│   ├── recipes.json    # レシピ定義（107 種類）
│   └── machines.json   # 製造機定義（11 種類）
├── types/              # TypeScript 型定義
│   ├── game.types.ts
│   ├── plan.types.ts
│   └── calculation.types.ts
├── domain/             # ビジネスロジック
│   ├── calculator.ts   # 依存ツリー展開・集計・ソート
│   └── graphBuilder.ts # React Flow 用グラフ構造生成
├── stores/             # Zustand ストア
│   ├── planStore.ts
│   ├── calculationStore.ts
│   ├── gameDataStore.ts
│   ├── uiStore.ts
│   └── settingsStore.ts
├── pages/              # ページコンポーネント
│   ├── CalculatorPage/ # メイン計算画面（テーブル・建物・グラフ・製造地タブ）
│   ├── PlanManagerPage/# プラン一覧・管理
│   ├── ItemBrowserPage/# アイテム検索・詳細
│   ├── SettingsPage/   # 設定
│   └── HelpPage/       # 使い方ガイド
└── components/         # 共有コンポーネント
    ├── flow/           # 依存グラフ（React Flow）
    ├── layout/         # レイアウト・サイドバー
    └── ItemPicker.tsx  # アイテム選択モーダル
```

---

## 計算ロジック

依存ツリーは `src/domain/calculator.ts` に実装されています。

```text
目標アイテム
└── 中間素材 A（必要量 = 目標量 ÷ レシピ出力量 × 入力量）
    ├── 中間素材 B
    │   └── 原材料 X（採掘資源）
    └── 原材料 Y
```

- **必要台数** = `ceil(必要量/分 ÷ 1 台あたり出力量)`
- **製造量/分** = `必要台数 × 1 台あたり出力量`
- **余剰量/分** = `製造量/分 − 必要量/分`
- **消費電力** = `基準電力 × OC率 ^ 1.6`

テーブルの表示順：生産目標アイテム（追加順）→ 中間素材（製造ステップ数が多い順）→ 原材料

---

## データについて

ゲームデータは Satisfactory 1.0 に基づいています。
アイテム名の日本語訳は [Satisfactory 日本語 Wiki](https://wikiwiki.jp/sf-jp/) を参考にしています。

---

## ライセンス

MIT
