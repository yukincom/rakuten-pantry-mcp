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

    const priceFilter = maxPrice
      ? `Max item price: ${maxPrice} JPY (pass as max_price to ichiba_item_search).`
      : "No max price filter unless the user specified one.";

    const priceFilterJa = maxPrice
      ? `商品価格上限: ${maxPrice}円 (ichiba_item_search の max_price に渡す)。`
      : "ユーザー指定がなければ価格上限なし。";

    return {
      en: `Find the best cost-per-unit deal on Rakuten Ichiba.

Keyword: ${keyword}
${priceFilter}
Finalists to web-check for shipping: ${finalists}

Follow this plan exactly:

1. Call ichiba_item_search with the keyword${maxPrice ? ` and max_price=${maxPrice}` : ""} (hits=30 if needed).
2. Pre-rank candidates by unitPrice ascending (lowest per-unit cost first). Skip items with no unitPrice unless the user cares about total pack price only.
3. Split results:
   - shippingVerified=true (postageLabel "送料無料"): treat estimatedTotalPrice as confirmed total; shipping = 0.
   - shippingVerified=false (postageLabel "送料別" or "要確認"): needs web verification.
4. Take the top ${finalists} items that still need shipping verification. For each, web-search using itemUrl first, or query "shopName itemName 送料" / "shopName 送料". Extract the shipping cost in JPY for a typical mainland-Japan delivery. If ambiguous, note "送料要確認" — do not invent a number.
5. Compute totalPrice = itemPrice + confirmedShipping for each finalist. Re-rank all candidates by totalPrice, then by unitPrice as tiebreaker.
6. Present a ranked table: rank, itemName, shopName, itemPrice, postageLabel, shipping (JPY or 要確認), totalPrice, quantity, unitPrice, itemUrl.
7. Recommend #1 with one honest caveat (e.g. unverified shipping, low review count).

Never guess shipping costs. Only use web-search evidence or postageFlag=1 (送料無料).`,
      ja: `楽天市場でコスパ（単価）最安の商品を探してください。

キーワード: ${keyword}
${priceFilterJa}
送料ウェブ確認する上位件数: ${finalists}

手順:

1. ichiba_item_search をキーワード${maxPrice ? `・max_price=${maxPrice}` : ""}で呼ぶ (必要なら hits=30)。
2. unitPrice 昇順で粗ソート (unitPrice 不明はパック価格重視時のみ考慮)。
3. 仕分け:
   - shippingVerified=true (送料無料): estimatedTotalPrice を確定合計、送料0円。
   - shippingVerified=false (送料別/要確認): ウェブ確認が必要。
4. 要確認の上位${finalists}件について、itemUrl または「店舗名+商品名+送料」でウェブ検索し、本土向け送料(円)を確認。不明なら「送料要確認」とし、金額を推測しない。
5. totalPrice = 商品価格 + 確認済み送料 で再ソート。同程度なら unitPrice 順。
6. 順位表を提示: 順位、商品名、店舗、商品価格、postageLabel、送料、totalPrice、quantity、unitPrice、URL。
7. 1位を推奨し、注意点(送料未確認、レビュー少など)を1つ添える。

送料は推測禁止。ウェブ根拠または postageFlag=1(送料無料)のみ使用。`,
    };
  },
};