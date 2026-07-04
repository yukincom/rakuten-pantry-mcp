# Task 03: Priority 3 - テスト追加（outlier + parseEnvFlags）

## 目的
- `detectShippingOutliers` のロジックをカバー（現在0テスト）。
- ranking 側も統合的に検証。
- 新規追加機能 `parseEnvFlags` のテストを追加。

## 優先度
3

## 変更対象ファイル
- `test/ichiba.test.ts`
- `src/index.ts` （必要なら export 化）
- 新規 fixture が必要な場合 `test/fixtures/ichiba/`

## 変更詳細

### 3-A: detectShippingOutliers のユニットテスト追加

**場所**: `test/ichiba.test.ts` で既存の `extractQuantityFromItemName` describe の直後あたりに新しい describe を追加。

**追加するコード例（おおよそ）**:
```ts
import {
  // ... 既存
  detectShippingOutliers,
} from "../src/tools/ichiba.js";

describe("detectShippingOutliers", () => {
  it("flags the cheapest item when its unitPrice is significantly lower than peers (minRatio)", () => {
    const items: any[] = [
      { unitPrice: 100, itemName: "A" },
      { unitPrice: 120, itemName: "B" },
      { unitPrice: 121, itemName: "C" },
      { unitPrice: 122, itemName: "D" },
      { unitPrice: 123, itemName: "E" },
    ];
    const result = detectShippingOutliers(items, 1.12);
    expect(result[0].needsShippingRecheck).toBe(true);
    expect(result[1].needsShippingRecheck).toBeUndefined();
  });

  it("does nothing when fewer than 5 items with unitPrice", () => {
    const items = [{ unitPrice: 100 }, { unitPrice: 50 }];
    const result = detectShippingOutliers(items);
    expect(result[0].needsShippingRecheck).toBeUndefined();
  });
});
```

**手順**:
- 関数を import に追加。
- describe ブロックを適切な位置に挿入。

### 3-B: ranking での outlier 統合テスト

ranking fixture が3件しかないので:
- 既存テストで `ichibaItemRankingTool` を呼ぶテストを拡張、または
- 5件以上のデータをモックして `needsShippingRecheck` を検証。

### 3-C: parseEnvFlags のテスト

`src/index.ts` の `parseEnvFlags` は private。

**対応**:
- 関数を `export function` にするか、テストしやすくするために `config.ts` に移動して pure function 化を検討。
- または `test/` から直接テスト（簡易的に `process.env` を操作）。

推奨: 関数を export してテストから呼べるようにする。

例:
```ts
/** Parse --env KEY=VALUE flags from CLI args. (exported for testing) */
export function parseEnvFlags(argv: string[]): void { ... }
```

テスト例:
```ts
import { parseEnvFlags } from "../src/index.js";

it("sets env from --env KEY=VAL", () => {
  const original = process.env.FOO;
  parseEnvFlags(["--env", "FOO=bar"]);
  expect(process.env.FOO).toBe("bar");
  // cleanup
});
```

## 手順（composer）
1. まずタスク01を適用済みであることを確認。
2. `test/ichiba.test.ts` に import と describe を追加。
3. 必要に応じて `src/index.ts` で export 追加。
4. 新規 fixture が必要なら `test/fixtures/ichiba/ranking_with_outliers.json` を作成（5+ items, postageFlag=1 で unitPrice に差）。

## 検証
```bash
npm test -- --grep "detectShippingOutliers|parseEnvFlags"
npm run typecheck
```

## 依存
- タスク01（outlier ロジック適用後）

## コミットメッセージ例
```
test: add coverage for detectShippingOutliers and parseEnvFlags

- Unit tests for outlier detection (minRatio, <5 items edge case)
- Basic tests for --env CLI flag parsing
```

## 補足
- ranking fixture を拡張する場合は既存 `item_ranking_success.json` を参考に5件以上のデータを作る。
- テストは「composer が仕事をしやすい」ように、シンプルな inline データで十分。
