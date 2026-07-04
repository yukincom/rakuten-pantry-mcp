# rakuten-pantry-mcp

[mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp) をベースにした楽天市場（Ichiba）向け MCP サーバーです。  
upstream（npm の `rakuten-mcp`）にはない機能を追加しています。

## 追加機能（upstream にない）

| フィールド / 機能 | 説明 |
|------------------|------|
| `quantity` | 商品名から総個数を解析（例: `24本入り×2ケース` → 48） |
| `unitPrice` | `itemPrice ÷ quantity` |
| `postageLabel` | `送料無料` / `送料別` / `要確認` |
| `estimatedTotalPrice` | 送料無料時は `itemPrice` |
| `shippingVerified` | 送料が API 上で確定しているか |
| `compare_ichiba_value` | 単価比較＋送料ウェブ確認のガイドプロンプト |

改造の詳細は [CHANGES.md](CHANGES.md)。upstream へのパッチは [patches/](patches/) を参照。

## リポジトリ構成

```
rakuten-pantry-mcp/
├── src/
│   ├── index.ts              # エントリポイント
│   ├── server.ts             # MCP サーバー組み立て
│   ├── client.ts             # 楽天 API クライアント
│   ├── config.ts / errors.ts / i18n.ts / auth.ts
│   ├── tools/
│   │   ├── ichiba.ts         # ★ 改造の本体（5ツール）
│   │   ├── index.ts
│   │   ├── types.ts
│   │   └── meta.ts
│   ├── prompts/
│   │   ├── ichiba.ts         # ★ compare_ichiba_value
│   │   ├── schema.ts         # ★ プロンプト引数の型変換
│   │   └── index.ts
│   ├── transports/           # stdio / HTTP
│   └── resources/
├── test/                     # ichiba / prompts / http のテスト
├── patches/                  # upstream 向け差分
├── dist/                     # ビルド成果物（npm run build）
├── package.json
├── README.md
├── CHANGES.md
├── AGENTS.md
└── LICENSE
```

Ichiba ツール 5個のみ（Books / Travel / Recipe / Kobo / GORA は含みません）。`resources/` は現時点では未使用（空のレジストリ）です。

## セットアップ

```bash
git clone https://github.com/yukin_co/rakuten-pantry-mcp.git
cd rakuten-pantry-mcp
npm install
npm run build
```

## MCP クライアント設定

環境変数 `RAKUTEN_APP_ID` と `RAKUTEN_ACCESS_KEY` が必要です（[楽天デベロッパー](https://webservice.rakuten.co.jp/)で取得）。

### ローカル clone を使う場合

`args` には **clone 先の `dist/index.js` への絶対パス** を指定します。

```json
{
  "mcpServers": {
    "rakuten-pantry": {
      "command": "node",
      "args": ["/path/to/rakuten-pantry-mcp/dist/index.js"],
      "env": {
        "RAKUTEN_APP_ID": "your-app-id",
        "RAKUTEN_ACCESS_KEY": "your-access-key"
      }
    }
  }
}
```

### npx で使う場合（npm 公開後）

```json
{
  "mcpServers": {
    "rakuten-pantry": {
      "command": "npx",
      "args": ["-y", "rakuten-pantry-mcp"],
      "env": {
        "RAKUTEN_APP_ID": "your-app-id",
        "RAKUTEN_ACCESS_KEY": "your-access-key"
      }
    }
  }
}
```

> npm の `rakuten-mcp`（[mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp)）は別パッケージです。上記の `rakuten-pantry-mcp` を指定してください。

## ツール（5）

| ツール | 内容 |
|--------|------|
| `ichiba_item_search` | キーワード検索（quantity / unitPrice / 送料フラグ付き） |
| `ichiba_genre_search` | ジャンルツリー |
| `ichiba_tag_search` | タグ参照 |
| `ichiba_item_ranking` | 売れ筋ランキング |
| `ichiba_product_search` | 複数店舗横断の価格比較 |

## プロンプト（1）

| プロンプト | 内容 |
|------------|------|
| `compare_ichiba_value` | 単価比較と送料確認の手順をエージェントに渡す |

## 開発

```bash
npm run typecheck
npm test
npm run build
```

## ライセンス

MIT — 元: [mrslbt/rakuten-mcp](https://github.com/mrslbt/rakuten-mcp)（MIT）