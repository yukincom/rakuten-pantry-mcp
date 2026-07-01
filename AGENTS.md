# AGENTS.md — rakuten-pantry-mcp

[mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) の Ichiba 改造版。  
upstream にない追加: `quantity`, `unitPrice`, `postageLabel`, `shippingVerified`, `compare_ichiba_value`。

## コマンド

```bash
npm install
npm run typecheck && npm test && npm run build
```

## 改造の中心ファイル

| ファイル | 役割 |
|----------|------|
| `src/tools/ichiba.ts` | 単価・送料フラグの本体 |
| `src/prompts/ichiba.ts` | `compare_ichiba_value` |
| `src/prompts/schema.ts` | プロンプト引数の数値→文字列変換 |
| `src/server.ts` | プロンプト登録・SERVER_INSTRUCTIONS |

## compare_ichiba_value

単価比較や送料込みの並び替えを求められたときは、`ichiba_item_search` 単体よりこちらを優先。

## upstream

[mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) v1.1.0 ベース。Ichiba 以外のツールは意図的に含めていない。