## プロンプト
rakuten-pantry-mcp  のコードレビュー頼む。コード修正はせず、全体の矛盾、死んでるコードその他変なところをリストアップ。修正案も書いて！


## rakuten-pantry-mcp コードレビュー結果（全体スキャン）
- 2026/7/4
- レビュー：Grok Build Grok

対象: /Users/yukin_co/AI_assistant/rakuten-pantry-mcp（src + 設定 + テスト + patches + docs を網羅）。
コード修正は一切行っていません。git の uncommitted 変更（src/index.ts, src/prompts/ichiba.ts, src/tools/ichiba.ts + dist）も含めて全体をレビュー。

Typecheck / 全テスト (99) / build はすべてパス。

1. 死んでいるコード / 未使用エクスポート

• buildAuthParams (src/auth.ts:21) が完全に未使用。client.ts は appendAuthParams しか import していない。
  • 修正案: 削除（または internal 化）。export している意味がなくなっている。

• resources/index.ts が常に空配列 [] を export。server.ts の登録ロジック・capabilities 判定・ResourceDefinition（tools/types.ts 内）・README の resources 記述のほとんどが死んでいる。
  • 修正案: 完全に削除するか、実際にリソースを追加する。空のまま放置するなら docs とコードを「Ichiba-only では resources 未使用」と明記。

• detectShippingOutliers は export されているが、テストで一切 import/実行されていない（後述のテスト欠落と連動）。

• HOST_LEGACY (config.ts) は src ロジックで一切使われていない（全ツールが openapi 固定）。テストで値だけ assert されているだけ。
  • 修正案: Ichiba-only フォークとして不要なら削除（後方互換のエラーパーサーは残す）。

2. 矛盾・一貫性の欠如

• Outlier 検知の適用漏れ（重要）:
  • detectShippingOutliers + needsShippingRecheck は ichiba_item_search の handler でのみ呼ばれる。
  • ichiba_item_ranking は mapItem で IchibaItem（および IchibaRankedItem extends）を返し、ツール説明に ICHIBA_VALUE_COMPARE_WORKFLOW（needsShippingRecheck 言及）が埋め込まれているが、一切フラグが立たない。
  • 修正案: ranking でも呼ぶ（またはツール説明から ranking 向け記述を分離/削除）。または needsShippingRecheck を ranking ではサポート外と明記。

• prompt の ja テキストが完全に無視:
  • compareIchibaValue.build は常に { en, ja } を返す。
  • server.ts の registerPrompt は text.en のみ使用。ja は死んでいる。
  • 修正案: build の戻り値を { text: string }（en のみ）にするか、ja 対応を本気でやるなら MCP の messages で lang を切り替える設計を決める。現在は「bilingual を謳いつつ実質 en 固定」の矛盾。
->楽天は日本向けサービスのため、jaに統一する。

• postage / value workflow と ranking の食い違い:
  • ICHIBA_VALUE_COMPARE_WORKFLOW や compare_ichiba_value プロンプトの説明が item_search 向けに最適化されているが、ranking ツールの description にも同じ文言が付いている。
  • 修正案: ツールごとに workflow 記述を分けるか、「ranking では compare プロンプト推奨」と明示。

• patches と実装の乖離:
  • patches/ichiba.patch は detectShippingOutliers / needsShippingRecheck / 最近の workflow 文言更新が反映されていない。
  • patches/README も「手動追加が必要」と書かれているが、現在の最新状態と同期が取れていない。
  • 修正案: パッチを最新コードに更新するか、「特定 upstream バージョン向けのスナップショット」と明記。git format-patch に移行するのも手。

• i18n コメントの嘘:
  • src/i18n.ts に「CI enforces non-empty values (test/i18n.test.ts)」とあるが、test/i18n.test.ts は存在しない。
  • 修正案: コメント削除。実際に enforcement が欲しいなら tests/prompts.test.ts などで全 Bilingual を走査するテストを書く。

3. 変なところ・フォーマット・実装の粗

• src/tools/ichiba.ts に重複コメントブロック（genre_search ヘッダが2回連続で出現）。最近の編集で残ったゴミ。
  • 修正案: 1つにまとめる。

• IchibaItem インターフェース内の JSDoc インデント崩れ:

unitPrice?: number;
/**
 * Payable total...
  （他のフィールドと揃っていない）

• extractQuantityFromItemName / detectShippingOutliers のロジックはテストで薄くカバーされているのみ。特に outlier は 0 件テスト（fixtures が 3 件しかなく、5 件未満で no-op になるため）。
  • 修正案: 5件以上で unitPrice ありのケースを fixtures または inline で追加し、mutation 挙動・minRatio・cheapest-only の仕様を明示的にテスト。

• バージョン重複:
  • client.ts の User-Agent がハードコード "rakuten-pantry-mcp/1.2"
  • SERVER_VERSION / package.json と別管理 → 将来 drift しやすい。
  • 修正案: 共有 const から生成するか package.json を read する（起動時のみ）。

• dist/ が git 管理下（.gitignore にない）で、src 編集後に build しないと dirty になる。
  • 運用上の違和感。prepublishOnly で build されるが、ローカル開発では常に意識する必要がある。

• parseEnvFlags（最近追加）は --env KEY=val をサポートするが、テストが一切ない。CLI パーサ全体（parseCliTransport との組み合わせ）も薄いカバレッジ。

• resources / prompts / tools の型定義が src/tools/types.ts に集約されている（PromptDefinition / ResourceDefinition）。命名がミスリーディング。

• テストコメントの古さ:
  • 「Ichiba is not yet migrated」「uses the legacy host」などの文言が残っている（実際は 20260401 openapi 系に完全移行済み）。

4. その他・軽微

• promptArgumentSchema で number/boolean を強制 string 化するのは MCP の現実対応として合理的だが、schema 記述時に en+ja をただ連結しているので UI で見ると少し雑。
• ranking レスポンスの rank ソートロジックはコメントと fixture で若干食い違いの匂いがするが、動作自体は問題なさそう。
• 全体として「Ichiba-only フォーク」として upstream をかなり綺麗に削っており、品質は高い。新しい単価・送料フラグの追加は意図が明確で良い。
• レートリトライ・エラーマッピング・bilingual 記述はしっかりしている。

優先度まとめ（おすすめ修正順）

1. detectShippingOutliers の ranking 未適用（機能の矛盾）
2. 死んでいる buildAuthParams と i18n コメント
3. テスト欠落（outlier + --env CLI）
4. patches の陳腐化
5. prompt ja の無駄 + バージョン重複などの小さい掃除

全体として、コアロジックは健全で、フォークとして目的（単価・送料込みコスパ比較のガイド）がよく達成されている。一方で「Ichiba-only に絞った結果の掃除不足」と「最近追加した機能の網羅不足」が目立つ状態です。