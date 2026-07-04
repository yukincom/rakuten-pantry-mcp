/**
 * Tests for src/tools/ichiba.ts — the canonical template.
 *
 * Every Rakuten tool's tests follow this 6-scenario pattern:
 *   1. success
 *   2. no-results
 *   3. Zod validation (missing required param)
 *   4. auth error (400 wrong_parameter from legacy host)
 *   5. rate-limit retry (429 N times → 200)
 *   6. server error (500, retried to exhaustion)
 */

import { describe, expect, it } from "vitest";
import type { Config } from "../src/config.js";
import { HOST_LEGACY } from "../src/config.js";
import {
  RakutenBadRequestError,
  RakutenServerError,
} from "../src/errors.js";
import {
  detectShippingOutliers,
  extractQuantityFromItemName,
  ichibaGenreSearchTool,
  ichibaItemRankingTool,
  ichibaItemSearchTool,
  ichibaProductSearchTool,
  ichibaTagSearchTool,
  mapPostageLabel,
  resolvePostageInfo,
} from "../src/tools/ichiba.js";
import {
  genreSearchAuthInvalid,
  genreSearchNested,
  genreSearchRateLimitedThenSuccess,
  genreSearchServerError,
  genreSearchTop,
  itemRankingAuthInvalid,
  itemRankingRateLimitedThenSuccess,
  itemRankingServerError,
  itemRankingSuccess,
  itemRankingWithOutliers,
  itemSearchAuthInvalid,
  itemSearchEmpty,
  itemSearchRateLimitedThenSuccess,
  itemSearchServerError,
  itemSearchSuccess,
  productSearchAuthInvalid,
  productSearchRateLimitedThenSuccess,
  productSearchServerError,
  productSearchSuccess,
  tagSearchAuthInvalid,
  tagSearchRateLimitedThenSuccess,
  tagSearchServerError,
  tagSearchSuccess,
} from "./handlers/ichiba.handlers.js";
import { server } from "./msw-server.js";

describe("postage helpers", () => {
  it.each([
    [1, "送料無料"],
    [0, "送料別"],
    [2, "要確認"],
    [99, "要確認"],
  ] as const)("mapPostageLabel(%s) → %s", (flag, expected) => {
    expect(mapPostageLabel(flag)).toBe(expected);
  });

  it("resolvePostageInfo marks free shipping as verified with estimatedTotalPrice", () => {
    expect(resolvePostageInfo(1, 2400)).toEqual({
      postageLabel: "送料無料",
      estimatedTotalPrice: 2400,
      shippingVerified: true,
    });
  });

  it("resolvePostageInfo leaves paid shipping unverified", () => {
    expect(resolvePostageInfo(0, 2400)).toEqual({
      postageLabel: "送料別",
      estimatedTotalPrice: undefined,
      shippingVerified: false,
    });
  });
});

describe("extractQuantityFromItemName", () => {
  it.each([
    ["24本入り×2ケース", 48],
    ["24本×2ケース", 48],
    ["6個セット", 6],
    ["12Pボトル", 12],
    ["12pボトル", 12],
    ["3袋入り", 3],
    ["2パック", 2],
    ["6個入り", 6],
    ["6P×4袋", 24],
    ["1箱24本入り", 24],
    ["500ml×24本 コーラ", 24],
    ["2ケース", 2],
    ["3箱", 3],
    ["10枚入り", 10],
    ["ワイヤレスイヤホン", undefined],
    ["", undefined],
  ] as const)("parses %s → %s", (itemName, expected) => {
    expect(extractQuantityFromItemName(itemName)).toBe(expected);
  });

  it("supports unitPrice calculation from itemPrice ÷ quantity", () => {
    const quantity = extractQuantityFromItemName("24本入り×2ケース");
    const itemPrice = 2400;
    expect(quantity).toBe(48);
    expect(Math.round((itemPrice / quantity!) * 10) / 10).toBe(50);
  });
});

describe("detectShippingOutliers", () => {
  it("flags the cheapest item when its unitPrice is significantly lower than peers (minRatio)", () => {
    const items = [
      { unitPrice: 100, itemName: "A" },
      { unitPrice: 120, itemName: "B" },
      { unitPrice: 121, itemName: "C" },
      { unitPrice: 122, itemName: "D" },
      { unitPrice: 123, itemName: "E" },
    ];
    const result = detectShippingOutliers(items, 1.12);
    expect(result[0].needsShippingRecheck).toBe(true);
    expect(result[1].needsShippingRecheck).toBeUndefined();
  });

  it("does nothing when fewer than 5 items with unitPrice", () => {
    const items = [{ unitPrice: 100 }, { unitPrice: 50 }];
    const result = detectShippingOutliers(items);
    expect(result[0].needsShippingRecheck).toBeUndefined();
  });
});

const testConfig: Config = {
  applicationId: "test-app-id",
  accessKey: "test-access-key",
  affiliateId: undefined,
  hostOverride: undefined,
  transport: "stdio",
  httpPort: 3000,
  httpHost: "127.0.0.1",
  httpAuthToken: undefined,
  // Tight retry budget so tests stay fast — backoff is 500ms, 1s, 2s, 4s.
  // With maxRetries=2 the longest possible test takes ~1.5s for a 5xx exhaustion.
  maxRetries: 2,
};

describe("ichibaItemSearch — tool definition", () => {
  it("registers under the expected MCP name", () => {
    expect(ichibaItemSearchTool.name).toBe("ichiba_item_search");
  });

  it("has bilingual title and description", () => {
    expect(ichibaItemSearchTool.title.en).toBeTruthy();
    expect(ichibaItemSearchTool.title.ja).toBeTruthy();
    expect(ichibaItemSearchTool.description.en.length).toBeGreaterThan(20);
    expect(ichibaItemSearchTool.description.ja.length).toBeGreaterThan(10);
  });

  it("uses the legacy host (Ichiba is not yet migrated)", () => {
    // Sanity: confirm the constant we import equals what tools target.
    expect(HOST_LEGACY).toBe("https://app.rakuten.co.jp");
  });
});

describe("ichibaItemSearch — Zod input validation", () => {
  it("rejects missing required keyword", () => {
    const parse = () =>
      ichibaItemSearchTool.inputSchema.parse({} as unknown);
    expect(parse).toThrow();
  });

  it("rejects empty keyword string", () => {
    const parse = () =>
      ichibaItemSearchTool.inputSchema.parse({ keyword: "" });
    expect(parse).toThrow();
  });

  it("rejects hits > 30", () => {
    const parse = () =>
      ichibaItemSearchTool.inputSchema.parse({ keyword: "test", hits: 31 });
    expect(parse).toThrow();
  });

  it("rejects negative price", () => {
    const parse = () =>
      ichibaItemSearchTool.inputSchema.parse({ keyword: "test", min_price: -1 });
    expect(parse).toThrow();
  });

  it("accepts valid input with defaults", () => {
    const parsed = ichibaItemSearchTool.inputSchema.parse({ keyword: "イヤホン" });
    expect(parsed.keyword).toBe("イヤホン");
    expect(parsed.hits).toBe(10);
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("standard");
  });
});

describe("ichibaItemSearch — handler behaviour", () => {
  it("returns mapped items on success", async () => {
    server.use(itemSearchSuccess());

    const result = await ichibaItemSearchTool.handler(
      { keyword: "イヤホン", hits: 3, page: 1, sort: "standard" },
      testConfig,
    );

    // Generic type widens to unknown at runtime; narrow for the assertions.
    const r = result as {
      count: number;
      page: number;
      items: Array<{
        itemName: string;
        itemPrice: number;
        itemUrl: string;
        shopName: string;
        reviewCount: number;
        reviewAverage: number | string;
        imageUrl?: string;
      }>;
    };

    expect(r.count).toBe(5283);
    expect(r.page).toBe(1);
    expect(r.items).toHaveLength(3);
    expect(r.items[0].itemName).toContain("ワイヤレスイヤホン");
    expect(r.items[0].itemPrice).toBe(4980);
    expect(r.items[0].shopName).toBe("イヤホン専門店");
    expect(r.items[0].reviewCount).toBe(1842);
    expect(r.items[0].imageUrl).toContain("thumbnail.image.rakuten.co.jp");
    expect(r.items[0].postageLabel).toBe("送料無料");
    expect(r.items[0].estimatedTotalPrice).toBe(4980);
    expect(r.items[0].shippingVerified).toBe(true);
    expect(r.items[2].itemPrice).toBe(12800);
    expect(r.items[2].postageLabel).toBe("送料別");
    expect(r.items[2].estimatedTotalPrice).toBeUndefined();
    expect(r.items[2].shippingVerified).toBe(false);
  });

  it("returns empty items array when Rakuten returns no matches", async () => {
    server.use(itemSearchEmpty());

    const result = await ichibaItemSearchTool.handler(
      { keyword: "this-keyword-matches-nothing-zzzzz", hits: 10, page: 1, sort: "standard" },
      testConfig,
    );

    const r = result as { count: number; items: unknown[] };
    expect(r.count).toBe(0);
    expect(r.items).toEqual([]);
  });

  it("throws RakutenBadRequestError on 400 from Rakuten (legacy-host shape)", async () => {
    server.use(itemSearchAuthInvalid());

    await expect(
      ichibaItemSearchTool.handler(
        { keyword: "test", hits: 10, page: 1, sort: "standard" },
        testConfig,
      ),
    ).rejects.toBeInstanceOf(RakutenBadRequestError);
  });

  it("retries 429 then succeeds (rate-limit recovery)", async () => {
    server.use(itemSearchRateLimitedThenSuccess(1));

    const result = await ichibaItemSearchTool.handler(
      { keyword: "test", hits: 10, page: 1, sort: "standard" },
      testConfig,
    );

    const r = result as { count: number };
    expect(r.count).toBe(5283);
  });

  it("retries 5xx and eventually throws RakutenServerError after exhaustion", async () => {
    server.use(itemSearchServerError());

    await expect(
      ichibaItemSearchTool.handler(
        { keyword: "test", hits: 10, page: 1, sort: "standard" },
        testConfig,
      ),
    ).rejects.toBeInstanceOf(RakutenServerError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_genre_search
// ──────────────────────────────────────────────────────────────────────────────

describe("ichibaGenreSearch — tool definition", () => {
  it("registers under the expected MCP name", () => {
    expect(ichibaGenreSearchTool.name).toBe("ichiba_genre_search");
  });

  it("has bilingual title and description", () => {
    expect(ichibaGenreSearchTool.title.en).toBeTruthy();
    expect(ichibaGenreSearchTool.title.ja).toBeTruthy();
  });

  it("defaults genre_id to '0' (top level)", () => {
    const parsed = ichibaGenreSearchTool.inputSchema.parse({});
    expect(parsed.genre_id).toBe("0");
  });
});

describe("ichibaGenreSearch — handler behaviour", () => {
  it("returns top-level genres on '0'", async () => {
    server.use(genreSearchTop());

    const result = await ichibaGenreSearchTool.handler({ genre_id: "0" }, testConfig);
    const r = result as {
      current: { genreId: string; genreName: string; genreLevel: number };
      ancestors: unknown[];
      siblings: unknown[];
      children: Array<{ genreId: string; genreName: string }>;
    };

    expect(r.current.genreId).toBe("0");
    expect(r.current.genreName).toBe("ジャンルトップ");
    expect(r.ancestors).toEqual([]);
    expect(r.children).toHaveLength(5);
    expect(r.children[0].genreName).toBe("パソコン・周辺機器");
  });

  it("returns nested ancestors and children for a non-root genre", async () => {
    server.use(genreSearchNested());

    const result = await ichibaGenreSearchTool.handler({ genre_id: "565910" }, testConfig);
    const r = result as {
      current: { genreId: string; genreLevel: number };
      ancestors: Array<{ genreId: string; genreName: string }>;
      siblings: Array<{ genreId: string; genreName: string }>;
      children: Array<{ genreId: string }>;
    };

    expect(r.current.genreId).toBe("565910");
    expect(r.current.genreLevel).toBe(3);
    expect(r.ancestors).toHaveLength(3);
    expect(r.ancestors[0].genreId).toBe("0");
    expect(r.ancestors[2].genreName).toBe("オーディオ");
    expect(r.children).toHaveLength(2);
  });

  it("throws RakutenBadRequestError on 400", async () => {
    server.use(genreSearchAuthInvalid());

    await expect(
      ichibaGenreSearchTool.handler({ genre_id: "0" }, testConfig),
    ).rejects.toBeInstanceOf(RakutenBadRequestError);
  });

  it("retries 429 then succeeds", async () => {
    server.use(genreSearchRateLimitedThenSuccess(1));

    const result = await ichibaGenreSearchTool.handler({ genre_id: "0" }, testConfig);
    const r = result as { children: unknown[] };
    expect(r.children).toHaveLength(5);
  });

  it("retries 5xx then throws RakutenServerError", async () => {
    server.use(genreSearchServerError());

    await expect(
      ichibaGenreSearchTool.handler({ genre_id: "0" }, testConfig),
    ).rejects.toBeInstanceOf(RakutenServerError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_tag_search
// ──────────────────────────────────────────────────────────────────────────────

describe("ichibaTagSearch — tool definition", () => {
  it("registers under the expected MCP name", () => {
    expect(ichibaTagSearchTool.name).toBe("ichiba_tag_search");
  });

  it("has bilingual title and description", () => {
    expect(ichibaTagSearchTool.title.en).toBeTruthy();
    expect(ichibaTagSearchTool.title.ja).toBeTruthy();
  });

  it("accepts a positive tag_id", () => {
    const parsed = ichibaTagSearchTool.inputSchema.parse({ tag_id: 1000651 });
    expect(parsed.tag_id).toBe(1000651);
  });

  it("rejects missing tag_id (it is the only required input)", () => {
    const parse = () => ichibaTagSearchTool.inputSchema.parse({});
    expect(parse).toThrow();
  });

  it("rejects negative tag_id", () => {
    const parse = () => ichibaTagSearchTool.inputSchema.parse({ tag_id: -1 });
    expect(parse).toThrow();
  });
});

describe("ichibaTagSearch — handler behaviour", () => {
  it("returns tag group details for a tag id", async () => {
    server.use(tagSearchSuccess());

    const result = await ichibaTagSearchTool.handler({ tag_id: 1000651 }, testConfig);
    const r = result as {
      tagGroups: Array<{
        tagGroupId: number;
        tagGroupName: string;
        tags: Array<{ tagId: number; tagName: string }>;
      }>;
    };

    expect(r.tagGroups).toHaveLength(2);
    expect(r.tagGroups[0].tagGroupName).toBe("接続方式");
    expect(r.tagGroups[0].tags).toHaveLength(3);
    expect(r.tagGroups[0].tags[0].tagName).toBe("Bluetooth");
  });

  it("throws RakutenBadRequestError on 400", async () => {
    server.use(tagSearchAuthInvalid());

    await expect(
      ichibaTagSearchTool.handler({ tag_id: 1000651 }, testConfig),
    ).rejects.toBeInstanceOf(RakutenBadRequestError);
  });

  it("retries 429 then succeeds", async () => {
    server.use(tagSearchRateLimitedThenSuccess(1));

    const result = await ichibaTagSearchTool.handler({ tag_id: 1000651 }, testConfig);
    const r = result as { tagGroups: unknown[] };
    expect(r.tagGroups).toHaveLength(2);
  });

  it("retries 5xx then throws RakutenServerError", async () => {
    server.use(tagSearchServerError());

    await expect(
      ichibaTagSearchTool.handler({ tag_id: 1000651 }, testConfig),
    ).rejects.toBeInstanceOf(RakutenServerError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_item_ranking
// ──────────────────────────────────────────────────────────────────────────────

describe("ichibaItemRanking — tool definition", () => {
  it("registers under the expected MCP name", () => {
    expect(ichibaItemRankingTool.name).toBe("ichiba_item_ranking");
  });

  it("has bilingual title and description", () => {
    expect(ichibaItemRankingTool.title.en).toBeTruthy();
    expect(ichibaItemRankingTool.title.ja).toBeTruthy();
  });

  it("defaults genre_id to '0' (overall) and page to 1", () => {
    const parsed = ichibaItemRankingTool.inputSchema.parse({});
    expect(parsed.genre_id).toBe("0");
    expect(parsed.page).toBe(1);
  });

  it("accepts demographic filters", () => {
    const parsed = ichibaItemRankingTool.inputSchema.parse({
      age: "30s",
      sex: "female",
      period: "weekly",
    });
    expect(parsed.age).toBe("30s");
    expect(parsed.sex).toBe("female");
    expect(parsed.period).toBe("weekly");
  });

  it("rejects page > 34", () => {
    const parse = () => ichibaItemRankingTool.inputSchema.parse({ page: 35 });
    expect(parse).toThrow();
  });

  it("rejects invalid sex value", () => {
    const parse = () => ichibaItemRankingTool.inputSchema.parse({ sex: "other" as unknown as "female" });
    expect(parse).toThrow();
  });
});

describe("ichibaItemRanking — handler behaviour", () => {
  it("returns ranked items with rank field", async () => {
    server.use(itemRankingSuccess());

    const result = await ichibaItemRankingTool.handler(
      { genre_id: "0", page: 1 },
      testConfig,
    );
    const r = result as {
      title: string;
      lastBuildDate: string;
      items: Array<{ rank: number; itemName: string; itemPrice: number }>;
    };

    expect(r.title).toBe("楽天市場の総合ランキング");
    expect(r.lastBuildDate).toBe("2026-06-04T12:00:00");
    expect(r.items).toHaveLength(3);
    expect(r.items[0].rank).toBe(1);
    expect(r.items[1].rank).toBe(2);
    expect(r.items[2].rank).toBe(3);
    expect(r.items[2].itemName).toContain("イヤホン");
  });

  it("flags needsShippingRecheck on ranking items with implausibly low unitPrice", async () => {
    server.use(itemRankingWithOutliers());

    const result = await ichibaItemRankingTool.handler(
      { genre_id: "0", page: 1 },
      testConfig,
    );
    const r = result as {
      items: Array<{ rank: number; unitPrice?: number; needsShippingRecheck?: boolean }>;
    };

    expect(r.items).toHaveLength(5);
    const cheapest = r.items.find((item) => item.rank === 1);
    expect(cheapest?.unitPrice).toBe(100);
    expect(cheapest?.needsShippingRecheck).toBe(true);
    expect(r.items.filter((item) => item.needsShippingRecheck)).toHaveLength(1);
  });

  it("throws RakutenBadRequestError on 400", async () => {
    server.use(itemRankingAuthInvalid());

    await expect(
      ichibaItemRankingTool.handler({ genre_id: "0", page: 1 }, testConfig),
    ).rejects.toBeInstanceOf(RakutenBadRequestError);
  });

  it("retries 429 then succeeds", async () => {
    server.use(itemRankingRateLimitedThenSuccess(1));

    const result = await ichibaItemRankingTool.handler(
      { genre_id: "0", page: 1 },
      testConfig,
    );
    const r = result as { items: unknown[] };
    expect(r.items).toHaveLength(3);
  });

  it("retries 5xx then throws RakutenServerError", async () => {
    server.use(itemRankingServerError());

    await expect(
      ichibaItemRankingTool.handler({ genre_id: "0", page: 1 }, testConfig),
    ).rejects.toBeInstanceOf(RakutenServerError);
  });
});

// ──────────────────────────────────────────────────────────────────────────────
// ichiba_product_search (Item Price Navi)
// ──────────────────────────────────────────────────────────────────────────────

describe("ichibaProductSearch — tool definition", () => {
  it("registers under the expected MCP name", () => {
    expect(ichibaProductSearchTool.name).toBe("ichiba_product_search");
  });

  it("has bilingual title and description", () => {
    expect(ichibaProductSearchTool.title.en).toBeTruthy();
    expect(ichibaProductSearchTool.title.ja).toBeTruthy();
    expect(ichibaProductSearchTool.description.en).toContain("cross-seller");
  });

  it("accepts keyword alone", () => {
    const parsed = ichibaProductSearchTool.inputSchema.parse({ keyword: "Sony WF-1000XM6" });
    expect(parsed.keyword).toBe("Sony WF-1000XM6");
    expect(parsed.hits).toBe(10);
    expect(parsed.page).toBe(1);
    expect(parsed.sort).toBe("standard");
  });

  it("accepts product_id alone", () => {
    const parsed = ichibaProductSearchTool.inputSchema.parse({ product_id: "1:9876543" });
    expect(parsed.product_id).toBe("1:9876543");
  });

  it("rejects empty keyword", () => {
    const parse = () => ichibaProductSearchTool.inputSchema.parse({ keyword: "" });
    expect(parse).toThrow();
  });

  it("rejects hits > 30", () => {
    const parse = () => ichibaProductSearchTool.inputSchema.parse({ keyword: "test", hits: 31 });
    expect(parse).toThrow();
  });
});

describe("ichibaProductSearch — handler behaviour", () => {
  it("returns mapped products with cross-seller pricing on success", async () => {
    server.use(productSearchSuccess());

    const result = await ichibaProductSearchTool.handler(
      { keyword: "ノイズキャンセリング イヤホン", hits: 10, page: 1, sort: "standard" },
      testConfig,
    );
    const r = result as {
      count: number;
      page: number;
      products: Array<{
        productNo: string;
        productName: string;
        averagePrice: number;
        minPrice: number;
        maxPrice: number;
        itemCount: number;
        makerName?: string;
        reviewCount: number;
        productUrlPC?: string;
      }>;
    };

    expect(r.count).toBe(234);
    expect(r.page).toBe(1);
    expect(r.products).toHaveLength(2);
    // First product — Bose
    expect(r.products[0].productNo).toBe("1:9876543");
    expect(r.products[0].makerName).toBe("Bose");
    expect(r.products[0].minPrice).toBe(32800);
    expect(r.products[0].maxPrice).toBe(38900);
    expect(r.products[0].averagePrice).toBe(35640);
    expect(r.products[0].itemCount).toBe(25);
    expect(r.products[0].productUrlPC).toContain("product.rakuten.co.jp");
    // Second product — Sony
    expect(r.products[1].makerName).toBe("Sony");
    expect(r.products[1].minPrice).toBeLessThan(r.products[1].maxPrice);
  });

  it("throws when neither keyword nor product_id provided", async () => {
    await expect(
      ichibaProductSearchTool.handler(
        { hits: 10, page: 1, sort: "standard" },
        testConfig,
      ),
    ).rejects.toThrow(/keyword or product_id/);
  });

  it("throws RakutenBadRequestError on 400", async () => {
    server.use(productSearchAuthInvalid());

    await expect(
      ichibaProductSearchTool.handler(
        { keyword: "test", hits: 10, page: 1, sort: "standard" },
        testConfig,
      ),
    ).rejects.toBeInstanceOf(RakutenBadRequestError);
  });

  it("retries 429 then succeeds", async () => {
    server.use(productSearchRateLimitedThenSuccess(1));

    const result = await ichibaProductSearchTool.handler(
      { keyword: "test", hits: 10, page: 1, sort: "standard" },
      testConfig,
    );
    const r = result as { count: number };
    expect(r.count).toBe(234);
  });

  it("retries 5xx then throws RakutenServerError", async () => {
    server.use(productSearchServerError());

    await expect(
      ichibaProductSearchTool.handler(
        { keyword: "test", hits: 10, page: 1, sort: "standard" },
        testConfig,
      ),
    ).rejects.toBeInstanceOf(RakutenServerError);
  });
});
