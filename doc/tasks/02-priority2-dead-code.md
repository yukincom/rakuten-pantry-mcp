# Task 02: Priority 2 - 死んでいるコード除去 + コメント修正

## 目的
- 完全に未使用の `buildAuthParams` を削除してデッドコードを減らす。
- i18n.ts の嘘コメント（存在しないテストファイルへの言及）を修正。

## 優先度
2

## 変更対象ファイル
- `src/auth.ts`
- `src/i18n.ts`

## 変更詳細

### 変更1: buildAuthParams の削除（src/auth.ts）

**場所**: 約21〜28行目

**Before**:
```ts
export interface AuthParams {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
}

export function buildAuthParams(config: Config): AuthParams {
  return {
    applicationId: config.applicationId,
    accessKey: config.accessKey,
    affiliateId: config.affiliateId,
  };
}

/**
 * Append auth params to a URLSearchParams object.
 * Mutates the passed-in params for convenience.
 */
export function appendAuthParams(params: URLSearchParams, auth: AuthParams): void {
```

**After**:
```ts
export interface AuthParams {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
}

/**
 * Append auth params to a URLSearchParams object.
 * Mutates the passed-in params for convenience.
 */
export function appendAuthParams(params: URLSearchParams, auth: AuthParams): void {
```

**置換 exact string**:
old:
```
export interface AuthParams {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
}

export function buildAuthParams(config: Config): AuthParams {
  return {
    applicationId: config.applicationId,
    accessKey: config.accessKey,
    affiliateId: config.affiliateId,
  };
}

/**
 * Append auth params to a URLSearchParams object.
 * Mutates the passed-in params for convenience.
 */
export function appendAuthParams(params: URLSearchParams, auth: AuthParams): void {
```

new:
```
export interface AuthParams {
  applicationId: string;
  accessKey: string;
  affiliateId?: string;
}

/**
 * Append auth params to a URLSearchParams object.
 * Mutates the passed-in params for convenience.
 */
export function appendAuthParams(params: URLSearchParams, auth: AuthParams): void {
```

**注意**: `client.ts` では `appendAuthParams(params, config)` と直接 Config を渡している（構造的部分型で動作）。buildAuthParams は一切呼ばれていない。

### 変更2: i18n.ts の嘘コメント削除

**場所**: `src/i18n.ts` 冒頭コメント（1〜9行目）

**Before**:
```ts
/**
 * Bilingual EN/JA labels used across tool/prompt/resource descriptions.
 *
 * Every user-facing string surfaced by the MCP MUST have non-empty `en` and `ja`.
 * Bilingual descriptions are a first-class product decision: Japanese-speaking
 * agents and English-speaking developers both deserve native-language tool docs.
 *
 * CI enforces non-empty values (test/i18n.test.ts).
 */
```

**After**:
```ts
/**
 * Bilingual EN/JA labels used across tool/prompt/resource descriptions.
 *
 * Every user-facing string surfaced by the MCP MUST have non-empty `en` and `ja`.
 * Bilingual descriptions are a first-class product decision: Japanese-speaking
 * agents and English-speaking developers both deserve native-language tool docs.
 */
```

（"CI enforces..." の行を削除）

## 手順
1. auth.ts で上記置換を実行。
2. i18n.ts でコメント行を削除。
3. 両ファイル保存。

## 検証方法
```bash
npm run typecheck
npm test
```
- typecheck で `buildAuthParams` の参照エラーが出ないことを確認（出なければ成功）。

## 依存
- なし

## コミットメッセージ例
```
chore: remove dead buildAuthParams and fix misleading i18n comment

- buildAuthParams was exported but never used (client uses appendAuthParams directly)
- Removed false claim about test/i18n.test.ts which does not exist
```

## 補足
- もし将来的に Config → AuthParams の変換が必要になったら復活させるが、現在は不要。
- テスト追加（タスク03）で Bilingual の空チェックを追加する選択肢もあるが、このタスクではコメント削除で十分。
