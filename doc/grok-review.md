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

---

## プロンプト

Claudeにもチェックしてもらった。
コードはcomposerに料理してもらうので、彼が仕事をしやすいように作業の分割を計画してください。

---

✅ 作業分割計画（Composer向け・VSCode前提）

Claudeのレビュー内容は正確で、私の前回レビューとも完全に一致しています。
コード修正はあなた（または composer）がやる前提で、「composerがコピペしやすく、レビューしやすく、1タスク10〜30分以内で終わる」 粒度に細かく分割しました。

全体方針
• 各タスクは 独立 or 最小依存 で、1コミット単位で完結させる。
• ロジック変更は必ずテストとセット。
• 変更は「前後5〜10行のコンテキスト付き」で提示（VSCodeで検索→置換しやすい）。
• 検証コマンドは毎回同じ：npm run typecheck && npm test
• 影響範囲の小さいものから。優先度1から着手推奨（Claude案通り）。
• 並行可能タスクは明記。

───

推奨タスク分割（優先度順）

タスク1: Priority 1 — ranking への outlier 検知適用（最優先・ロジック整合）

目的: ichiba_item_ranking でも needsShippingRecheck が立つようにする。ツール説明文との矛盾を解消。

変更ファイル:
• src/tools/ichiba.ts

変更箇所（前後コンテキスト付き）:

    // 変更前
    const mapped = (raw.Items ?? []).map((r) => ({
      ...mapItem(r as RawItem),
      rank: r.Item.rank ?? 0,
    }));
    mapped.sort((a, b) => a.rank - b.rank);

    const result: IchibaItemRankingResult = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped,
    };

    return result;

    // 変更後
    const mapped = (raw.Items ?? []).map((r) => ({
      ...mapItem(r as RawItem),
      rank: r.Item.rank ?? 0,
    }));
    mapped.sort((a, b) => a.rank - b.rank);

    detectShippingOutliers(mapped);   // ← ここを1行追加

    const result: IchibaItemRankingResult = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped,
    };

    return result;

注意:
• detectShippingOutliers は同一ファイル内なので import 不要。
• mapped は IchibaItem[] 互換なので型的に問題なし（mutation する関数）。

このタスク単独で完結。次のタスク3のテストとセットで価値が出る。

検証: typecheck + npm test（既存テストは通るはず）。

───

タスク2: Priority 2 — 死んでいるコード + 嘘コメントの除去

2-A. buildAuthParams の削除
• src/auth.ts
• export function buildAuthParams(...) を丸ごと削除（呼び出し元ゼロ）。
• AuthParams interface は appendAuthParams でまだ使っているので残す。

2-B. i18n.ts のコメント修正
• src/i18n.ts 冒頭コメントの CI enforces non-empty values (test/i18n.test.ts) を削除（または「現状は手動確認」とする）。

推奨サブタスク分割:
• 2-A と 2-B は同時にやってもOK（両方小さすぎる）。

───

タスク3: Priority 3 — テスト追加（タスク1と強く連動）

3-A. detectShippingOutliers のユニットテスト
• test/ichiba.test.ts に新しい describe を追加。
• 既存の postage helpers / extractQuantityFromItemName のすぐ下あたりが自然。
• 5件以上 unitPrice ありの配列をインライン or fixture で作り、以下を検証:
  • cheapest に needsShippingRecheck: true が立つ
  • minRatio 境界値
  • 5件未満なら何もしない
  • cheapest 以外は変更されない

3-B. ranking 統合テスト
• ranking fixture が現在3件なので、新しく ranking 用の5件以上 fixture を作るか、handler テストで直接 ichibaItemRankingTool を呼んで検証。

3-C. parseEnvFlags
• src/index.ts の関数を export するか、config.ts に移動して pure に。
• または簡易テストを test/ に追加（--env 複数、=なし、値に=を含むケース）。

───

タスク4: Priority 4 — patches の陳腐化対応

ファイル:
• patches/README.md（メイン）
• 必要なら patches/ichiba.patch は更新せず「現状維持」とする

変更内容:
• README に以下を追記
  │ 注意: このパッチは v1.1.0 ベースの特定時点のスナップショットです。detectShippingOutliers / needsShippingRecheck / ワークフロー文言更新以降の変更は含まれていません。最新状態を適用したい場合は本リポジトリのコードを直接参照してください。

運用ポリシーを明記する形が現実的（毎回 patch 再生成は避ける）。

───

タスク5: Priority 5 — 小さい掃除（バッチ可能）

これらは影響が極めて局所なので、1つのコミットにまとめても良い。

┌────────────┬─────────────┬─────────────────────────────────────────┬──────────────────┐
│ サブタスク │ ファイル    │ 内容                                    │ 難易度           │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.1        │ src/tools/  │ 重複コメントブロックの片方を削除        │ 超簡単           │
│            │ ichiba.     │                                         │                  │
│            │ ts:464-468  │                                         │                  │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.2        │ src/tools/  │ estimatedTotalPrice の JSDoc            │ 超簡単           │
│            │ ichiba.     │ インデントを他のフィールドに合わせる    │                  │
│            │ ts:332付近  │                                         │                  │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.3        │ src/client. │ User-Agent の "1.2" を SERVER_VERSION   │ 小               │
│            │ ts:100      │ または package.json から取得（要相談）  │                  │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.4        │ src/config  │ HOST_LEGACY が未使用なら export 削除 +  │ 小               │
│            │ .ts + test/ │ テストの無意味な assert を削除          │                  │
│            │ ichiba.test │                                         │                  │
│            │ .ts         │                                         │                  │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.5        │ src/        │ 常に空なので「resources は現在未使用」  │ 判断が必要       │
│            │ resources   │ と明記するか削除                        │                  │
│            │ /index.ts + │                                         │                  │
│            │ src/server  │                                         │                  │
│            │ .ts +       │                                         │                  │
│            │ README      │                                         │                  │
├────────────┼─────────────┼─────────────────────────────────────────┼──────────────────┤
│ 5.6        │ src/        │ build() の戻り値を {en, ja} → {text:    │ 中（             │
│            │ prompts/    │ string} に（ja固定）。                  │ 影響範囲確認を） │
│            │ ichiba.ts + │ server側の使用箇所もシンプル化。tool    │                  │
│            │ src/server  │ 説明の bilingual 連結は一旦据え置き     │                  │
│            │ .ts         │                                         │                  │
└────────────┴─────────────┴─────────────────────────────────────────┴──────────────────┘

5.6は特に慎重に。Claudeも「影響範囲が広いのでまず prompt から」と書いている通り。

───

推奨着手順（composerが回しやすい順）

1. タスク1（ranking outlier適用） ← ここから
2. タスク5の超簡単なもの（5.1 重複コメント + 5.2 JSDocインデント）← 即効性が高くモチベ上がる
3. タスク2（死にコード削除）
4. タスク3（テスト追加）← タスク1の後
5. タスク4（patches README）
6. タスク5の残り（5.3〜5.6）

並行可能
• タスク2 + タスク5の機械的掃除
• タスク4（ドキュメントのみ）

───

質問: この分割で進めますか？

特に以下を教えてください：
• タスク1から即着手でOK？
• タスク5.6（promptのja統一）は一旦後回しにする？
• client.ts の「Cannot find name」件（エディタ型解決）はこの計画に含める？（別タスクとして import { URLSearchParams } from 'url' を入れるか、tsconfig "types": ["node"] 追加の話）

必要なら、各タスクごとにより細かい before/after diff とコミットメッセージ案を全部用意します。

---

## プロンプト

では各タスクの詳細指示をmd形式で/docに保存して！

