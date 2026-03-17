/**
 * ランダムな UUID v4 文字列を生成して返す。
 *
 * Web Crypto API の `crypto.randomUUID()` を使用するため、
 * セキュアなランダム性が保証される。
 *
 * @returns UUID v4 形式の文字列（例: `"110e8400-e29b-41d4-a716-446655440000"`）
 */
export function generateId(): string {
  return crypto.randomUUID();
}
