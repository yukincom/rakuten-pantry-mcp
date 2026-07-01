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