# 改造内容（upstream との差分）

ベース: [mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) v1.1.0

## 追加・変更したファイル

| ファイル | 内容 |
|----------|------|
| `src/tools/ichiba.ts` | `quantity` / `unitPrice` / `postageLabel` / `shippingVerified` / `estimatedTotalPrice` |
| `src/prompts/ichiba.ts` | **新規** `compare_ichiba_value` |
| `src/prompts/schema.ts` | **新規** プロンプト引数の型変換 |
| `src/prompts/index.ts` | `compare_ichiba_value` の登録 |
| `src/server.ts` | プロンプト schema・SERVER_INSTRUCTIONS |
| `src/tools/index.ts` | Ichiba 5ツールのみ |
| `test/ichiba.test.ts` | 数量・送料のテスト |
| `test/prompts.test.ts` | **新規** |

## upstream から省いたもの

- Books / Travel / Recipe / Kobo / GORA（23ツール）
- `plan_rakuten_trip` プロンプト

## ロジック概要

1. **単価**: 商品名を解析 → `quantity` → `unitPrice = itemPrice / quantity`
2. **送料フラグ**: `postageFlag` → `postageLabel`
3. **確定合計**: 送料無料時のみ `estimatedTotalPrice = itemPrice`
4. **送料金額**: API にないため MCP では計算しない。`compare_ichiba_value` でエージェントにウェブ確認を指示

## upstream への適用

`patches/` の差分を [mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) に当てることで、全28ツール版に改造だけを載せられます。手順は [patches/README.md](patches/README.md)。