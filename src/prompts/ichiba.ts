/**
 * Guided Ichiba value-comparison workflow.
 *
 * Chains API search (quantity, unitPrice, postageFlag) with agent web search
 * for shipping on finalists — the API does not expose shipping amounts.
 */

import type { PromptDefinition } from "../tools/types.js";

export const compareIchibaValue: PromptDefinition = {
  name: "compare_ichiba_value",
  title: {
    en: "Find cheapest Rakuten Ichiba deal (incl. shipping / per-unit)",
    ja: "楽天市場で送料込み・単価最安を探す",
  },
  description: {
    en: "USE THIS when the user wants: cheapest including shipping, per-unit price, total cost ranking, best deal, or says 送料込み / コスパ / 安い順 / 最安 / 単価 on Rakuten Ichiba. Chains ichiba_item_search → unitPrice pre-sort → web shipping check on top finalists → final re-rank. Do NOT use ichiba_item_search alone for these requests.",
    ja: "ユーザーが送料込み・コスパ・安い順・最安・単価比較を求めたらこれを使う。ichiba_item_search→unitPrice粗ソート→上位の送料ウェブ確認→再ソート。単独の ichiba_item_search だけでは不十分。",
  },
  arguments: [
    {
      name: "keyword",
      description: {
        en: "Product search keyword, e.g. '500ml PET tea 24 bottles'.",
        ja: "商品検索キーワード。例:「ペットボトルお茶 500ml 24本」。",
      },
      required: true,
    },
    {
      name: "max_price",
      description: {
        en: "Optional max item price in JPY.",
        ja: "任意。商品価格の上限(円)。",
      },
      required: false,
    },
    {
      name: "finalists",
      description: {
        en: "How many finalists to web-check for shipping (default 5).",
        ja: "送料ウェブ確認する上位件数(デフォルト5)。",
      },
      required: false,
    },
  ],
  build: (args) => {
    const keyword = args.keyword?.trim() || "(ask the user for a product keyword)";
    const maxPrice = args.max_price?.trim();
    const finalists = args.finalists?.trim() || "5";

    const priceFilterJa = maxPrice
      ? `商品価格上限: ${maxPrice}円 (ichiba_item_search の max_price に渡す)。`
      : "ユーザー指定がなければ価格上限なし。";

    return {
      text: `楽天市場でコスパ（単価）最安の商品を探してください。

キーワード: ${keyword}
${priceFilterJa}
送料ウェブ確認する上位件数: ${finalists}

手順:

1. ichiba_item_search をキーワード${maxPrice ? `・max_price=${maxPrice}` : ""}で呼ぶ (必要なら hits=30)。
2. unitPrice 昇順で粗ソート (unitPrice 不明はパック価格重視時のみ考慮)。
3. 仕分け:
   - shippingVerified=true かつ needsShippingRecheck が立っていない: estimatedTotalPrice を確定合計、送料0円。
   - shippingVerified=false または needsShippingRecheck=true: ウェブ確認が必要(後者はAPIのpostageFlag表記に齟齬の疑いがあるケース。他商品よりunitPriceが不自然に安い)。
4. 要確認の上位${finalists}件について、itemUrl または「店舗名+商品名+送料」でウェブ検索し、本土向け送料(円)を確認。不明なら「送料要確認」とし、金額を推測しない。
5. totalPrice = 商品価格 + 確認済み送料 で再ソート。同程度なら unitPrice 順。
6. 順位表を提示: 順位、商品名、店舗、商品価格、postageLabel、送料、totalPrice、quantity、unitPrice、URL。
7. 1位を推奨し、注意点(送料未確認、レビュー少など)を1つ添える。

送料は推測禁止。ウェブ根拠または postageFlag=1(送料無料)のみ使用。`,
    };
  },
};