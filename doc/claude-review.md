## プロンプト

https://github.com/yukincom/rakuten-pantry-mcp/tree/main
このリポジトリの以下の問題を修正するための計画を立ててください

「grok-review.mdをまるなげ」

---

- 2026/7/4
- レビュー：Claude Sonnet 5

- 優先度1: detectShippingOutliers の ranking 未適用
- 該当箇所: src/tools/ichiba.ts

ichiba_item_search ハンドラ(457行目)は detectShippingOutliers(result.items) を呼んでいる
ichiba_item_ranking ハンドラ(726〜771行目)は mapped 配列を作った後(757〜761行目)、outlier 検知を一切呼ばずに return result している(763〜769行目)

修正方針: mapped.sort(...) の直後、result 組み立て前に detectShippingOutliers(mapped) を追加する。1行追加で済み、ツール説明文(ICHIBA_VALUE_COMPARE_WORKFLOW)との整合が取れる。テストは test/ichiba.test.ts に ranking 用の fixture を5件以上・unitPrice 差ありで追加する必要あり(優先度3と連動)。
優先度2: 死んでいる buildAuthParams と i18n の嘘コメント
src/auth.ts(21行目 buildAuthParams)

client.ts は appendAuthParams のみ import。buildAuthParams は完全に不使用。
修正方針: export を外して内部関数化するか、丸ごと削除(呼び出し元がないなら削除が素直)。

src/i18n.ts(11行目のコメント)

CI enforces non-empty values (test/i18n.test.ts) とあるが test/i18n.test.ts は存在しない(test/ には ichiba.test.ts, prompts.test.ts, http-transport.test.ts のみ)。
修正方針: コメントを削除するか、実際に test/prompts.test.ts 等に全 Bilingual オブジェクトを走査して en/ja が空でないことを assert するテストを追加してコメントを事実にする。後者を推奨(既存 prompts.test.ts に数行足すだけで済む)。

優先度3: テスト欠落

outlier: test/fixtures/ に5件以上・unitPrice ありで意図的に外れ値を含む fixture を追加し、detectShippingOutliers を直接 import してユニットテスト(minRatio 境界値、cheapest 以外は変更されないこと)を書く。ranking 側の統合テストも追加。
parseEnvFlags(src/index.ts): --env KEY=VALUE の単体テストがない。index.ts からロジックを切り出しにくければ、config.ts 側に近い形でエクスポートしてテスト可能にするか、簡易な pure function として export してテストする。

優先度4: patches の陳腐化
patches/ichiba.patch, patches/README.md

detectShippingOutliers / needsShippingRecheck / 最近の workflow 文言が未反映。
修正方針: 現状は「特定バージョンのスナップショット」であることを patches/README.md に明記するか、git format-patch で最新コミットから再生成して同期する。運用コストを考えると、README に「同期ポリシー」を明記する方が現実的(毎回 patch 再生成は手間)。

優先度5: 小さい掃除

prompt の ja 統一(ご指定どおり): src/prompts/ichiba.ts の build() を { en, ja } → { text: string }(ja 固定)に変更。src/server.ts 128〜131行目の registerPrompt も text.ja 相当を直接使う形にシンプル化。

あわせて server.ts 59〜60行目・121〜122行目・145〜146行目の「en + [JA] ja」連結表示も、楽天=日本向けという方針に合わせて ja 単独表示に統一するか検討(現状は全ツール説明が bilingual 連結表示)。ここは影響範囲が広いので、まず prompt から着手し、tool/resource 説明は別途相談したい。


重複コメントブロック: src/tools/ichiba.ts 464行目・467行目に // ichiba_genre_search — Browse Rakuten Ichiba genre tree が2回連続。片方削除。
JSDoc インデント崩れ: 同ファイル 316行目付近、unitPrice?: number; の直後の estimatedTotalPrice の JSDoc がインデント0のまま(他は2スペース)。揃える。
バージョン重複: src/client.ts 100行目 "rakuten-pantry-mcp/1.2" がハードコード、package.json は "1.2.0"。package.json を起動時に読んで生成するか、共有 const SERVER_VERSION を1箇所に集約して両方から参照。
HOST_LEGACY(config.ts 9行目): src ロジックで未使用。Ichiba-only フォークとして不要なら削除(テストで値だけ assert している箇所も合わせて削除)。
resources/index.ts: 常に空配列。server.ts の登録ロジック・ResourceDefinition 型・README の resources 記述も含めて、削除するか「未使用」と明記するか要判断。

