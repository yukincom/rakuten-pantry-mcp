# rakuten-pantry-mcp コードレビュー修正タスク一覧

このドキュメントは、コードレビューで発見された問題を修正するための作業分割計画です。
composer（実装担当）が各タスクを効率的に処理できるように、詳細指示をMD形式で分割して保存しています。

## 全体方針
- 各タスクは**原子的に**、1コミット単位で完結させる。
- ロジック変更はテストとセットで。
- 検証は常に `npm run typecheck && npm test` を実行。
- VSCode前提で、変更は前後コンテキスト付きで提示。
- 優先度順に進める。タスク1から着手推奨。
- コード修正は composer が担当。レビュー指摘は修正せず。

## タスク一覧（優先度順）

| タスクID | タイトル | 優先度 | ファイル主な変更 | 推定時間 | 依存 |
|----------|----------|--------|------------------|----------|------|
| 01 | ranking への outlier 検知適用 | 1 (最高) | src/tools/ichiba.ts | 15分 | なし |
| 02 | 死んでいるコード除去 + コメント修正 | 2 | src/auth.ts, src/i18n.ts | 10分 | なし |
| 03 | テスト追加（outlier + parseEnvFlags） | 3 | test/ichiba.test.ts, src/index.ts など | 30分 | タスク01 |
| 04 | patches の陳腐化対応 | 4 | patches/README.md | 10分 | なし |
| 05 | 小さい掃除（バッチ） | 5 | 複数 (tools/ichiba.ts, client.ts など) | 20-40分 | なし（一部） |

## 個別タスク詳細
各タスクの詳細は以下のファイルに記載：

- [01-priority1-ranking-outlier.md](./01-priority1-ranking-outlier.md)
- [02-priority2-dead-code.md](./02-priority2-dead-code.md)
- [03-priority3-tests.md](./03-priority3-tests.md)
- [04-priority4-patches.md](./04-priority4-patches.md)
- [05-priority5-small-cleanups.md](./05-priority5-small-cleanups.md)

## 作業フロー（composer向け）
1. タスクMDを読み、指示に従って変更。
2. 変更後、検証コマンドを実行。
3. 問題なければコミット（例のメッセージを使用）。
4. 次のタスクへ。

## 注意
- ClaudeおよびGrokのレビュー内容に基づく。
- クライアント.tsの "Cannot find name" エディタ問題は別途（型解決改善タスクとして後回し可）。
- promptのja統一などは影響範囲を確認しながら。

最終更新: 2026-07-04
