# upstream へのパッチ

[mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) に Ichiba 改造だけを載せる場合用。

## パッチ一覧

| ファイル | 内容 |
|----------|------|
| `ichiba.patch` | 単価・送料フラグ |
| `server.patch` | プロンプト schema・SERVER_INSTRUCTIONS |
| `prompts-index.patch` | compare プロンプト登録 |

## 新規ファイル（手動追加）

- `src/prompts/ichiba.ts`
- `src/prompts/schema.ts`
- `test/prompts.test.ts`

## 当て方

```bash
git clone https://github.com/mrslbt/rakuten-mcp.git
cd rakuten-mcp
patch -p1 < /path/to/rakuten-pantry-mcp/patches/ichiba.patch
patch -p1 < /path/to/rakuten-pantry-mcp/patches/server.patch
patch -p1 < /path/to/rakuten-pantry-mcp/patches/prompts-index.patch
```

`src/prompts/index.ts` に `compareIchibaValue` を import して配列に追加してください。

## 注意: 同期状況

このパッチ群は upstream (mrslbt/rakuten-mcp) v1.1.0 ベースの**特定時点のスナップショット**です。

以下の変更はパッチに反映されていません:
- `detectShippingOutliers` / `needsShippingRecheck` ロジック
- `ICHIBA_VALUE_COMPARE_WORKFLOW` の更新（shippingVerified + needsShippingRecheck 考慮）
- `parseEnvFlags` の追加
- その他細かい修正

**運用ポリシー**:
- パッチは参考として維持。
- 最新の改造を upstream に適用したい場合は、本リポジトリの `src/` を直接参照するか、git diff を生成してください。
- 毎回の patch 再生成は行いません。