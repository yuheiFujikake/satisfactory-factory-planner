/**
 * Google Analytics 4（GA4）計測ユーティリティ。
 *
 * gtag.js が index.html で読み込まれていることを前提とする。
 * gtag が未初期化の場合（SSR・テスト環境など）は何もせず安全に終了する。
 */

/** GA4 測定 ID */
const GA_ID = 'G-7CC55S34E7';

declare global {
  interface Window {
    gtag: (...args: unknown[]) => void;
    dataLayer: unknown[];
  }
}

/** gtag が利用可能かどうかを確認する */
const isAvailable = () => typeof window !== 'undefined' && typeof window.gtag === 'function';

/**
 * ページビューイベントを GA4 に送信する。
 *
 * React Router のルート変更時に呼び出し、SPA のページ遷移を計測する。
 *
 * @param path - 現在のパス名（例: `/`, `/plans`, `/settings`）
 */
export function trackPageView(path: string) {
  if (!isAvailable()) return;
  window.gtag('config', GA_ID, { page_path: path });
}

/**
 * カスタムイベントを GA4 に送信する。
 *
 * 主な計測イベント:
 * - `calculate` — 計算実行（`target_count` パラメータ付き）
 * - `plan_create` — プラン新規作成
 * - `plan_export` — プラン JSON エクスポート
 * - `plan_import` — プラン JSON インポート
 * - `recipe_change` — レシピ変更（`item_id`, `recipe_id` パラメータ付き）
 *
 * @param eventName - GA4 イベント名
 * @param params - イベントに付加するパラメータ（省略可）
 */
export function trackEvent(
  eventName: string,
  params?: Record<string, string | number | boolean>,
) {
  if (!isAvailable()) return;
  window.gtag('event', eventName, params);
}
