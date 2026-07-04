# Task 05: Priority 5 - 小さい掃除（バッチ）

## 目的
機械的・低リスクなクリーンアップをまとめて実施。コードの読みやすさ・一貫性を向上。

## 優先度
5（低いが、積み重なると効果大）

## 対象（サブタスク単位で分けてOK）

### 5.1 重複コメントブロックの削除
**ファイル**: `src/tools/ichiba.ts`

**場所**: 464〜468行目付近

**Before**:
```ts
};

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_genre_search — Browse Rakuten Ichiba genre tree

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_genre_search — Browse Rakuten Ichiba genre tree
// ──────────────────────────────────────────────────────────────────────────────

const genreSearchInput = z.object({
```

**After**:
```ts
};

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_genre_search — Browse Rakuten Ichiba genre tree
// ──────────────────────────────────────────────────────────────────────────────

const genreSearchInput = z.object({
```

**置換推奨**:
old: 2行連続の同じコメントブロックを1つに。

### 5.2 JSDoc インデント崩れ修正
**ファイル**: `src/tools/ichiba.ts`

**場所**: `unitPrice?: number;` の直後（約332行目）

**Before**:
```ts
  /** itemPrice divided by quantity (JPY per unit), when quantity is known. */
  unitPrice?: number;
/**
   * Payable total when shipping is known (equals itemPrice when postageLabel is 送料無料).
   * Undefined when shipping must be confirmed via web search.
   */
  estimatedTotalPrice?: number;
```

**After**:
```ts
  /** itemPrice divided by quantity (JPY per unit), when quantity is known. */
  unitPrice?: number;
  /**
   * Payable total when shipping is known (equals itemPrice when postageLabel is 送料無料).
   * Undefined when shipping must be confirmed via web search.
   */
  estimatedTotalPrice?: number;
```

### 5.3 バージョン文字列のハードコード解消
**ファイル**: `src/client.ts`

**場所**: 約100行目

**現在**:
```ts
"User-Agent": "rakuten-pantry-mcp/1.2",
```

**推奨対応**:
- `SERVER_VERSION` を `src/server.ts` から export して使う、または
- `package.json` を動的に読む（起動時のみ）。

簡単策: `src/server.ts` から `SERVER_VERSION` を import して `"rakuten-pantry-mcp/${SERVER_VERSION}"` とする。
（`export { SERVER_NAME, SERVER_VERSION };` は既に存在）

### 5.4 HOST_LEGACY の削除
**ファイル**: `src/config.ts` + `test/ichiba.test.ts`

- `config.ts` の `export const HOST_LEGACY = ...` を削除。
- `test/ichiba.test.ts` の `"uses the legacy host..."` テストと import を削除（コメントも古い）。

### 5.5 resources の扱い
**ファイル**: `src/resources/index.ts`, `src/server.ts`, `README.md`

オプション:
A. 「現在 resources は未使用」とコメントを追加。
B. 空のまま維持し、README に注記。

判断が必要。まずはコメント追加で。

### 5.6 prompt の ja 統一（影響範囲注意）
**ファイル**: `src/prompts/ichiba.ts` + `src/server.ts`

- `compareIchibaValue.build` の戻り値を `{ en: string; ja?: string }` → `{ text: string }` に。
- server.ts の prompt 登録部分で `text.en` → `text` （または ja 固定）に変更。

**注意**: tool/resource の description はまだ bilingual 連結のまま。prompt だけ先行でシンプル化。
Claudeも「まず prompt から」と指摘。

## 手順
- 各サブタスクを個別に置換（VSCode で検索しやすい）。
- 可能なら 5.1, 5.2, 5.4 は1コミットにまとめ。
- 5.3 と 5.6 は別コミット推奨（少し影響あり）。

## 検証
全サブタスク後:
```bash
npm run typecheck && npm test
```

## コミットメッセージ例（バッチの場合）
```
chore: small cleanups from code review

- Remove duplicate genre_search comment header
- Fix JSDoc indentation in IchibaItem
- Remove unused HOST_LEGACY
- ...
```

## 補足
- 5.6 は影響を最小に。tool 説明の bilingual 表示は現状維持を推奨。
- バージョン解決は `import { SERVER_VERSION } from "./server.js";` で可能。
