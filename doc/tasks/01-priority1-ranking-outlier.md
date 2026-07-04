# Task 01: Priority 1 - ranking への outlier 検知適用

## 目的
`ichiba_item_ranking` ツールでも `detectShippingOutliers` を呼び、 `needsShippingRecheck` フラグが正しく設定されるようにする。
これにより、ツール説明の `ICHIBA_VALUE_COMPARE_WORKFLOW` との整合を取る。
現在は item_search のみで ranking は未適用 → 矛盾。

## 優先度
最高（1）。ロジックの一貫性に関わる。

## 変更対象ファイル
- `src/tools/ichiba.ts` （主）

## 変更詳細

### 変更箇所1: ichiba_item_ranking ハンドラ内で detectShippingOutliers を呼ぶ

**場所**: `src/tools/ichiba.ts` 約757-769行目付近（`mapped.sort` の直後）

**Before**:
```ts
    // Rakuten returns the page in descending rank order (e.g. 30 → 1 on page 1).
    // Present in natural ascending order so item[0] is rank 1 on page 1.
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
  },
};
```

**After**:
```ts
    // Rakuten returns the page in descending rank order (e.g. 30 → 1 on page 1).
    // Present in natural ascending order so item[0] is rank 1 on page 1.
    const mapped = (raw.Items ?? []).map((r) => ({
      ...mapItem(r as RawItem),
      rank: r.Item.rank ?? 0,
    }));
    mapped.sort((a, b) => a.rank - b.rank);

    detectShippingOutliers(mapped);  // ← 追加: ranking 結果にも outlier 検知を適用

    const result: IchibaItemRankingResult = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped,
    };

    return result;
  },
};
```

**置換に使う exact string（search_replace 用）**:
検索対象（old）:
```
    mapped.sort((a, b) => a.rank - b.rank);

    const result: IchibaItemRankingResult = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped,
    };

    return result;
```

置換（new）:
```
    mapped.sort((a, b) => a.rank - b.rank);

    detectShippingOutliers(mapped);  // ← 追加: ranking 結果にも outlier 検知を適用

    const result: IchibaItemRankingResult = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped,
    };

    return result;
```

## 手順（composer実行順）
1. `src/tools/ichiba.ts` を開く。
2. 上記 before を検索して after に置換（VSCode で Ctrl+Shift+H で一括置換推奨）。
3. `detectShippingOutliers` が同じファイル内で定義済みなので import 追加不要。
4. 変更を保存。

## 検証方法
```bash
npm run typecheck
npm test
```
- 既存テストはすべてパスするはず（ranking テストはまだ outlier 検証していないため）。
- 手動確認: ranking ツールのレスポンスに `needsShippingRecheck` が付くケースを確認（後でテストで）。

## 依存タスク
- なし（単独で適用可能）
- ただしタスク03のテストと組み合わせると効果大

## コミットメッセージ例
```
fix: apply detectShippingOutliers to ichiba_item_ranking

- ichiba_item_search では既に呼ばれていたが ranking では未適用だった
- これにより ICHIBA_VALUE_COMPARE_WORKFLOW 記述との整合が取れる
- needsShippingRecheck フラグが ranking 結果でも利用可能に
```

## 補足・注意
- 関数は mutation するので `detectShippingOutliers(mapped)` で十分（戻り値を使わなくてもOK）。
- item_ranking の結果型 `IchibaRankedItem extends IchibaItem` なので互換性あり。
- 将来的にテストで ranking fixture を5件以上に拡張する必要あり（タスク03参照）。
