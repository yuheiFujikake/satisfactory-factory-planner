import { useEffect, useState } from 'react';

/** モバイル判定のブレークポイント（px）。このサイズ未満をモバイルとみなす */
const BREAKPOINT = 1024;

/**
 * ウィンドウ幅がモバイルサイズかどうかを返すカスタムフック。
 *
 * `MediaQueryList` の `change` イベントを監視し、
 * ウィンドウリサイズに追従してリアクティブに更新される。
 *
 * @returns ウィンドウ幅が {@link BREAKPOINT} 未満の場合 `true`
 */
export function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < BREAKPOINT);

  useEffect(() => {
    const mq = window.matchMedia(`(max-width: ${BREAKPOINT - 1}px)`);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener('change', handler);
    // アンマウント時にリスナーを解除してメモリリークを防ぐ
    return () => mq.removeEventListener('change', handler);
  }, []);

  return isMobile;
}
