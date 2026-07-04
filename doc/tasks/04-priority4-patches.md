# Task 04: Priority 4 - patches の陳腐化対応

## 目的
`patches/` が最新コード（detectShippingOutliers, needsShippingRecheck, workflow 更新など）と同期していない状態を明確化する。
毎回 patch を再生成するコストを避け、ドキュメントで運用ポリシーを明記。

## 優先度
4

## 変更対象ファイル
- `patches/README.md`

## 変更詳細

**場所**: `patches/README.md` の末尾にセクションを追加

**追加内容**:
```md
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
```

## 手順
1. `patches/README.md` を開く。
2. 末尾に上記セクションを追記。
3. 保存。

## 検証
- ドキュメントとして読めること。
- ビルド/テストには影響なし。

## 依存
- なし

## コミットメッセージ例
```
docs: clarify patch synchronization status in patches/README.md

- Note that recent features (detectShippingOutliers etc.) are not included
- Document operational policy to avoid unnecessary patch regeneration
```

## 補足
- もし本気で最新化したい場合は別途 `git format-patch` を使ったタスクを立てるが、現時点ではドキュメント修正で十分。
- `patches/ichiba.patch` 自体は**修正不要**（内容が古くても明記で対応）。
