#!/usr/bin/env node

// src/config.ts
import { z } from "zod";

// src/i18n.ts
function bilingual(en, ja) {
  return { en, ja };
}
var errorMessages = {
  configMissing: bilingual(
    "RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY must be set. Get free credentials at https://webservice.rakuten.co.jp/",
    "RAKUTEN_APP_ID \u3068 RAKUTEN_ACCESS_KEY \u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u7121\u6599\u306E\u8A8D\u8A3C\u60C5\u5831: https://webservice.rakuten.co.jp/"
  ),
  authInvalid: bilingual(
    "Rakuten API rejected the credentials. Check that RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY are valid.",
    "Rakuten API \u304C\u8A8D\u8A3C\u60C5\u5831\u3092\u62D2\u5426\u3057\u307E\u3057\u305F\u3002RAKUTEN_APP_ID \u3068 RAKUTEN_ACCESS_KEY \u3092\u78BA\u8A8D\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  ),
  rateLimited: bilingual(
    "Rakuten API rate limit exceeded. Retrying with backoff.",
    "Rakuten API \u306E\u30EC\u30FC\u30C8\u5236\u9650\u3092\u8D85\u904E\u3057\u307E\u3057\u305F\u3002\u30D0\u30C3\u30AF\u30AA\u30D5\u3067\u518D\u8A66\u884C\u3057\u307E\u3059\u3002"
  ),
  serverError: bilingual(
    "Rakuten API returned a server error.",
    "Rakuten API \u304C\u30B5\u30FC\u30D0\u30FC\u30A8\u30E9\u30FC\u3092\u8FD4\u3057\u307E\u3057\u305F\u3002"
  ),
  notFound: bilingual(
    "Rakuten API returned 404. The endpoint may have been moved or deprecated.",
    "Rakuten API \u304C 404 \u3092\u8FD4\u3057\u307E\u3057\u305F\u3002\u30A8\u30F3\u30C9\u30DD\u30A4\u30F3\u30C8\u304C\u79FB\u52D5\u307E\u305F\u306F\u5EC3\u6B62\u3055\u308C\u305F\u53EF\u80FD\u6027\u304C\u3042\u308A\u307E\u3059\u3002"
  ),
  malformedResponse: bilingual(
    "Rakuten API returned a response that could not be parsed.",
    "Rakuten API \u304C\u89E3\u6790\u3067\u304D\u306A\u3044\u30EC\u30B9\u30DD\u30F3\u30B9\u3092\u8FD4\u3057\u307E\u3057\u305F\u3002"
  ),
  unknown: bilingual(
    "Unexpected error from Rakuten API.",
    "Rakuten API \u304B\u3089\u306E\u4E88\u671F\u3057\u306A\u3044\u30A8\u30E9\u30FC\u3067\u3059\u3002"
  )
};

// src/errors.ts
var RakutenError = class extends Error {
  /** Original HTTP status from Rakuten. */
  httpStatus;
  /** Original error body from Rakuten (for debugging). */
  originalBody;
  /** Suggested user-facing message in EN and JA. */
  messageJa;
  constructor(opts) {
    super(opts.messageEn);
    this.name = this.constructor.name;
    this.httpStatus = opts.httpStatus;
    this.messageJa = opts.messageJa;
    this.originalBody = opts.originalBody;
  }
  /** Tool-handler-friendly string: bilingual one-liner. */
  toToolError() {
    return `${this.message}

[JA] ${this.messageJa}`;
  }
};
var RakutenConfigError = class extends RakutenError {
  code = "config_error";
  constructor() {
    super({
      httpStatus: 0,
      messageEn: errorMessages.configMissing.en,
      messageJa: errorMessages.configMissing.ja
    });
  }
};
var RakutenAuthError = class extends RakutenError {
  code = "auth_invalid";
  constructor(httpStatus, originalBody) {
    super({
      httpStatus,
      messageEn: errorMessages.authInvalid.en,
      messageJa: errorMessages.authInvalid.ja,
      originalBody
    });
  }
};
var RakutenRateLimitError = class extends RakutenError {
  code = "rate_limited";
  /** Parsed Retry-After value in milliseconds, when available. */
  retryAfterMs;
  constructor(opts) {
    super({
      httpStatus: opts.httpStatus,
      messageEn: errorMessages.rateLimited.en,
      messageJa: errorMessages.rateLimited.ja,
      originalBody: opts.originalBody
    });
    this.retryAfterMs = opts.retryAfterMs;
  }
};
var RakutenServerError = class extends RakutenError {
  code = "server_error";
  constructor(httpStatus, originalBody) {
    super({
      httpStatus,
      messageEn: errorMessages.serverError.en,
      messageJa: errorMessages.serverError.ja,
      originalBody
    });
  }
};
var RakutenNotFoundError = class extends RakutenError {
  code = "not_found";
  constructor(httpStatus, originalBody) {
    super({
      httpStatus,
      messageEn: errorMessages.notFound.en,
      messageJa: errorMessages.notFound.ja,
      originalBody
    });
  }
};
var RakutenBadRequestError = class extends RakutenError {
  code = "bad_request";
  constructor(httpStatus, originalMessage, originalBody) {
    super({
      httpStatus,
      messageEn: `Rakuten API rejected the request: ${originalMessage}`,
      messageJa: `Rakuten API \u304C\u30EA\u30AF\u30A8\u30B9\u30C8\u3092\u62D2\u5426\u3057\u307E\u3057\u305F: ${originalMessage}`,
      originalBody
    });
  }
};
var RakutenMalformedResponseError = class extends RakutenError {
  code = "malformed_response";
  constructor(originalBody) {
    super({
      httpStatus: 0,
      messageEn: errorMessages.malformedResponse.en,
      messageJa: errorMessages.malformedResponse.ja,
      originalBody
    });
  }
};
var RakutenUnknownError = class extends RakutenError {
  code = "unknown";
  constructor(httpStatus, originalBody) {
    super({
      httpStatus,
      messageEn: errorMessages.unknown.en,
      messageJa: errorMessages.unknown.ja,
      originalBody
    });
  }
};
function parseRakutenError(status, body, retryAfter) {
  let originalMessage = "";
  if (typeof body === "object" && body !== null) {
    const b = body;
    if (typeof b.error_description === "string") {
      originalMessage = b.error_description;
    } else if (typeof b.errors === "object" && b.errors !== null) {
      const errs = b.errors;
      if (typeof errs.errorMessage === "string") {
        originalMessage = errs.errorMessage;
      }
    }
  }
  switch (status) {
    case 400:
      return new RakutenBadRequestError(status, originalMessage || "(no detail)", body);
    case 401:
    case 403:
      return new RakutenAuthError(status, body);
    case 404:
      return new RakutenNotFoundError(status, body);
    case 429: {
      const retryAfterMs = parseRetryAfter(retryAfter);
      return new RakutenRateLimitError({ httpStatus: status, retryAfterMs, originalBody: body });
    }
    case 500:
    case 502:
    case 503:
    case 504:
      return new RakutenServerError(status, body);
    default:
      return new RakutenUnknownError(status, body);
  }
}
function parseRetryAfter(value) {
  if (!value) return void 0;
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber)) {
    return asNumber * 1e3;
  }
  const dateMs = Date.parse(value);
  if (!Number.isNaN(dateMs)) {
    const deltaMs = dateMs - Date.now();
    return deltaMs > 0 ? deltaMs : 0;
  }
  return void 0;
}

// src/config.ts
var HOST_OPENAPI = "https://openapi.rakuten.co.jp";
var EnvSchema = z.object({
  RAKUTEN_APP_ID: z.string().min(1).optional(),
  RAKUTEN_ACCESS_KEY: z.string().min(1).optional(),
  RAKUTEN_AFFILIATE_ID: z.string().min(1).optional(),
  RAKUTEN_API_HOST_OVERRIDE: z.string().url().optional(),
  MCP_TRANSPORT: z.enum(["stdio", "http"]).default("stdio"),
  MCP_HTTP_PORT: z.coerce.number().int().positive().default(3e3),
  MCP_HTTP_HOST: z.string().default("127.0.0.1"),
  MCP_HTTP_AUTH_TOKEN: z.string().optional(),
  /** Comma-separated origins. Empty default = no cross-origin requests allowed. */
  MCP_HTTP_ALLOWED_ORIGINS: z.string().default(""),
  RAKUTEN_MAX_RETRIES: z.coerce.number().int().min(0).max(10).default(3)
});
function loadConfig() {
  const parsed = EnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Invalid environment configuration: ${parsed.error.message}`);
  }
  const env = parsed.data;
  if (!env.RAKUTEN_APP_ID || !env.RAKUTEN_ACCESS_KEY) {
    throw new RakutenConfigError();
  }
  const httpAllowedOrigins = env.MCP_HTTP_ALLOWED_ORIGINS.split(",").map((o) => o.trim()).filter(Boolean);
  return {
    applicationId: env.RAKUTEN_APP_ID,
    accessKey: env.RAKUTEN_ACCESS_KEY,
    affiliateId: env.RAKUTEN_AFFILIATE_ID,
    hostOverride: env.RAKUTEN_API_HOST_OVERRIDE,
    transport: env.MCP_TRANSPORT,
    httpPort: env.MCP_HTTP_PORT,
    httpHost: env.MCP_HTTP_HOST,
    httpAuthToken: env.MCP_HTTP_AUTH_TOKEN,
    httpAllowedOrigins,
    maxRetries: env.RAKUTEN_MAX_RETRIES
  };
}
function isPubliclyBound(host) {
  const lower = host.trim().toLowerCase();
  return lower !== "127.0.0.1" && lower !== "::1" && lower !== "localhost";
}
function tryLoadConfig() {
  try {
    return loadConfig();
  } catch {
    return null;
  }
}
function parseCliTransport(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "--stdio") {
      out.transport = "stdio";
    } else if (arg === "--http") {
      out.transport = "http";
      const next = argv[i + 1];
      if (next && !next.startsWith("--")) {
        const port = Number(next);
        if (!Number.isNaN(port)) out.httpPort = port;
        i++;
      }
    }
  }
  return out;
}

// src/transports/http.ts
import { createServer } from "http";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";

// src/server.ts
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

// src/prompts/ichiba.ts
var compareIchibaValue = {
  name: "compare_ichiba_value",
  title: {
    en: "Find cheapest Rakuten Ichiba deal (incl. shipping / per-unit)",
    ja: "\u697D\u5929\u5E02\u5834\u3067\u9001\u6599\u8FBC\u307F\u30FB\u5358\u4FA1\u6700\u5B89\u3092\u63A2\u3059"
  },
  description: {
    en: "USE THIS when the user wants: cheapest including shipping, per-unit price, total cost ranking, best deal, or says \u9001\u6599\u8FBC\u307F / \u30B3\u30B9\u30D1 / \u5B89\u3044\u9806 / \u6700\u5B89 / \u5358\u4FA1 on Rakuten Ichiba. Chains ichiba_item_search \u2192 unitPrice pre-sort \u2192 web shipping check on top finalists \u2192 final re-rank. Do NOT use ichiba_item_search alone for these requests.",
    ja: "\u30E6\u30FC\u30B6\u30FC\u304C\u9001\u6599\u8FBC\u307F\u30FB\u30B3\u30B9\u30D1\u30FB\u5B89\u3044\u9806\u30FB\u6700\u5B89\u30FB\u5358\u4FA1\u6BD4\u8F03\u3092\u6C42\u3081\u305F\u3089\u3053\u308C\u3092\u4F7F\u3046\u3002ichiba_item_search\u2192unitPrice\u7C97\u30BD\u30FC\u30C8\u2192\u4E0A\u4F4D\u306E\u9001\u6599\u30A6\u30A7\u30D6\u78BA\u8A8D\u2192\u518D\u30BD\u30FC\u30C8\u3002\u5358\u72EC\u306E ichiba_item_search \u3060\u3051\u3067\u306F\u4E0D\u5341\u5206\u3002"
  },
  arguments: [
    {
      name: "keyword",
      description: {
        en: "Product search keyword, e.g. '500ml PET tea 24 bottles'.",
        ja: "\u5546\u54C1\u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9\u3002\u4F8B:\u300C\u30DA\u30C3\u30C8\u30DC\u30C8\u30EB\u304A\u8336 500ml 24\u672C\u300D\u3002"
      },
      required: true
    },
    {
      name: "max_price",
      description: {
        en: "Optional max item price in JPY.",
        ja: "\u4EFB\u610F\u3002\u5546\u54C1\u4FA1\u683C\u306E\u4E0A\u9650(\u5186)\u3002"
      },
      required: false
    },
    {
      name: "finalists",
      description: {
        en: "How many finalists to web-check for shipping (default 5).",
        ja: "\u9001\u6599\u30A6\u30A7\u30D6\u78BA\u8A8D\u3059\u308B\u4E0A\u4F4D\u4EF6\u6570(\u30C7\u30D5\u30A9\u30EB\u30C85)\u3002"
      },
      required: false
    }
  ],
  build: (args) => {
    const keyword = args.keyword?.trim() || "(ask the user for a product keyword)";
    const maxPrice = args.max_price?.trim();
    const finalists = args.finalists?.trim() || "5";
    const priceFilter = maxPrice ? `Max item price: ${maxPrice} JPY (pass as max_price to ichiba_item_search).` : "No max price filter unless the user specified one.";
    const priceFilterJa = maxPrice ? `\u5546\u54C1\u4FA1\u683C\u4E0A\u9650: ${maxPrice}\u5186 (ichiba_item_search \u306E max_price \u306B\u6E21\u3059)\u3002` : "\u30E6\u30FC\u30B6\u30FC\u6307\u5B9A\u304C\u306A\u3051\u308C\u3070\u4FA1\u683C\u4E0A\u9650\u306A\u3057\u3002";
    return {
      en: `Find the best cost-per-unit deal on Rakuten Ichiba.

Keyword: ${keyword}
${priceFilter}
Finalists to web-check for shipping: ${finalists}

Follow this plan exactly:

1. Call ichiba_item_search with the keyword${maxPrice ? ` and max_price=${maxPrice}` : ""} (hits=30 if needed).
2. Pre-rank candidates by unitPrice ascending (lowest per-unit cost first). Skip items with no unitPrice unless the user cares about total pack price only.
3. Split results:
   - shippingVerified=true (postageLabel "\u9001\u6599\u7121\u6599"): treat estimatedTotalPrice as confirmed total; shipping = 0.
   - shippingVerified=false (postageLabel "\u9001\u6599\u5225" or "\u8981\u78BA\u8A8D"): needs web verification.
4. Take the top ${finalists} items that still need shipping verification. For each, web-search using itemUrl first, or query "shopName itemName \u9001\u6599" / "shopName \u9001\u6599". Extract the shipping cost in JPY for a typical mainland-Japan delivery. If ambiguous, note "\u9001\u6599\u8981\u78BA\u8A8D" \u2014 do not invent a number.
5. Compute totalPrice = itemPrice + confirmedShipping for each finalist. Re-rank all candidates by totalPrice, then by unitPrice as tiebreaker.
6. Present a ranked table: rank, itemName, shopName, itemPrice, postageLabel, shipping (JPY or \u8981\u78BA\u8A8D), totalPrice, quantity, unitPrice, itemUrl.
7. Recommend #1 with one honest caveat (e.g. unverified shipping, low review count).

Never guess shipping costs. Only use web-search evidence or postageFlag=1 (\u9001\u6599\u7121\u6599).`,
      ja: `\u697D\u5929\u5E02\u5834\u3067\u30B3\u30B9\u30D1\uFF08\u5358\u4FA1\uFF09\u6700\u5B89\u306E\u5546\u54C1\u3092\u63A2\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u30AD\u30FC\u30EF\u30FC\u30C9: ${keyword}
${priceFilterJa}
\u9001\u6599\u30A6\u30A7\u30D6\u78BA\u8A8D\u3059\u308B\u4E0A\u4F4D\u4EF6\u6570: ${finalists}

\u624B\u9806:

1. ichiba_item_search \u3092\u30AD\u30FC\u30EF\u30FC\u30C9${maxPrice ? `\u30FBmax_price=${maxPrice}` : ""}\u3067\u547C\u3076 (\u5FC5\u8981\u306A\u3089 hits=30)\u3002
2. unitPrice \u6607\u9806\u3067\u7C97\u30BD\u30FC\u30C8 (unitPrice \u4E0D\u660E\u306F\u30D1\u30C3\u30AF\u4FA1\u683C\u91CD\u8996\u6642\u306E\u307F\u8003\u616E)\u3002
3. \u4ED5\u5206\u3051:
   - shippingVerified=true (\u9001\u6599\u7121\u6599): estimatedTotalPrice \u3092\u78BA\u5B9A\u5408\u8A08\u3001\u9001\u65990\u5186\u3002
   - shippingVerified=false (\u9001\u6599\u5225/\u8981\u78BA\u8A8D): \u30A6\u30A7\u30D6\u78BA\u8A8D\u304C\u5FC5\u8981\u3002
4. \u8981\u78BA\u8A8D\u306E\u4E0A\u4F4D${finalists}\u4EF6\u306B\u3064\u3044\u3066\u3001itemUrl \u307E\u305F\u306F\u300C\u5E97\u8217\u540D+\u5546\u54C1\u540D+\u9001\u6599\u300D\u3067\u30A6\u30A7\u30D6\u691C\u7D22\u3057\u3001\u672C\u571F\u5411\u3051\u9001\u6599(\u5186)\u3092\u78BA\u8A8D\u3002\u4E0D\u660E\u306A\u3089\u300C\u9001\u6599\u8981\u78BA\u8A8D\u300D\u3068\u3057\u3001\u91D1\u984D\u3092\u63A8\u6E2C\u3057\u306A\u3044\u3002
5. totalPrice = \u5546\u54C1\u4FA1\u683C + \u78BA\u8A8D\u6E08\u307F\u9001\u6599 \u3067\u518D\u30BD\u30FC\u30C8\u3002\u540C\u7A0B\u5EA6\u306A\u3089 unitPrice \u9806\u3002
6. \u9806\u4F4D\u8868\u3092\u63D0\u793A: \u9806\u4F4D\u3001\u5546\u54C1\u540D\u3001\u5E97\u8217\u3001\u5546\u54C1\u4FA1\u683C\u3001postageLabel\u3001\u9001\u6599\u3001totalPrice\u3001quantity\u3001unitPrice\u3001URL\u3002
7. 1\u4F4D\u3092\u63A8\u5968\u3057\u3001\u6CE8\u610F\u70B9(\u9001\u6599\u672A\u78BA\u8A8D\u3001\u30EC\u30D3\u30E5\u30FC\u5C11\u306A\u3069)\u30921\u3064\u6DFB\u3048\u308B\u3002

\u9001\u6599\u306F\u63A8\u6E2C\u7981\u6B62\u3002\u30A6\u30A7\u30D6\u6839\u62E0\u307E\u305F\u306F postageFlag=1(\u9001\u6599\u7121\u6599)\u306E\u307F\u4F7F\u7528\u3002`
    };
  }
};

// src/prompts/travel.ts
var planRakutenTrip = {
  name: "plan_rakuten_trip",
  title: {
    en: "Plan a trip with Rakuten Travel",
    ja: "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u3067\u65C5\u884C\u3092\u8A08\u753B"
  },
  description: {
    en: "Guided hotel search \u2014 resolve an area, find vacant hotels for your dates, then inspect the best pick. Chains travel_get_area_class \u2192 travel_vacant_hotel_search \u2192 travel_hotel_detail_search.",
    ja: "\u30A8\u30EA\u30A2\u89E3\u6C7A\u2192\u7A7A\u5BA4\u691C\u7D22\u2192\u8A73\u7D30\u78BA\u8A8D\u306E\u9806\u3067\u30DB\u30C6\u30EB\u3092\u63A2\u3059\u30AC\u30A4\u30C9\u3002travel_get_area_class \u2192 travel_vacant_hotel_search \u2192 travel_hotel_detail_search \u3092\u9023\u643A\u3057\u307E\u3059\u3002"
  },
  arguments: [
    {
      name: "destination",
      description: {
        en: "City/area or hotel keyword, e.g. 'Hakone' or 'Kyoto station'.",
        ja: "\u90FD\u5E02\u30FB\u30A8\u30EA\u30A2\u307E\u305F\u306F\u30DB\u30C6\u30EB\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3002\u4F8B:\u300C\u7BB1\u6839\u300D\u300C\u4EAC\u90FD\u99C5\u300D\u3002"
      },
      required: true
    },
    {
      name: "checkin",
      description: { en: "Check-in date, YYYY-MM-DD.", ja: "\u30C1\u30A7\u30C3\u30AF\u30A4\u30F3\u65E5 YYYY-MM-DD\u3002" },
      required: false
    },
    {
      name: "checkout",
      description: { en: "Check-out date, YYYY-MM-DD.", ja: "\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8\u65E5 YYYY-MM-DD\u3002" },
      required: false
    },
    {
      name: "guests",
      description: { en: "Number of adult guests (default 2).", ja: "\u5927\u4EBA\u306E\u4EBA\u6570(\u30C7\u30D5\u30A9\u30EB\u30C82)\u3002" },
      required: false
    }
  ],
  build: (args) => {
    const dest = args.destination?.trim() || "(destination not given \u2014 ask the user)";
    const checkin = args.checkin?.trim() || "(ask the user for dates)";
    const checkout = args.checkout?.trim() || "(ask the user for dates)";
    const guests = args.guests?.trim() || "2";
    return {
      en: `Help me find a hotel using Rakuten Travel.

Destination: ${dest}
Check-in: ${checkin}
Check-out: ${checkout}
Adult guests: ${guests}

Plan:
1. If the destination is an area (not one specific hotel), call travel_get_area_class to resolve its largeClassCode / middleClassCode / smallClassCode. If it's a named hotel, use travel_keyword_hotel_search instead.
2. Call travel_vacant_hotel_search with the resolved area codes and the check-in/check-out dates to list hotels that actually have availability.
3. Pick the best 1\u20133 options and call travel_hotel_detail_search on each for rooms, plans, prices, and access.

Then recommend the single best option with its price, location, and one honest tradeoff.`,
      ja: `\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u3067\u30DB\u30C6\u30EB\u63A2\u3057\u3092\u624B\u4F1D\u3063\u3066\u304F\u3060\u3055\u3044\u3002

\u76EE\u7684\u5730: ${dest}
\u30C1\u30A7\u30C3\u30AF\u30A4\u30F3: ${checkin}
\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8: ${checkout}
\u5927\u4EBA: ${guests}

\u624B\u9806:
1. \u76EE\u7684\u5730\u304C\u30A8\u30EA\u30A2\u306E\u5834\u5408\u306F travel_get_area_class \u3067\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u3092\u89E3\u6C7A\u3002\u7279\u5B9A\u30DB\u30C6\u30EB\u540D\u306A\u3089 travel_keyword_hotel_search \u3092\u4F7F\u7528\u3002
2. travel_vacant_hotel_search \u306B\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u3068\u65E5\u4ED8\u3092\u6E21\u3057\u3001\u7A7A\u5BA4\u306E\u3042\u308B\u30DB\u30C6\u30EB\u3092\u53D6\u5F97\u3002
3. \u4E0A\u4F4D1\u301C3\u4EF6\u3092 travel_hotel_detail_search \u3067\u90E8\u5C4B\u30FB\u30D7\u30E9\u30F3\u30FB\u6599\u91D1\u30FB\u30A2\u30AF\u30BB\u30B9\u3092\u78BA\u8A8D\u3002

\u6700\u5F8C\u306B\u3001\u6599\u91D1\u30FB\u7ACB\u5730\u30FB\u6B63\u76F4\u306A\u30C8\u30EC\u30FC\u30C9\u30AA\u30D5\u3092\u6DFB\u3048\u3066\u4E00\u756A\u306E\u304A\u3059\u3059\u3081\u3092\u63D0\u793A\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
    };
  }
};

// src/prompts/index.ts
var prompts = [planRakutenTrip, compareIchibaValue];

// src/prompts/schema.ts
import { z as z2 } from "zod";
function promptArgumentSchema(required) {
  const scalar = z2.union([z2.string(), z2.number(), z2.boolean()]).transform((value) => String(value));
  return required ? scalar : scalar.optional();
}
function buildPromptArgsSchema(arguments_) {
  return Object.fromEntries(
    (arguments_ ?? []).map((arg) => [
      arg.name,
      promptArgumentSchema(arg.required)
    ])
  );
}

// src/resources/index.ts
var resources = [];

// src/tools/ichiba.ts
import { z as z3 } from "zod";

// src/auth.ts
function appendAuthParams(params, auth) {
  params.set("applicationId", auth.applicationId);
  params.set("accessKey", auth.accessKey);
  if (auth.affiliateId) {
    params.set("affiliateId", auth.affiliateId);
  }
}

// src/client.ts
var DEFAULT_BACKOFF_MS = [500, 1e3, 2e3, 4e3];
async function rakutenRequest(opts, config) {
  const host = config.hostOverride ?? opts.host;
  const params = new URLSearchParams();
  params.set("format", "json");
  if (opts.params) {
    for (const [k, v] of Object.entries(opts.params)) {
      if (v !== void 0 && v !== null && v !== "") {
        params.set(k, v);
      }
    }
  }
  appendAuthParams(params, config);
  const url = `${host}${opts.path}?${params.toString()}`;
  let attempt = 0;
  let lastErr;
  while (attempt <= config.maxRetries) {
    try {
      const raw = await fetchOnce(url);
      if (raw.status >= 200 && raw.status < 300) {
        return raw.body;
      }
      const err = parseRakutenError(raw.status, raw.body, raw.retryAfter);
      if (err instanceof RakutenRateLimitError || raw.status >= 500 && raw.status < 600) {
        lastErr = err;
        const waitMs = err instanceof RakutenRateLimitError && err.retryAfterMs !== void 0 ? Math.min(err.retryAfterMs, 6e4) : DEFAULT_BACKOFF_MS[Math.min(attempt, DEFAULT_BACKOFF_MS.length - 1)];
        attempt++;
        if (attempt > config.maxRetries) break;
        await sleep(waitMs);
        continue;
      }
      throw err;
    } catch (err) {
      if (err instanceof TypeError && attempt < config.maxRetries) {
        lastErr = err;
        const waitMs = DEFAULT_BACKOFF_MS[Math.min(attempt, DEFAULT_BACKOFF_MS.length - 1)];
        attempt++;
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  if (lastErr) throw lastErr;
  throw new RakutenMalformedResponseError(void 0);
}
async function fetchOnce(url) {
  const resp = await fetch(url, {
    headers: {
      "Accept": "application/json",
      "User-Agent": "rakuten-mcp/1.0"
    }
  });
  const retryAfter = resp.headers.get("retry-after");
  const text = await resp.text();
  let body;
  if (text.length === 0) {
    body = null;
  } else {
    try {
      body = JSON.parse(text);
    } catch {
      throw new RakutenMalformedResponseError(text);
    }
  }
  return { status: resp.status, retryAfter, body };
}
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// src/tools/ichiba.ts
var BASE_QUANTITY_PATTERNS = [
  { regex: /(\d+)\s*本入り/, priority: 1 },
  { regex: /(\d+)\s*個入り/, priority: 1 },
  { regex: /(\d+)\s*袋入り/, priority: 1 },
  { regex: /(\d+)\s*個/, priority: 2 },
  { regex: /(\d+)\s*本/, priority: 2 },
  { regex: /(\d+)\s*袋/, priority: 2 },
  { regex: /(\d+)\s*P(?![a-zA-Z])/i, priority: 2 },
  { regex: /(\d+)\s*パック/, priority: 2 },
  { regex: /(\d+)\s*枚/, priority: 2 },
  { regex: /(\d+)\s*入り/, priority: 3 },
  { regex: /(\d+)\s*セット/, priority: 3 },
  { regex: /(\d+)\s*箱/, priority: 4 },
  { regex: /(\d+)\s*ケース/, priority: 4 }
];
var MULTIPLIER_PATTERN = /[×xXｘ]\s*(\d+)(?:\s*(ケース|箱|セット|パック|袋))?/g;
function findBaseQuantity(itemName) {
  let best;
  for (const { regex, priority } of BASE_QUANTITY_PATTERNS) {
    const match = regex.exec(itemName);
    if (!match?.[1] || match.index === void 0) continue;
    const candidate = {
      value: parseInt(match[1], 10),
      priority,
      index: match.index
    };
    if (!best || candidate.priority < best.priority || candidate.priority === best.priority && candidate.index < best.index) {
      best = candidate;
    }
  }
  return best?.value;
}
function findMultiplier(itemName) {
  let multiplier = 1;
  for (const match of itemName.matchAll(MULTIPLIER_PATTERN)) {
    const n = parseInt(match[1] ?? "", 10);
    if (!Number.isFinite(n) || n < 1) continue;
    const suffix = match[2];
    const index = match.index ?? 0;
    const before = itemName.slice(0, index);
    const afterIri = /入り\s*$/.test(before);
    if (suffix || afterIri) {
      multiplier *= n;
    }
  }
  return multiplier;
}
function extractQuantityFromItemName(itemName) {
  const base = findBaseQuantity(itemName);
  if (base === void 0) return void 0;
  const multiplier = findMultiplier(itemName);
  const total = base * multiplier;
  return total >= 1 ? total : void 0;
}
function computeUnitPrice(itemPrice, quantity) {
  if (quantity === void 0 || quantity <= 0 || itemPrice <= 0) {
    return void 0;
  }
  return Math.round(itemPrice / quantity * 10) / 10;
}
function mapPostageLabel(postageFlag) {
  if (postageFlag === 1) return "\u9001\u6599\u7121\u6599";
  if (postageFlag === 0) return "\u9001\u6599\u5225";
  return "\u8981\u78BA\u8A8D";
}
function resolvePostageInfo(postageFlag, itemPrice) {
  if (postageFlag === 1 && itemPrice > 0) {
    return {
      postageLabel: "\u9001\u6599\u7121\u6599",
      estimatedTotalPrice: itemPrice,
      shippingVerified: true
    };
  }
  return {
    postageLabel: mapPostageLabel(postageFlag),
    estimatedTotalPrice: void 0,
    shippingVerified: false
  };
}
var ICHIBA_VALUE_COMPARE_WORKFLOW = bilingual(
  "For cheapest / per-unit / shipping-inclusive comparisons (\u9001\u6599\u8FBC\u307F, \u30B3\u30B9\u30D1, \u5B89\u3044\u9806, \u6700\u5B89): use the compare_ichiba_value PROMPT instead of this tool alone. If you must use this tool directly: (1) pre-sort by unitPrice ascending; (2) shippingVerified=true \u2192 estimatedTotalPrice is final; (3) web-search top 3\u20135 shippingVerified=false items for JPY shipping; (4) re-rank by itemPrice+shipping; never guess shipping.",
  "\u9001\u6599\u8FBC\u307F\u30FB\u30B3\u30B9\u30D1\u30FB\u5B89\u3044\u9806\u30FB\u6700\u5B89\u306E\u6BD4\u8F03\u306F compare_ichiba_value \u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u4F7F\u3046\u3053\u3068(\u3053\u306E\u30C4\u30FC\u30EB\u5358\u4F53\u306F\u4E0D\u5341\u5206)\u3002\u76F4\u63A5\u4F7F\u3046\u5834\u5408: (1) unitPrice\u6607\u9806 (2) shippingVerified=true\u306F\u78BA\u5B9A (3) false\u4E0A\u4F4D3\u301C5\u4EF6\u3092\u30A6\u30A7\u30D6\u691C\u7D22 (4) \u518D\u30BD\u30FC\u30C8\u3002\u9001\u6599\u63A8\u6E2C\u7981\u6B62\u3002"
);
var ICHIBA_SORT_OPTIONS = [
  "standard",
  "+affiliateRate",
  "-affiliateRate",
  "+reviewCount",
  "-reviewCount",
  "+reviewAverage",
  "-reviewAverage",
  "+itemPrice",
  "-itemPrice",
  "+updateTimestamp",
  "-updateTimestamp"
];
var itemSearchInput = z3.object({
  keyword: z3.string().min(1).describe(
    "Search keyword. Accepts Japanese or English. \u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9\u3002\u65E5\u672C\u8A9E\u307E\u305F\u306F\u82F1\u8A9E\u3002"
  ),
  hits: z3.number().int().min(1).max(30).default(10).describe(
    "Number of results to return per page (1\u201330, default 10). 1\u30DA\u30FC\u30B8\u3042\u305F\u308A\u306E\u53D6\u5F97\u4EF6\u6570(1\u301C30\u3001\u30C7\u30D5\u30A9\u30EB\u30C810)\u3002"
  ),
  page: z3.number().int().min(1).max(100).default(1).describe(
    "Page number (1+, default 1). \u30DA\u30FC\u30B8\u756A\u53F7(1\u4EE5\u4E0A\u3001\u30C7\u30D5\u30A9\u30EB\u30C81)\u3002"
  ),
  sort: z3.enum(ICHIBA_SORT_OPTIONS).default("standard").describe(
    "Sort order. Prefix '+' = ascending, '-' = descending. \u4E26\u3073\u9806\u3002'+' \u306F\u6607\u9806\u3001'-' \u306F\u964D\u9806\u3002"
  ),
  min_price: z3.number().int().min(0).optional().describe(
    "Minimum price in JPY (integer, inclusive). \u6700\u4F4E\u4FA1\u683C(\u5186\u3001\u6574\u6570\u3001\u4EE5\u4E0A)\u3002"
  ),
  max_price: z3.number().int().min(0).optional().describe(
    "Maximum price in JPY (integer, inclusive). \u6700\u9AD8\u4FA1\u683C(\u5186\u3001\u6574\u6570\u3001\u4EE5\u4E0B)\u3002"
  ),
  genre_id: z3.string().optional().describe(
    "Restrict to a specific genre ID. Browse genres via ichiba_genre_search. \u30B8\u30E3\u30F3\u30EBID\u3067\u7D5E\u308A\u8FBC\u307F\u3002"
  ),
  shop_code: z3.string().optional().describe(
    "Restrict to a specific shop. \u7279\u5B9A\u306E\u5E97\u8217\u3067\u7D5E\u308A\u8FBC\u307F\u3002"
  )
});
function mapItem(raw) {
  const i = raw.Item;
  const itemName = i.itemName ?? "";
  const itemPrice = i.itemPrice ?? 0;
  const quantity = extractQuantityFromItemName(itemName);
  const postageFlag = i.postageFlag ?? 0;
  const postage = resolvePostageInfo(postageFlag, itemPrice);
  return {
    itemName,
    itemPrice,
    itemUrl: i.itemUrl ?? "",
    shopName: i.shopName ?? "",
    shopCode: i.shopCode ?? "",
    itemCode: i.itemCode ?? "",
    reviewAverage: i.reviewAverage ?? 0,
    reviewCount: i.reviewCount ?? 0,
    imageUrl: i.mediumImageUrls?.[0]?.imageUrl,
    availability: i.availability ?? 0,
    taxFlag: i.taxFlag ?? 0,
    postageFlag,
    postageLabel: postage.postageLabel,
    pointRate: i.pointRate ?? 1,
    pointRateStartTime: i.pointRateStartTime,
    pointRateEndTime: i.pointRateEndTime,
    quantity,
    unitPrice: computeUnitPrice(itemPrice, quantity),
    estimatedTotalPrice: postage.estimatedTotalPrice,
    shippingVerified: postage.shippingVerified
  };
}
var ichibaItemSearchTool = {
  name: "ichiba_item_search",
  title: bilingual(
    "Search Rakuten Ichiba Products",
    "\u697D\u5929\u5E02\u5834\u3067\u5546\u54C1\u3092\u691C\u7D22"
  ),
  description: bilingual(
    `Search products on Rakuten Ichiba (Japan's largest e-commerce marketplace) by keyword. Supports price range filtering, sorting by review count/average/price, and restricting results to a specific genre or shop. Returns items with prices, review stats, images, purchase URLs, quantity, unitPrice, postageLabel (from postageFlag), estimatedTotalPrice, and shippingVerified. ${ICHIBA_VALUE_COMPARE_WORKFLOW.en}`,
    `\u697D\u5929\u5E02\u5834\u3067\u5546\u54C1\u3092\u30AD\u30FC\u30EF\u30FC\u30C9\u691C\u7D22\u3057\u307E\u3059\u3002\u5404\u5546\u54C1\u306Bquantity\u30FBunitPrice\u30FBpostageLabel\u30FBestimatedTotalPrice\u30FBshippingVerified\u3092\u4ED8\u4E0E\u3057\u307E\u3059\u3002${ICHIBA_VALUE_COMPARE_WORKFLOW.ja}`
  ),
  inputSchema: itemSearchInput,
  async handler(args, config) {
    const params = {
      keyword: args.keyword,
      hits: String(args.hits),
      page: String(args.page),
      sort: args.sort
    };
    if (args.min_price !== void 0) params.minPrice = String(args.min_price);
    if (args.max_price !== void 0) params.maxPrice = String(args.max_price);
    if (args.genre_id) params.genreId = args.genre_id;
    if (args.shop_code) params.shopCode = args.shop_code;
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/ichibams/api/IchibaItem/Search/20260401",
        params
      },
      config
    );
    const result = {
      count: raw.count ?? 0,
      page: raw.page ?? args.page,
      first: raw.first ?? 0,
      last: raw.last ?? 0,
      hits: raw.hits ?? args.hits,
      pageCount: raw.pageCount ?? 0,
      items: (raw.Items ?? []).map(mapItem)
    };
    return result;
  }
};
var genreSearchInput = z3.object({
  genre_id: z3.string().default("0").describe(
    "Genre ID to query. '0' returns the top-level genres; pass a child genre ID to drill down. \u30B8\u30E3\u30F3\u30EBID\u3002'0' \u306F\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB\u3002\u5B50\u30B8\u30E3\u30F3\u30EBID\u3092\u6E21\u3057\u3066\u6398\u308A\u4E0B\u3052\u307E\u3059\u3002"
  )
});
function mapGenre(raw) {
  return {
    genreId: String(raw?.genreId ?? "0"),
    genreName: raw?.nameJa ?? raw?.genreName ?? "",
    genreLevel: raw?.level ?? raw?.genreLevel ?? 0
  };
}
function unwrapNode(node) {
  if (!node) return void 0;
  if ("child" in node && node.child) return node.child;
  return node;
}
var ichibaGenreSearchTool = {
  name: "ichiba_genre_search",
  title: bilingual(
    "Browse Rakuten Ichiba Genres",
    "\u697D\u5929\u5E02\u5834\u306E\u30B8\u30E3\u30F3\u30EB\u3092\u53C2\u7167"
  ),
  description: bilingual(
    "Browse the Rakuten Ichiba genre (category) hierarchy. Pass '0' to list top-level genres, or a specific genre ID to fetch its ancestors, siblings, and direct children. Useful for narrowing item searches to a specific category, or for discovering what categories exist.",
    "\u697D\u5929\u5E02\u5834\u306E\u30B8\u30E3\u30F3\u30EB(\u30AB\u30C6\u30B4\u30EA)\u968E\u5C64\u3092\u53C2\u7167\u3057\u307E\u3059\u3002'0' \u3092\u6E21\u3059\u3068\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB\u3001\u7279\u5B9A\u306E\u30B8\u30E3\u30F3\u30EBID\u3092\u6E21\u3059\u3068\u7956\u5148\u30FB\u5144\u5F1F\u30FB\u76F4\u4E0B\u306E\u5B50\u30B8\u30E3\u30F3\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002\u5546\u54C1\u691C\u7D22\u3092\u7279\u5B9A\u30AB\u30C6\u30B4\u30EA\u306B\u7D5E\u308A\u8FBC\u3093\u3060\u308A\u3001\u30AB\u30C6\u30B4\u30EA\u69CB\u9020\u3092\u767A\u898B\u3059\u308B\u306E\u306B\u4F7F\u3048\u307E\u3059\u3002"
  ),
  inputSchema: genreSearchInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/ichibagt/api/IchibaGenre/Search/20260401",
        params: { genreId: args.genre_id }
      },
      config
    );
    const result = {
      current: mapGenre(raw.genre),
      ancestors: (raw.ancestors ?? []).map((n) => mapGenre(unwrapNode(n))),
      siblings: (raw.siblings ?? []).map((n) => mapGenre(unwrapNode(n))),
      children: (raw.children ?? []).map((n) => mapGenre(unwrapNode(n)))
    };
    return result;
  }
};
var tagSearchInput = z3.object({
  tag_id: z3.number().int().positive().describe(
    "Tag ID to fetch details for. Tag IDs are discoverable from ichiba_item_search responses (each item carries tagIds) and from ichiba_genre_search. \u30BF\u30B0ID\u3002ichiba_item_search \u306E\u30EC\u30B9\u30DD\u30F3\u30B9\u5185 tagIds \u3084 ichiba_genre_search \u304B\u3089\u53D6\u5F97\u3067\u304D\u307E\u3059\u3002"
  )
});
function mapTagGroup(raw) {
  const g = raw.tagGroup ?? {};
  return {
    tagGroupId: g.tagGroupId ?? 0,
    tagGroupName: g.tagGroupName ?? "",
    tags: (g.tags ?? []).map((t) => ({
      tagId: t.tag?.tagId ?? 0,
      tagName: t.tag?.tagName ?? "",
      parentTagId: t.tag?.parentTagId
    }))
  };
}
var ichibaTagSearchTool = {
  name: "ichiba_tag_search",
  title: bilingual(
    "Look up Rakuten Ichiba Tag Details",
    "\u697D\u5929\u5E02\u5834\u306E\u30BF\u30B0\u8A73\u7D30\u3092\u53C2\u7167"
  ),
  description: bilingual(
    "Look up details for a specific Rakuten Ichiba tag by tag ID. Tags are facet-style attributes (size, color, etc.) attached to items. Returns the tag group this tag belongs to, the tag name, and any parent tag. Tag IDs surface in ichiba_item_search item responses (each item carries an attributeIds array) and in ichiba_genre_search.",
    "\u7279\u5B9A\u306E\u30BF\u30B0ID\u306E\u8A73\u7D30\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002\u30BF\u30B0\u306F\u30D5\u30A1\u30BB\u30C3\u30C8\u5C5E\u6027(\u30B5\u30A4\u30BA\u3001\u8272\u306A\u3069)\u3067\u5546\u54C1\u306B\u7D10\u3065\u3044\u3066\u3044\u307E\u3059\u3002\u30BF\u30B0\u540D\u3001\u6240\u5C5E\u30BF\u30B0\u30B0\u30EB\u30FC\u30D7\u3001\u89AA\u30BF\u30B0\u3092\u8FD4\u3057\u307E\u3059\u3002\u30BF\u30B0ID\u306F ichiba_item_search \u306E\u5404\u5546\u54C1 attributeIds \u3084 ichiba_genre_search \u304B\u3089\u53D6\u5F97\u3067\u304D\u307E\u3059\u3002"
  ),
  inputSchema: tagSearchInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/ichibagt/api/IchibaTag/Search/20140222",
        params: { tagId: String(args.tag_id) }
      },
      config
    );
    const result = {
      tagGroups: (raw.tagGroups ?? []).map(mapTagGroup)
    };
    return result;
  }
};
var ITEM_RANKING_PERIODS = ["realtime", "daily", "weekly", "monthly", "yearly"];
var ITEM_RANKING_AGES = ["10s", "20s", "30s", "40s", "50s", "60s", "70s"];
var ITEM_RANKING_SEXES = ["female", "male"];
var itemRankingInput = z3.object({
  genre_id: z3.string().default("0").describe(
    "Genre ID for the ranking. '0' returns the overall ranking. 0\u306F\u30B8\u30E3\u30F3\u30EB\u5168\u4F53\u306E\u30E9\u30F3\u30AD\u30F3\u30B0\u3002"
  ),
  page: z3.number().int().min(1).max(34).default(1).describe(
    "Page number (1\u201334; Rakuten caps rankings at ~1000 items). \u30DA\u30FC\u30B8\u756A\u53F7(1\u301C34)\u3002"
  ),
  period: z3.enum(ITEM_RANKING_PERIODS).optional().describe(
    "Time window for the ranking. Default depends on Rakuten's current configuration. \u30E9\u30F3\u30AD\u30F3\u30B0\u306E\u96C6\u8A08\u671F\u9593\u3002"
  ),
  age: z3.enum(ITEM_RANKING_AGES).optional().describe(
    "Filter to a specific age demographic (e.g., '20s' = users in their 20s). \u5E74\u4EE3\u30D5\u30A3\u30EB\u30BF\u3002"
  ),
  sex: z3.enum(ITEM_RANKING_SEXES).optional().describe(
    "Filter to a specific gender demographic. \u6027\u5225\u30D5\u30A3\u30EB\u30BF\u3002"
  )
});
var AGE_TO_PARAM = {
  "10s": "10",
  "20s": "20",
  "30s": "30",
  "40s": "40",
  "50s": "50",
  "60s": "60",
  "70s": "70"
};
var SEX_TO_PARAM = {
  female: "0",
  male: "1"
};
var ichibaItemRankingTool = {
  name: "ichiba_item_ranking",
  title: bilingual(
    "Get Rakuten Ichiba Bestseller Ranking",
    "\u697D\u5929\u5E02\u5834\u306E\u58F2\u308C\u7B4B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u53D6\u5F97"
  ),
  description: bilingual(
    `Get the Rakuten Ichiba bestseller ranking \u2014 overall or filtered by genre, time period, age, and gender demographic. Returns ranked items with rank, price, review stats, purchase URL, quantity, unitPrice, postageLabel, estimatedTotalPrice, and shippingVerified. Use ichiba_genre_search to find genre IDs. ${ICHIBA_VALUE_COMPARE_WORKFLOW.en}`,
    `\u697D\u5929\u5E02\u5834\u306E\u58F2\u308C\u7B4B\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002quantity\u30FBunitPrice\u30FBpostageLabel\u30FBestimatedTotalPrice\u30FBshippingVerified\u3092\u542B\u307F\u307E\u3059\u3002${ICHIBA_VALUE_COMPARE_WORKFLOW.ja}`
  ),
  inputSchema: itemRankingInput,
  async handler(args, config) {
    const params = {
      genreId: args.genre_id,
      page: String(args.page)
    };
    if (args.period) params.period = args.period;
    if (args.age) params.age = AGE_TO_PARAM[args.age];
    if (args.sex) params.sex = SEX_TO_PARAM[args.sex];
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/ichibaranking/api/IchibaItem/Ranking/20220601",
        params
      },
      config
    );
    const mapped = (raw.Items ?? []).map((r) => ({
      ...mapItem(r),
      rank: r.Item.rank ?? 0
    }));
    mapped.sort((a, b) => a.rank - b.rank);
    const result = {
      title: raw.title ?? "",
      lastBuildDate: raw.lastBuildDate ?? "",
      items: mapped
    };
    return result;
  }
};
var PRODUCT_SORT_OPTIONS = [
  "standard",
  "+reviewCount",
  "-reviewCount",
  "+reviewAverage",
  "-reviewAverage",
  "+averagePrice",
  "-averagePrice",
  "+releaseDate",
  "-releaseDate"
];
var productSearchInput = z3.object({
  keyword: z3.string().min(1).optional().describe(
    "Product keyword. Required unless product_id is provided. \u5546\u54C1\u30AD\u30FC\u30EF\u30FC\u30C9\u3002product_id \u7701\u7565\u6642\u306F\u5FC5\u9808\u3002"
  ),
  product_id: z3.string().optional().describe(
    "Specific product ID (format like '1:12345'). When provided, returns that product. \u7279\u5B9A\u306E\u5546\u54C1ID\u3002\u6307\u5B9A\u6642\u306F\u305D\u306E\u5546\u54C1\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  genre_id: z3.string().optional().describe(
    "Restrict results to a specific genre. \u30B8\u30E3\u30F3\u30EBID\u3067\u7D5E\u308A\u8FBC\u307F\u3002"
  ),
  maker_code: z3.string().optional().describe(
    "Restrict results to a specific manufacturer (maker code). \u30E1\u30FC\u30AB\u30FC\u30B3\u30FC\u30C9\u3067\u7D5E\u308A\u8FBC\u307F\u3002"
  ),
  hits: z3.number().int().min(1).max(30).default(10).describe(
    "Number of results per page (1\u201330, default 10). 1\u30DA\u30FC\u30B8\u3042\u305F\u308A\u306E\u53D6\u5F97\u4EF6\u6570\u3002"
  ),
  page: z3.number().int().min(1).max(100).default(1).describe(
    "Page number (1+, default 1). \u30DA\u30FC\u30B8\u756A\u53F7\u3002"
  ),
  sort: z3.enum(PRODUCT_SORT_OPTIONS).default("standard").describe(
    "Sort order. '+' ascending, '-' descending. \u4E26\u3073\u9806\u3002"
  )
});
function mapProduct(raw) {
  const p = raw.Product;
  return {
    productId: p.productId ?? "",
    productCode: p.productCode ?? void 0,
    productNo: p.productNo ?? void 0,
    productName: p.productName ?? "",
    productCaption: p.productCaption,
    brandName: p.brandName ?? void 0,
    averagePrice: p.averagePrice ?? 0,
    minPrice: p.minPrice ?? 0,
    maxPrice: p.maxPrice ?? 0,
    salesMinPrice: p.salesMinPrice,
    salesMaxPrice: p.salesMaxPrice,
    itemCount: p.itemCount ?? 0,
    salesItemCount: p.salesItemCount,
    productImageUrl: p.mediumImageUrl ?? p.productImageUrl,
    productUrlPC: p.productUrlPC,
    productUrlMobile: p.productUrlMobile,
    makerName: p.makerName,
    makerCode: p.makerCode !== void 0 ? String(p.makerCode) : void 0,
    genreId: p.genreId !== void 0 ? String(p.genreId) : void 0,
    genreName: p.genreName,
    reviewCount: p.reviewCount ?? 0,
    reviewAverage: p.reviewAverage ?? 0,
    releaseDate: p.releaseDate
  };
}
var ichibaProductSearchTool = {
  name: "ichiba_product_search",
  title: bilingual(
    "Search Rakuten Ichiba Products (Cross-Seller, with Min/Max Pricing)",
    "\u697D\u5929\u5E02\u5834\u306E\u5546\u54C1\u691C\u7D22(\u8907\u6570\u5E97\u8217\u6A2A\u65AD\u3001\u6700\u5B89\u5024/\u5E73\u5747\u4FA1\u683C)"
  ),
  description: bilingual(
    "Search Rakuten's Item Price Navi \u2014 cross-seller product catalogue that groups identical products across multiple shops. Returns each product with its min/max/average price across all sellers and the total number of shops carrying it. Use this (instead of ichiba_item_search) when you want to compare prices for a specific product or answer 'is this a fair price?'. Filter by maker_code to restrict to a brand.",
    "\u697D\u5929\u5E02\u5834\u306E\u5546\u54C1\u4FA1\u683C\u30CA\u30D3\u3092\u691C\u7D22\u3057\u307E\u3059\u3002\u540C\u4E00\u5546\u54C1\u3092\u8907\u6570\u5E97\u8217\u306B\u307E\u305F\u304C\u3063\u3066\u96C6\u7D04\u3057\u3001\u6700\u5B89\u5024/\u6700\u9AD8\u5024/\u5E73\u5747\u4FA1\u683C\u3068\u53D6\u6271\u5E97\u8217\u6570\u3092\u8FD4\u3057\u307E\u3059\u3002\u7279\u5B9A\u5546\u54C1\u306E\u4FA1\u683C\u6BD4\u8F03\u3084\u300C\u59A5\u5F53\u306A\u4FA1\u683C\u304B?\u300D\u3092\u5224\u65AD\u3059\u308B\u7528\u9014\u3067\u306F\u3001ichiba_item_search \u3067\u306F\u306A\u304F\u3053\u3061\u3089\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002maker_code \u3067\u30D6\u30E9\u30F3\u30C9\u7D5E\u308A\u8FBC\u307F\u3082\u53EF\u80FD\u3002"
  ),
  inputSchema: productSearchInput,
  async handler(args, config) {
    if (!args.keyword && !args.product_id) {
      throw new Error(
        "Either keyword or product_id is required. keyword \u304B product_id \u306E\u3044\u305A\u308C\u304B\u304C\u5FC5\u8981\u3067\u3059\u3002"
      );
    }
    const params = {
      hits: String(args.hits),
      page: String(args.page),
      sort: args.sort
    };
    if (args.keyword) params.keyword = args.keyword;
    if (args.product_id) params.productId = args.product_id;
    if (args.genre_id) params.genreId = args.genre_id;
    if (args.maker_code) params.makerCode = args.maker_code;
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/ichibaproduct/api/Product/Search/20250801",
        params
      },
      config
    );
    const result = {
      count: raw.count ?? 0,
      page: raw.page ?? args.page,
      first: raw.first ?? 0,
      last: raw.last ?? 0,
      hits: raw.hits ?? args.hits,
      pageCount: raw.pageCount ?? 0,
      products: (raw.Products ?? []).map(mapProduct)
    };
    return result;
  }
};

// src/tools/books.ts
import { z as z4 } from "zod";
var BOOKS_SORT_OPTIONS = [
  "standard",
  "sales",
  "+releaseDate",
  "-releaseDate",
  "+itemPrice",
  "-itemPrice",
  "reviewCount",
  "reviewAverage"
];
var commonSearchFields = {
  hits: z4.number().int().min(1).max(30).default(10).describe(
    "Number of results per page (1\u201330, default 10). 1\u30DA\u30FC\u30B8\u3042\u305F\u308A\u306E\u53D6\u5F97\u4EF6\u6570(1\u301C30\u3001\u30C7\u30D5\u30A9\u30EB\u30C810)\u3002"
  ),
  page: z4.number().int().min(1).max(100).default(1).describe(
    "Page number (1+, default 1). \u30DA\u30FC\u30B8\u756A\u53F7(1\u4EE5\u4E0A\u3001\u30C7\u30D5\u30A9\u30EB\u30C81)\u3002"
  ),
  sort: z4.enum(BOOKS_SORT_OPTIONS).default("standard").describe(
    "Sort order. \u4E26\u3073\u9806\u3002"
  ),
  booksGenreId: z4.string().optional().describe(
    "Restrict to a specific Books genre (3-character IDs, hierarchical). Use books_genre_search to discover. \u30B8\u30E3\u30F3\u30EBID\u3067\u7D5E\u308A\u8FBC\u307F(books_genre_search \u3067\u53D6\u5F97)\u3002"
  )
};
async function runBooksSearch(path, params, mapItem2, config, defaultHits, defaultPage) {
  const raw = await rakutenRequest(
    { host: HOST_OPENAPI, path, params },
    config
  );
  return {
    count: raw.count ?? 0,
    page: raw.page ?? defaultPage,
    first: raw.first ?? 0,
    last: raw.last ?? 0,
    hits: raw.hits ?? defaultHits,
    pageCount: raw.pageCount ?? 0,
    items: (raw.Items ?? []).map((wrapper) => mapItem2(wrapper.Item))
  };
}
function mapCommon(r) {
  return {
    title: r.title ?? "",
    titleKana: r.titleKana,
    itemPrice: r.itemPrice ?? 0,
    itemUrl: r.itemUrl ?? "",
    itemCaption: r.itemCaption,
    availability: r.availability ?? 0,
    postageFlag: r.postageFlag ?? 0,
    reviewCount: r.reviewCount ?? 0,
    reviewAverage: r.reviewAverage ?? 0,
    imageUrl: r.mediumImageUrl ?? r.largeImageUrl ?? r.smallImageUrl,
    salesDate: r.salesDate,
    listPrice: r.listPrice,
    discountPrice: r.discountPrice,
    discountRate: r.discountRate,
    limitedFlag: r.limitedFlag,
    booksGenreId: r.booksGenreId
  };
}
var totalSearchInput = z4.object({
  keyword: z4.string().min(1).describe(
    "Search keyword across all Rakuten Books categories (books, CDs, DVDs, software, games, magazines). \u697D\u5929\u30D6\u30C3\u30AF\u30B9\u5168\u30AB\u30C6\u30B4\u30EA\u6A2A\u65AD\u30AD\u30FC\u30EF\u30FC\u30C9\u691C\u7D22\u3002"
  ),
  ...commonSearchFields
});
function mapTotal(r) {
  return {
    ...mapCommon(r),
    author: r.author,
    publisherName: r.publisherName,
    isbn: r.isbn,
    jan: r.jan,
    artistName: r.artistName,
    label: r.label
  };
}
var booksTotalSearchTool = {
  name: "books_total_search",
  title: bilingual("Search Rakuten Books (All Categories)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u5168\u30AB\u30C6\u30B4\u30EA\u691C\u7D22"),
  description: bilingual(
    "Cross-category search across Rakuten Books \u2014 books, CDs, DVDs, video games, software, magazines, and foreign-language books. Use this when you don't know which category contains the target item. For category-specific results with category-specific fields, use the books_book_search / books_cd_search / etc. tools.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9(\u672C\u3001CD\u3001DVD\u3001\u30B2\u30FC\u30E0\u3001\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2\u3001\u96D1\u8A8C\u3001\u6D0B\u66F8)\u3092\u6A2A\u65AD\u691C\u7D22\u3057\u307E\u3059\u3002\u30AB\u30C6\u30B4\u30EA\u304C\u4E0D\u660E\u306A\u691C\u7D22\u306B\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002\u30AB\u30C6\u30B4\u30EA\u56FA\u6709\u306E\u30D5\u30A3\u30FC\u30EB\u30C9\u304C\u5FC5\u8981\u306A\u5834\u5408\u306F books_book_search / books_cd_search \u306A\u3069\u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  ),
  inputSchema: totalSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksTotal/Search/20170404",
      buildBooksParams({ keyword: args.keyword }, args),
      mapTotal,
      config,
      args.hits,
      args.page
    );
  }
};
function buildBooksParams(specific, common) {
  const params = {
    hits: String(common.hits),
    page: String(common.page),
    sort: common.sort
  };
  if (common.booksGenreId) params.booksGenreId = common.booksGenreId;
  for (const [k, v] of Object.entries(specific)) {
    if (v !== void 0 && v !== "") params[k] = v;
  }
  return params;
}
var bookSearchInput = z4.object({
  title: z4.string().optional().describe("Book title (partial match). \u66F8\u540D(\u90E8\u5206\u4E00\u81F4)\u3002"),
  author: z4.string().optional().describe("Author name. \u8457\u8005\u540D\u3002"),
  publisherName: z4.string().optional().describe("Publisher name. \u51FA\u7248\u793E\u3002"),
  isbnjan: z4.string().optional().describe("ISBN or JAN code. ISBN \u307E\u305F\u306F JAN \u30B3\u30FC\u30C9\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword across all fields. \u5168\u30D5\u30A3\u30FC\u30EB\u30C9\u6A2A\u65AD\u306E\u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.author || v.publisherName || v.isbnjan || v.keyword,
  { message: "At least one of title, author, publisherName, isbnjan, keyword is required. title/author/publisherName/isbnjan/keyword \u306E\u3044\u305A\u308C\u304B\u5FC5\u9808\u3002" }
);
function mapBook(r) {
  return {
    ...mapCommon(r),
    author: r.author,
    publisherName: r.publisherName,
    isbn: r.isbn,
    subTitle: r.subTitle,
    seriesName: r.seriesName,
    contents: r.contents,
    previewUrl: r.chirayomiUrl,
    size: r.size
  };
}
var booksBookSearchTool = {
  name: "books_book_search",
  title: bilingual("Search Rakuten Books (Printed Books)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u66F8\u7C4D\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for printed books by title, author, ISBN, publisher, or free-text keyword. Returns book details including ISBN, author, publisher, series, table of contents, preview URL, list price, and review stats. Pass at least one search field.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u7D19\u306E\u66F8\u7C4D\u3092\u3001\u66F8\u540D\u30FB\u8457\u8005\u30FBISBN\u30FB\u51FA\u7248\u793E\u30FB\u30AD\u30FC\u30EF\u30FC\u30C9\u3067\u691C\u7D22\u3057\u307E\u3059\u3002ISBN\u3001\u8457\u8005\u3001\u51FA\u7248\u793E\u3001\u30B7\u30EA\u30FC\u30BA\u3001\u76EE\u6B21\u3001\u7ACB\u3061\u8AAD\u307FURL\u3001\u5B9A\u4FA1\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u66F8\u7C4D\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002\u691C\u7D22\u6761\u4EF6\u306F\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u9808\u3002"
  ),
  inputSchema: bookSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksBook/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          author: args.author,
          publisherName: args.publisherName,
          isbnjan: args.isbnjan,
          keyword: args.keyword
        },
        args
      ),
      mapBook,
      config,
      args.hits,
      args.page
    );
  }
};
var cdSearchInput = z4.object({
  title: z4.string().optional().describe("Album/single title. \u30A2\u30EB\u30D0\u30E0/\u30B7\u30F3\u30B0\u30EB\u540D\u3002"),
  artistName: z4.string().optional().describe("Artist name. \u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u540D\u3002"),
  label: z4.string().optional().describe("Record label. \u30EC\u30FC\u30D9\u30EB\u3002"),
  jan: z4.string().optional().describe("JAN code. JAN\u30B3\u30FC\u30C9\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.artistName || v.label || v.jan || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapCD(r) {
  return {
    ...mapCommon(r),
    artistName: r.artistName,
    label: r.label,
    jan: r.jan,
    makerCode: r.makerCode !== void 0 ? String(r.makerCode) : void 0,
    trackList: r.playList,
    size: r.size
  };
}
var booksCDSearchTool = {
  name: "books_cd_search",
  title: bilingual("Search Rakuten Books (CDs / Music)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067CD\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for music CDs by title, artist, label, or JAN code. Returns album/single details including artist, label, JAN, track list, list price, and review stats.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u97F3\u697DCD\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u30FB\u30EC\u30FC\u30D9\u30EB\u30FBJAN\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3001\u30EC\u30FC\u30D9\u30EB\u3001JAN\u3001\u53CE\u9332\u66F2\u3001\u5B9A\u4FA1\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: cdSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksCD/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          artistName: args.artistName,
          label: args.label,
          jan: args.jan,
          keyword: args.keyword
        },
        args
      ),
      mapCD,
      config,
      args.hits,
      args.page
    );
  }
};
var dvdSearchInput = z4.object({
  title: z4.string().optional().describe("Title (movie or show). \u30BF\u30A4\u30C8\u30EB\u3002"),
  artistName: z4.string().optional().describe("Performer/artist. \u51FA\u6F14\u8005/\u30A2\u30FC\u30C6\u30A3\u30B9\u30C8\u3002"),
  label: z4.string().optional().describe("Label/studio. \u30EC\u30FC\u30D9\u30EB/\u30B9\u30BF\u30B8\u30AA\u3002"),
  jan: z4.string().optional().describe("JAN code. JAN\u30B3\u30FC\u30C9\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.artistName || v.label || v.jan || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapDVD(r) {
  return {
    ...mapCommon(r),
    artistName: r.artistName,
    label: r.label,
    jan: r.jan,
    makerCode: r.makerCode !== void 0 ? String(r.makerCode) : void 0
  };
}
var booksDVDSearchTool = {
  name: "books_dvd_search",
  title: bilingual("Search Rakuten Books (DVDs / Blu-ray)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067DVD\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for DVDs and Blu-ray discs by title, performer, label, or JAN. Returns title details with performer, label, JAN, list price, and review stats.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067DVD\u30FBBlu-ray\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u51FA\u6F14\u8005\u30FB\u30EC\u30FC\u30D9\u30EB\u30FBJAN\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u51FA\u6F14\u8005\u3001\u30EC\u30FC\u30D9\u30EB\u3001JAN\u3001\u5B9A\u4FA1\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: dvdSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksDVD/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          artistName: args.artistName,
          label: args.label,
          jan: args.jan,
          keyword: args.keyword
        },
        args
      ),
      mapDVD,
      config,
      args.hits,
      args.page
    );
  }
};
var foreignBookSearchInput = z4.object({
  title: z4.string().optional().describe("Title (English or other). \u30BF\u30A4\u30C8\u30EB\u3002"),
  author: z4.string().optional().describe("Author. \u8457\u8005\u3002"),
  publisherName: z4.string().optional().describe("Publisher. \u51FA\u7248\u793E\u3002"),
  isbn: z4.string().optional().describe("ISBN. ISBN\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.author || v.publisherName || v.isbn || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapForeignBook(r) {
  return {
    ...mapCommon(r),
    author: r.author,
    publisherName: r.publisherName,
    isbn: r.isbn,
    japaneseTitle: r.japaneseTitle
  };
}
var booksForeignBookSearchTool = {
  name: "books_foreign_book_search",
  title: bilingual("Search Rakuten Books (Foreign-Language Books)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u6D0B\u66F8\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for foreign-language (non-Japanese) books by title, author, ISBN, or publisher. Returns book details plus a Japanese-translated title field when available.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u6D0B\u66F8\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u8457\u8005\u30FBISBN\u30FB\u51FA\u7248\u793E\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u66F8\u7C4D\u8A73\u7D30\u306B\u52A0\u3048\u3001\u90A6\u984C\u304C\u5B58\u5728\u3059\u308B\u5834\u5408\u306F japaneseTitle \u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: foreignBookSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksForeignBook/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          author: args.author,
          publisherName: args.publisherName,
          isbn: args.isbn,
          keyword: args.keyword
        },
        args
      ),
      mapForeignBook,
      config,
      args.hits,
      args.page
    );
  }
};
var magazineSearchInput = z4.object({
  title: z4.string().optional().describe("Magazine title. \u96D1\u8A8C\u540D\u3002"),
  publisherName: z4.string().optional().describe("Publisher. \u51FA\u7248\u793E\u3002"),
  jan: z4.string().optional().describe("JAN code. JAN\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.publisherName || v.jan || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapMagazine(r) {
  return {
    ...mapCommon(r),
    publisherName: r.publisherName,
    jan: r.jan,
    cycle: r.cycle,
    previewUrl: r.chirayomiUrl
  };
}
var booksMagazineSearchTool = {
  name: "books_magazine_search",
  title: bilingual("Search Rakuten Books (Magazines)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u96D1\u8A8C\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for magazines by title, publisher, or JAN. Returns issue details including publisher, JAN, publication cycle, preview URL, and review stats.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u96D1\u8A8C\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u51FA\u7248\u793E\u30FBJAN\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u51FA\u7248\u793E\u3001JAN\u3001\u767A\u884C\u30B5\u30A4\u30AF\u30EB\u3001\u7ACB\u3061\u8AAD\u307FURL\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: magazineSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksMagazine/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          publisherName: args.publisherName,
          jan: args.jan,
          keyword: args.keyword
        },
        args
      ),
      mapMagazine,
      config,
      args.hits,
      args.page
    );
  }
};
var gameSearchInput = z4.object({
  title: z4.string().optional().describe("Game title. \u30B2\u30FC\u30E0\u30BF\u30A4\u30C8\u30EB\u3002"),
  hardware: z4.string().optional().describe("Platform/hardware (e.g., 'Nintendo Switch'). \u30CF\u30FC\u30C9\u30A6\u30A7\u30A2(\u4F8B: 'Nintendo Switch')\u3002"),
  jan: z4.string().optional().describe("JAN code. JAN\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.hardware || v.jan || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapGame(r) {
  return {
    ...mapCommon(r),
    hardware: r.hardware,
    label: r.label,
    jan: r.jan,
    makerCode: r.makerCode !== void 0 ? String(r.makerCode) : void 0
  };
}
var booksGameSearchTool = {
  name: "books_game_search",
  title: bilingual("Search Rakuten Books (Video Games)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u30B2\u30FC\u30E0\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for video games by title, platform/hardware (e.g., 'Nintendo Switch', 'PlayStation 5'), or JAN. Returns title details with hardware, label, JAN, list price, and review stats.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u30D3\u30C7\u30AA\u30B2\u30FC\u30E0\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u30CF\u30FC\u30C9(\u4F8B: 'Nintendo Switch', 'PlayStation 5')\u30FBJAN\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u30CF\u30FC\u30C9\u3001\u30EC\u30FC\u30D9\u30EB\u3001JAN\u3001\u5B9A\u4FA1\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: gameSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksGame/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          hardware: args.hardware,
          jan: args.jan,
          keyword: args.keyword
        },
        args
      ),
      mapGame,
      config,
      args.hits,
      args.page
    );
  }
};
var softwareSearchInput = z4.object({
  title: z4.string().optional().describe("Software title. \u30BD\u30D5\u30C8\u30A6\u30A7\u30A2\u540D\u3002"),
  os: z4.string().optional().describe("Target OS (e.g., 'Windows', 'macOS'). \u5BFE\u5FDCOS\u3002"),
  jan: z4.string().optional().describe("JAN code. JAN\u3002"),
  keyword: z4.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  ...commonSearchFields
}).refine(
  (v) => v.title || v.os || v.jan || v.keyword,
  { message: "At least one search field is required. \u691C\u7D22\u6761\u4EF6\u304C\u5C11\u306A\u304F\u3068\u30821\u3064\u5FC5\u8981\u3067\u3059\u3002" }
);
function mapSoftware(r) {
  return {
    ...mapCommon(r),
    os: r.os,
    label: r.label,
    jan: r.jan,
    makerCode: r.makerCode !== void 0 ? String(r.makerCode) : void 0
  };
}
var booksSoftwareSearchTool = {
  name: "books_software_search",
  title: bilingual("Search Rakuten Books (Computer Software)", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Books for computer software by title, target OS (e.g., 'Windows', 'macOS'), or JAN. Returns software details with target OS, label, JAN, list price, and review stats.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u3067PC\u30BD\u30D5\u30C8\u30A6\u30A7\u30A2\u3092\u3001\u30BF\u30A4\u30C8\u30EB\u30FB\u5BFE\u5FDCOS(\u4F8B: 'Windows', 'macOS')\u30FBJAN\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u5BFE\u5FDCOS\u3001\u30EC\u30FC\u30D9\u30EB\u3001JAN\u3001\u5B9A\u4FA1\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: softwareSearchInput,
  async handler(args, config) {
    return runBooksSearch(
      "/services/api/BooksSoftware/Search/20170404",
      buildBooksParams(
        {
          title: args.title,
          os: args.os,
          jan: args.jan,
          keyword: args.keyword
        },
        args
      ),
      mapSoftware,
      config,
      args.hits,
      args.page
    );
  }
};
var genreSearchInput2 = z4.object({
  booksGenreId: z4.string().default("000").describe(
    "Books genre ID (e.g., '000' = top, '001' = books, '004' = CD). Three-character codes are hierarchical levels. \u30B8\u30E3\u30F3\u30EBID('000' \u304C\u30C8\u30C3\u30D7\u3001'001' \u304C\u66F8\u7C4D\u3001'004' \u304CCD)\u3002"
  )
});
function mapBooksGenre(raw) {
  return {
    booksGenreId: String(raw?.booksGenreId ?? ""),
    booksGenreName: raw?.booksGenreName ?? "",
    genreLevel: raw?.genreLevel ?? 0
  };
}
var booksGenreSearchTool = {
  name: "books_genre_search",
  title: bilingual("Browse Rakuten Books Genres", "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u306E\u30B8\u30E3\u30F3\u30EB\u3092\u53C2\u7167"),
  description: bilingual(
    "Browse the Rakuten Books genre (category) hierarchy. Pass '000' to list top-level genres, or a specific 3-character genre ID to fetch its parents and direct children. Useful for narrowing book searches to a specific category.",
    "\u697D\u5929\u30D6\u30C3\u30AF\u30B9\u306E\u30B8\u30E3\u30F3\u30EB(\u30AB\u30C6\u30B4\u30EA)\u968E\u5C64\u3092\u53C2\u7167\u3057\u307E\u3059\u3002'000' \u3092\u6E21\u3059\u3068\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB\u3001\u7279\u5B9A\u306E3\u6587\u5B57\u30B8\u30E3\u30F3\u30EBID\u3092\u6E21\u3059\u3068\u89AA\u30B8\u30E3\u30F3\u30EB\u3068\u76F4\u4E0B\u306E\u5B50\u30B8\u30E3\u30F3\u30EB\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002\u691C\u7D22\u306E\u7D5E\u308A\u8FBC\u307F\u306B\u5229\u7528\u3067\u304D\u307E\u3059\u3002"
  ),
  inputSchema: genreSearchInput2,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/services/api/BooksGenre/Search/20121128",
        params: { booksGenreId: args.booksGenreId }
      },
      config
    );
    return {
      current: mapBooksGenre(raw.current),
      parents: (raw.parents ?? []).map((p) => mapBooksGenre(p.parent)),
      children: (raw.children ?? []).map((c) => mapBooksGenre(c.child))
    };
  }
};

// src/tools/travel.ts
import { z as z5 } from "zod";
function flattenHotel(blocks) {
  let basic;
  let rating;
  let detail;
  const plans = [];
  for (const blk of blocks) {
    if (blk.hotelBasicInfo) basic = blk.hotelBasicInfo;
    if (blk.hotelRatingInfo) rating = blk.hotelRatingInfo;
    if (blk.hotelDetailInfo) detail = blk.hotelDetailInfo;
    if (blk.roomInfo) {
      for (const r of blk.roomInfo) {
        const b = r.roomBasicInfo;
        if (!b) continue;
        plans.push({
          planId: b.planId !== void 0 ? String(b.planId) : void 0,
          planName: b.planName,
          roomClass: b.roomClass,
          roomName: b.roomName,
          reserveUrl: b.reserveUrl,
          withBreakfast: b.withBreakfastFlag === 1 || b.breakfastSelectFlag === 1,
          withDinner: b.withDinnerFlag === 1 || b.dinnerSelectFlag === 1,
          pointRate: b.pointRate,
          pricePerNight: r.dailyCharge?.rakutenCharge,
          totalPrice: r.dailyCharge?.total,
          stayDate: r.dailyCharge?.stayDate
        });
      }
    }
  }
  if (!basic) return null;
  const result = {
    hotelNo: basic.hotelNo ?? 0,
    hotelName: basic.hotelName ?? "",
    hotelKanaName: basic.hotelKanaName,
    hotelMinCharge: basic.hotelMinCharge,
    latitude: basic.latitude,
    longitude: basic.longitude,
    postalCode: basic.postalCode,
    address1: basic.address1,
    address2: basic.address2,
    telephoneNo: basic.telephoneNo,
    access: basic.access,
    nearestStation: basic.nearestStation,
    parkingInformation: basic.parkingInformation,
    imageUrl: basic.hotelImageUrl,
    thumbnailUrl: basic.hotelThumbnailUrl,
    hotelInformationUrl: basic.hotelInformationUrl,
    reviewCount: basic.reviewCount ?? 0,
    reviewAverage: basic.reviewAverage ?? 0
  };
  if (rating) {
    result.ratings = {
      service: rating.serviceAverage,
      location: rating.locationAverage,
      room: rating.roomAverage,
      equipment: rating.equipmentAverage,
      bath: rating.bathAverage,
      meal: rating.mealAverage
    };
  }
  if (detail) {
    result.details = {
      areaName: detail.areaName,
      hotelClassCode: detail.hotelClassCode,
      checkinTime: detail.checkinTime,
      checkoutTime: detail.checkoutTime,
      largeClassCode: detail.largeClassCode,
      middleClassCode: detail.middleClassCode,
      smallClassCode: detail.smallClassCode
    };
  }
  if (plans.length > 0) result.plans = plans;
  return result;
}
function mapPagedHotels(raw, defaultPage) {
  const p = raw.pagingInfo ?? {};
  return {
    recordCount: p.recordCount ?? 0,
    pageCount: p.pageCount ?? 0,
    page: p.page ?? defaultPage,
    first: p.first ?? 0,
    last: p.last ?? 0,
    hotels: (raw.hotels ?? []).map((w) => flattenHotel(w.hotel)).filter((h) => h !== null)
  };
}
var simpleHotelSearchInput = z5.object({
  largeClassCode: z5.string().optional().describe(
    "Large area class (e.g., 'japan'). Use travel_get_area_class to discover. \u5927\u30A8\u30EA\u30A2(\u4F8B: 'japan')\u3002"
  ),
  middleClassCode: z5.string().optional().describe("Prefecture-level code (e.g., 'tokyo'). \u90FD\u9053\u5E9C\u770C\u3002"),
  smallClassCode: z5.string().optional().describe("City-level code (e.g., 'tokyo'). \u5E02\u533A\u753A\u6751\u3002"),
  detailClassCode: z5.string().optional().describe("District-level code (e.g., 'A'). \u8A73\u7D30\u30A8\u30EA\u30A2\u3002"),
  latitude: z5.number().optional().describe("Latitude (decimal degrees) for coordinate search. \u7DEF\u5EA6\u3002"),
  longitude: z5.number().optional().describe("Longitude (decimal degrees) for coordinate search. \u7D4C\u5EA6\u3002"),
  searchRadius: z5.number().min(0.1).max(3).optional().describe(
    "Search radius in kilometers (0.1\u20133.0) when using lat/lon. \u691C\u7D22\u534A\u5F84(km\u30010.1\u301C3.0)\u3002"
  ),
  hits: z5.number().int().min(1).max(30).default(10).describe("Results per page (1\u201330). \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z5.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002")
}).refine(
  (v) => Boolean(v.largeClassCode) || v.latitude !== void 0 && v.longitude !== void 0,
  { message: "Either largeClassCode (+ optional sub-classes) or both latitude AND longitude must be provided. largeClassCode \u304B (latitude AND longitude) \u306E\u3044\u305A\u308C\u304B\u304C\u5FC5\u8981\u3067\u3059\u3002" }
);
var travelSimpleHotelSearchTool = {
  name: "travel_simple_hotel_search",
  title: bilingual("Search Rakuten Travel Hotels (by Area)", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u3067\u30DB\u30C6\u30EB\u691C\u7D22(\u30A8\u30EA\u30A2\u6307\u5B9A)"),
  description: bilingual(
    "Search Rakuten Travel hotels by area code (japan \u2192 prefecture \u2192 city \u2192 district) or by latitude/longitude coordinates. Returns hotel summaries with prices, addresses, review stats, and ratings. Use travel_get_area_class to discover area codes.",
    "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u3092\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u968E\u5C64(\u65E5\u672C\u2192\u90FD\u9053\u5E9C\u770C\u2192\u5E02\u533A\u753A\u6751\u2192\u8A73\u7D30)\u3001\u307E\u305F\u306F\u7DEF\u5EA6\u7D4C\u5EA6\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u4FA1\u683C\u3001\u4F4F\u6240\u3001\u30EC\u30D3\u30E5\u30FC\u3001\u8A55\u4FA1\u3092\u542B\u3080\u30DB\u30C6\u30EB\u4E00\u89A7\u3092\u8FD4\u3057\u307E\u3059\u3002\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u306F travel_get_area_class \u3067\u53D6\u5F97\u3067\u304D\u307E\u3059\u3002"
  ),
  inputSchema: simpleHotelSearchInput,
  async handler(args, config) {
    const params = {
      hits: String(args.hits),
      page: String(args.page)
    };
    if (args.largeClassCode) params.largeClassCode = args.largeClassCode;
    if (args.middleClassCode) params.middleClassCode = args.middleClassCode;
    if (args.smallClassCode) params.smallClassCode = args.smallClassCode;
    if (args.detailClassCode) params.detailClassCode = args.detailClassCode;
    if (args.latitude !== void 0) params.latitude = String(args.latitude);
    if (args.longitude !== void 0) params.longitude = String(args.longitude);
    if (args.searchRadius !== void 0) params.searchRadius = String(args.searchRadius);
    const raw = await rakutenRequest(
      { host: HOST_OPENAPI, path: "/engine/api/Travel/SimpleHotelSearch/20170426", params },
      config
    );
    return mapPagedHotels(raw, args.page);
  }
};
var vacantHotelSearchInput = z5.object({
  checkinDate: z5.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").describe("Check-in date (YYYY-MM-DD). \u30C1\u30A7\u30C3\u30AF\u30A4\u30F3\u65E5(YYYY-MM-DD)\u3002"),
  checkoutDate: z5.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").describe("Check-out date (YYYY-MM-DD). \u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8\u65E5(YYYY-MM-DD)\u3002"),
  adultNum: z5.number().int().min(1).max(99).default(1).describe("Number of adult guests. \u5927\u4EBA\u4EBA\u6570\u3002"),
  roomNum: z5.number().int().min(1).max(99).default(1).describe("Number of rooms. \u90E8\u5C4B\u6570\u3002"),
  largeClassCode: z5.string().optional().describe("Large area class. \u5927\u30A8\u30EA\u30A2\u3002"),
  middleClassCode: z5.string().optional().describe("Prefecture code. \u90FD\u9053\u5E9C\u770C\u3002"),
  smallClassCode: z5.string().optional().describe("City code. \u5E02\u533A\u753A\u6751\u3002"),
  detailClassCode: z5.string().optional().describe("District code. \u8A73\u7D30\u30A8\u30EA\u30A2\u3002"),
  latitude: z5.number().optional().describe("Latitude. \u7DEF\u5EA6\u3002"),
  longitude: z5.number().optional().describe("Longitude. \u7D4C\u5EA6\u3002"),
  searchRadius: z5.number().min(0.1).max(3).optional().describe("Search radius km. \u691C\u7D22\u534A\u5F84(km)\u3002"),
  hits: z5.number().int().min(1).max(30).default(10).describe("Results per page. \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z5.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002")
}).refine(
  (v) => Boolean(v.largeClassCode) || v.latitude !== void 0 && v.longitude !== void 0,
  { message: "Either largeClassCode or both latitude AND longitude required. largeClassCode \u304B (latitude AND longitude) \u306E\u3044\u305A\u308C\u304B\u304C\u5FC5\u8981\u3067\u3059\u3002" }
);
var travelVacantHotelSearchTool = {
  name: "travel_vacant_hotel_search",
  title: bilingual("Search Rakuten Travel Hotels (Available on Dates)", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u3067\u7A7A\u5BA4\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Travel for hotels with rooms available on specific check-in/check-out dates. Returns each hotel together with its available room plans (plan name, price per night, total price, with-breakfast flag, reserve URL). Same area-code or lat/lon parameters as travel_simple_hotel_search.",
    "\u6307\u5B9A\u306E\u30C1\u30A7\u30C3\u30AF\u30A4\u30F3/\u30C1\u30A7\u30C3\u30AF\u30A2\u30A6\u30C8\u65E5\u306B\u7A7A\u5BA4\u304C\u3042\u308B\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u3092\u691C\u7D22\u3057\u307E\u3059\u3002\u5404\u30DB\u30C6\u30EB\u3068\u5229\u7528\u53EF\u80FD\u306A\u30D7\u30E9\u30F3(\u30D7\u30E9\u30F3\u540D\u30011\u6CCA\u3042\u305F\u308A\u306E\u4FA1\u683C\u3001\u5408\u8A08\u91D1\u984D\u3001\u671D\u98DF\u6709\u7121\u3001\u4E88\u7D04URL)\u3092\u8FD4\u3057\u307E\u3059\u3002\u30A8\u30EA\u30A2/\u5EA7\u6A19\u30D1\u30E9\u30E1\u30FC\u30BF\u306F travel_simple_hotel_search \u3068\u540C\u3058\u3002"
  ),
  inputSchema: vacantHotelSearchInput,
  async handler(args, config) {
    const params = {
      checkinDate: args.checkinDate,
      checkoutDate: args.checkoutDate,
      adultNum: String(args.adultNum),
      roomNum: String(args.roomNum),
      hits: String(args.hits),
      page: String(args.page)
    };
    if (args.largeClassCode) params.largeClassCode = args.largeClassCode;
    if (args.middleClassCode) params.middleClassCode = args.middleClassCode;
    if (args.smallClassCode) params.smallClassCode = args.smallClassCode;
    if (args.detailClassCode) params.detailClassCode = args.detailClassCode;
    if (args.latitude !== void 0) params.latitude = String(args.latitude);
    if (args.longitude !== void 0) params.longitude = String(args.longitude);
    if (args.searchRadius !== void 0) params.searchRadius = String(args.searchRadius);
    const raw = await rakutenRequest(
      { host: HOST_OPENAPI, path: "/engine/api/Travel/VacantHotelSearch/20170426", params },
      config
    );
    return mapPagedHotels(raw, args.page);
  }
};
var hotelDetailSearchInput = z5.object({
  hotelNo: z5.number().int().positive().describe("Hotel number (from search results). \u30DB\u30C6\u30EB\u756A\u53F7(\u691C\u7D22\u7D50\u679C\u304B\u3089\u53D6\u5F97)\u3002")
});
var travelHotelDetailSearchTool = {
  name: "travel_hotel_detail_search",
  title: bilingual("Get Rakuten Travel Hotel Details", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u8A73\u7D30\u3092\u53D6\u5F97"),
  description: bilingual(
    "Fetch detailed information for a specific Rakuten Travel hotel by its hotelNo. Returns the same Hotel shape as search endpoints but with the per-axis ratings and detail fields populated.",
    "\u7279\u5B9A\u306E\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u30DB\u30C6\u30EB\u306E\u8A73\u7D30\u60C5\u5831\u3092 hotelNo \u3067\u53D6\u5F97\u3057\u307E\u3059\u3002\u691C\u7D22\u7CFB\u3068\u540C\u3058 Hotel \u5F62\u5F0F\u3067\u3001\u8A55\u4FA1\u8EF8(\u30B5\u30FC\u30D3\u30B9/\u7ACB\u5730/\u90E8\u5C4B\u306A\u3069)\u3084\u8A73\u7D30\u60C5\u5831\u3082\u542B\u3081\u3066\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: hotelDetailSearchInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Travel/HotelDetailSearch/20170426",
        params: { hotelNo: String(args.hotelNo) }
      },
      config
    );
    const result = mapPagedHotels(raw, 1);
    return result.hotels[0] ?? null;
  }
};
var getAreaClassInput = z5.object({});
var travelGetAreaClassTool = {
  name: "travel_get_area_class",
  title: bilingual("Get Rakuten Travel Area Classification", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30A8\u30EA\u30A2\u533A\u5206\u3092\u53D6\u5F97"),
  description: bilingual(
    "Get the full Rakuten Travel area-code hierarchy: Japan \u2192 prefecture (middle) \u2192 city (small) \u2192 district (detail). Use the returned codes as largeClassCode/middleClassCode/etc. in the hotel search tools.",
    "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u968E\u5C64\u3092\u53D6\u5F97\u3057\u307E\u3059(\u65E5\u672C\u2192\u90FD\u9053\u5E9C\u770C\u2192\u5E02\u533A\u753A\u6751\u2192\u8A73\u7D30)\u3002\u8FD4\u3055\u308C\u305F\u30B3\u30FC\u30C9\u3092 largeClassCode/middleClassCode \u7B49\u3068\u3057\u3066\u30DB\u30C6\u30EB\u691C\u7D22\u30C4\u30FC\u30EB\u306B\u6E21\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  ),
  inputSchema: getAreaClassInput,
  async handler(_args, config) {
    const raw = await rakutenRequest(
      { host: HOST_OPENAPI, path: "/engine/api/Travel/GetAreaClass/20140210", params: {} },
      config
    );
    const larges = (raw.areaClasses?.largeClasses ?? []).map((wL) => {
      const L = wL.largeClass;
      return {
        code: L.largeClassCode ?? "",
        name: L.largeClassName ?? "",
        middles: (L.middleClasses ?? []).map((wM) => {
          const M = wM.middleClass;
          return {
            code: M.middleClassCode ?? "",
            name: M.middleClassName ?? "",
            smalls: (M.smallClasses ?? []).map((wS) => {
              const S = wS.smallClass;
              return {
                code: S.smallClassCode ?? "",
                name: S.smallClassName ?? "",
                details: (S.detailClasses ?? []).map((wD) => ({
                  code: wD.detailClass.detailClassCode ?? "",
                  name: wD.detailClass.detailClassName ?? ""
                }))
              };
            })
          };
        })
      };
    });
    return { larges };
  }
};
var keywordHotelSearchInput = z5.object({
  keyword: z5.string().min(2).describe("Free-text keyword (min 2 characters). \u30D5\u30EA\u30FC\u30AD\u30FC\u30EF\u30FC\u30C9(2\u6587\u5B57\u4EE5\u4E0A)\u3002"),
  hits: z5.number().int().min(1).max(30).default(10).describe("Results per page. \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z5.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002")
});
var travelKeywordHotelSearchTool = {
  name: "travel_keyword_hotel_search",
  title: bilingual("Search Rakuten Travel Hotels (by Keyword)", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u3067\u30DB\u30C6\u30EB\u3092\u30AD\u30FC\u30EF\u30FC\u30C9\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Travel hotels by free-text keyword (hotel name, area name, landmark). Returns the same Hotel shape as travel_simple_hotel_search. Useful when you don't know the area code.",
    "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u3092\u30D5\u30EA\u30FC\u30AD\u30FC\u30EF\u30FC\u30C9(\u30DB\u30C6\u30EB\u540D\u3001\u30A8\u30EA\u30A2\u540D\u3001\u30E9\u30F3\u30C9\u30DE\u30FC\u30AF)\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u304C\u5206\u304B\u3089\u306A\u3044\u3068\u304D\u306B\u6709\u7528\u3067\u3059\u3002"
  ),
  inputSchema: keywordHotelSearchInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Travel/KeywordHotelSearch/20170426",
        params: { keyword: args.keyword, hits: String(args.hits), page: String(args.page) }
      },
      config
    );
    return mapPagedHotels(raw, args.page);
  }
};
var getHotelChainListInput = z5.object({});
var travelGetHotelChainListTool = {
  name: "travel_get_hotel_chain_list",
  title: bilingual("Get Rakuten Travel Hotel Chains", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u30C1\u30A7\u30FC\u30F3\u4E00\u89A7"),
  description: bilingual(
    "List all Rakuten Travel hotel chains (Marriott, APA, Hilton, Toyoko Inn, etc.) with their codes. Useful for filtering or grouping search results by chain.",
    "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306B\u767B\u9332\u3055\u308C\u3066\u3044\u308B\u5168\u30DB\u30C6\u30EB\u30C1\u30A7\u30FC\u30F3(\u30DE\u30EA\u30AA\u30C3\u30C8\u3001APA\u3001\u30D2\u30EB\u30C8\u30F3\u3001\u6771\u6A2AINN\u7B49)\u3068\u30B3\u30FC\u30C9\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: getHotelChainListInput,
  async handler(_args, config) {
    const raw = await rakutenRequest(
      { host: HOST_OPENAPI, path: "/engine/api/Travel/GetHotelChainList/20131024", params: {} },
      config
    );
    const chains = [];
    for (const wL of raw.largeClasses ?? []) {
      for (const blk of wL.largeClass ?? []) {
        for (const wC of blk.hotelChains ?? []) {
          const c = wC.hotelChain;
          chains.push({
            code: c.hotelChainCode ?? "",
            name: c.hotelChainName ?? "",
            nameKana: c.hotelChainNameKana,
            comment: c.hotelChainComment || void 0,
            largeClassCode: blk.largeClassCode
          });
        }
      }
    }
    return { chains };
  }
};
var TRAVEL_RANKING_GENRES = [
  "all",
  "onsen",
  "ryokan",
  "city",
  "resort",
  "businesshotel",
  "pension",
  "publichouse"
];
var hotelRankingInput = z5.object({
  genre: z5.enum(TRAVEL_RANKING_GENRES).default("all").describe(
    "Ranking genre. 'all' is overall; others narrow by hotel type. \u30E9\u30F3\u30AD\u30F3\u30B0\u7A2E\u5225\u3002'all' \u306F\u7DCF\u5408\u3001\u4ED6\u306F\u30BF\u30A4\u30D7\u5225\u3002"
  )
});
var travelHotelRankingTool = {
  name: "travel_hotel_ranking",
  title: bilingual("Get Rakuten Travel Hotel Ranking", "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u30E9\u30F3\u30AD\u30F3\u30B0"),
  description: bilingual(
    "Get the top-ranked hotels on Rakuten Travel, overall or by ranking genre (onsen, ryokan, city, resort, businesshotel, pension, publichouse). Returns ranked hotels with rank, name, area, review stats, and information URLs.",
    "\u697D\u5929\u30C8\u30E9\u30D9\u30EB\u306E\u30DB\u30C6\u30EB\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002'all'(\u7DCF\u5408)\u3001\u307E\u305F\u306F\u6E29\u6CC9/\u65C5\u9928/\u30B7\u30C6\u30A3/\u30EA\u30BE\u30FC\u30C8/\u30D3\u30B8\u30CD\u30B9/\u30DA\u30F3\u30B7\u30E7\u30F3/\u516C\u5171\u306E\u5BBF\u3067\u30BF\u30A4\u30D7\u5225\u306B\u7D5E\u308A\u8FBC\u3081\u307E\u3059\u3002\u9806\u4F4D\u3001\u30DB\u30C6\u30EB\u540D\u3001\u30A8\u30EA\u30A2\u3001\u30EC\u30D3\u30E5\u30FC\u3001URL\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: hotelRankingInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Travel/HotelRanking/20170426",
        params: { genre: args.genre }
      },
      config
    );
    const block = raw.Rankings?.[0]?.Ranking;
    return {
      genre: block?.genre ?? args.genre,
      title: block?.title ?? "",
      lastBuildDate: block?.lastBuildDate ?? "",
      hotels: (block?.hotels ?? []).map((w) => {
        const h = w.hotel;
        return {
          rank: h.rank ?? 0,
          hotelNo: h.hotelNo ?? 0,
          hotelName: h.hotelName ?? "",
          hotelInformationUrl: h.hotelInformationUrl,
          planListUrl: h.planListUrl,
          imageUrl: h.hotelImageUrl,
          thumbnailUrl: h.hotelThumbnailUrl,
          area: h.middleClassName,
          reviewCount: h.reviewCount ?? 0,
          reviewAverage: h.reviewAverage ?? 0
        };
      })
    };
  }
};

// src/tools/recipe.ts
import { z as z6 } from "zod";
var categoryListInput = z6.object({
  level: z6.enum(["all", "large", "medium", "small"]).default("all").describe(
    "Which depth(s) to return. 'all' returns the full tree (~2000 categories, ~430KB). Use 'large' for the 43 top-level categories only. \u53D6\u5F97\u968E\u5C64\u3002'all' \u306F\u5168\u968E\u5C64(\u7D042000\u30AB\u30C6\u30B4\u30EA\u3001430KB)\u3001'large' \u306F\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB43\u4EF6\u306E\u307F\u3002"
  )
});
var recipeCategoryListTool = {
  name: "recipe_category_list",
  title: bilingual("List Rakuten Recipe Categories", "\u697D\u5929\u30EC\u30B7\u30D4\u306E\u30AB\u30C6\u30B4\u30EA\u4E00\u89A7"),
  description: bilingual(
    "Get the full Rakuten Recipe category hierarchy (43 large \u2192 ~540 medium \u2192 ~1500 small categories). Each category has a categoryId, name, and URL on recipe.rakuten.co.jp. Use 'large' depth when you only need the top-level menu (much smaller payload). Medium and small categories include parentCategoryId for tree assembly.",
    "\u697D\u5929\u30EC\u30B7\u30D4\u306E\u30AB\u30C6\u30B4\u30EA\u968E\u5C64(43\u5927\u30AB\u30C6\u30B4\u30EA\u2192\u7D04540\u4E2D\u30AB\u30C6\u30B4\u30EA\u2192\u7D041500\u5C0F\u30AB\u30C6\u30B4\u30EA)\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002\u5404\u30AB\u30C6\u30B4\u30EA\u306BID\u3001\u540D\u524D\u3001recipe.rakuten.co.jp \u306EURL\u304C\u4ED8\u304D\u307E\u3059\u3002\u30C8\u30C3\u30D7\u30EC\u30D9\u30EB\u3060\u3051\u5FC5\u8981\u306A\u5834\u5408\u306F 'large' \u3092\u6307\u5B9A(\u30DA\u30A4\u30ED\u30FC\u30C9\u5927\u5E45\u5C0F)\u3002\u4E2D\u30FB\u5C0F\u306B\u306F parentCategoryId \u304C\u4ED8\u4E0E\u3055\u308C\u307E\u3059\u3002"
  ),
  inputSchema: categoryListInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/recipems/api/Recipe/CategoryList/20170426",
        params: {}
      },
      config
    );
    const r = raw.result ?? {};
    const large = (r.large ?? []).map((c) => ({
      categoryId: String(c.categoryId ?? ""),
      categoryName: c.categoryName ?? "",
      categoryUrl: c.categoryUrl ?? ""
    }));
    const mapMS = (arr) => (arr ?? []).map((c) => ({
      categoryId: String(c.categoryId ?? ""),
      categoryName: c.categoryName ?? "",
      categoryUrl: c.categoryUrl ?? "",
      parentCategoryId: String(c.parentCategoryId ?? "")
    }));
    const result = {
      large: args.level === "all" || args.level === "large" ? large : [],
      medium: args.level === "all" || args.level === "medium" ? mapMS(r.medium) : [],
      small: args.level === "all" || args.level === "small" ? mapMS(r.small) : []
    };
    return result;
  }
};
var categoryRankingInput = z6.object({
  categoryId: z6.string().min(1).describe(
    "Category ID to rank within. Pass a large/medium/small categoryId from recipe_category_list. \u30E9\u30F3\u30AD\u30F3\u30B0\u5BFE\u8C61\u306E\u30AB\u30C6\u30B4\u30EAID(recipe_category_list \u306E large/medium/small \u304B\u3089\u53D6\u5F97)\u3002"
  )
});
var recipeCategoryRankingTool = {
  name: "recipe_category_ranking",
  title: bilingual("Get Rakuten Recipe Category Ranking", "\u697D\u5929\u30EC\u30B7\u30D4\u306E\u30AB\u30C6\u30B4\u30EA\u30E9\u30F3\u30AD\u30F3\u30B0"),
  description: bilingual(
    "Get the top recipes in a Rakuten Recipe category. Returns ranked recipes with title, ingredient list, cooking time (indication), cost estimate, image URLs, author nickname, and a direct URL to recipe.rakuten.co.jp. Use recipe_category_list to find category IDs.",
    "\u6307\u5B9A\u30AB\u30C6\u30B4\u30EA\u306E\u697D\u5929\u30EC\u30B7\u30D4\u4EBA\u6C17\u30E9\u30F3\u30AD\u30F3\u30B0\u3092\u53D6\u5F97\u3057\u307E\u3059\u3002\u9806\u4F4D\u3001\u30BF\u30A4\u30C8\u30EB\u3001\u6750\u6599\u4E00\u89A7\u3001\u8ABF\u7406\u6642\u9593\u76EE\u5B89\u3001\u8CBB\u7528\u76EE\u5B89\u3001\u753B\u50CF\u3001\u6295\u7A3F\u8005\u30CB\u30C3\u30AF\u30CD\u30FC\u30E0\u3001\u30EC\u30B7\u30D4URL\u3092\u8FD4\u3057\u307E\u3059\u3002\u30AB\u30C6\u30B4\u30EAID\u306F recipe_category_list \u3067\u53D6\u5F97\u3002"
  ),
  inputSchema: categoryRankingInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/recipems/api/Recipe/CategoryRanking/20170426",
        params: { categoryId: args.categoryId }
      },
      config
    );
    return {
      categoryId: args.categoryId,
      recipes: (raw.result ?? []).map((r) => ({
        rank: typeof r.rank === "string" ? Number(r.rank) : r.rank ?? 0,
        recipeId: r.recipeId ?? 0,
        recipeTitle: r.recipeTitle ?? "",
        recipeUrl: r.recipeUrl ?? "",
        recipeDescription: r.recipeDescription,
        recipeMaterial: r.recipeMaterial ?? [],
        recipeIndication: r.recipeIndication,
        recipeCost: r.recipeCost,
        recipePublishday: r.recipePublishday,
        foodImageUrl: r.foodImageUrl,
        mediumImageUrl: r.mediumImageUrl,
        smallImageUrl: r.smallImageUrl,
        nickname: r.nickname,
        shop: r.shop,
        pickup: r.pickup
      }))
    };
  }
};

// src/tools/kobo.ts
import { z as z7 } from "zod";
var KOBO_SORT_OPTIONS = [
  "standard",
  "sales",
  "+releaseDate",
  "-releaseDate",
  "+itemPrice",
  "-itemPrice",
  "reviewCount",
  "reviewAverage"
];
var ebookSearchInput = z7.object({
  keyword: z7.string().optional().describe("Free-text keyword. \u30AD\u30FC\u30EF\u30FC\u30C9\u3002"),
  title: z7.string().optional().describe("Title (partial match). \u30BF\u30A4\u30C8\u30EB(\u90E8\u5206\u4E00\u81F4)\u3002"),
  author: z7.string().optional().describe("Author name. \u8457\u8005\u540D\u3002"),
  publisherName: z7.string().optional().describe("Publisher name. \u51FA\u7248\u793E\u3002"),
  koboGenreId: z7.string().optional().describe("Restrict to a Kobo genre ID. Use kobo_genre_search to discover. \u30B8\u30E3\u30F3\u30EBID\u3067\u7D5E\u308A\u8FBC\u307F\u3002"),
  hits: z7.number().int().min(1).max(30).default(10).describe("Results per page. \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z7.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002"),
  sort: z7.enum(KOBO_SORT_OPTIONS).default("standard").describe("Sort order. \u4E26\u3073\u9806\u3002")
}).refine(
  (v) => v.keyword || v.title || v.author || v.publisherName || v.koboGenreId,
  { message: "At least one of keyword/title/author/publisherName/koboGenreId is required. \u3044\u305A\u308C\u304B\u5FC5\u9808\u3002" }
);
function mapKoboItem(r) {
  return {
    title: r.title ?? "",
    subTitle: r.subTitle || void 0,
    seriesName: r.seriesName || void 0,
    author: r.author || void 0,
    publisherName: r.publisherName,
    itemPrice: r.itemPrice ?? 0,
    itemUrl: r.itemUrl ?? "",
    itemNumber: r.itemNumber,
    itemCaption: r.itemCaption,
    salesDate: r.salesDate,
    salesType: r.salesType,
    koboGenreId: r.koboGenreId,
    language: r.language,
    reviewCount: r.reviewCount ?? 0,
    reviewAverage: r.reviewAverage ?? 0,
    imageUrl: r.mediumImageUrl ?? r.largeImageUrl ?? r.smallImageUrl
  };
}
var koboEbookSearchTool = {
  name: "kobo_ebook_search",
  title: bilingual("Search Rakuten Kobo eBooks", "\u697D\u5929Kobo\u3067\u96FB\u5B50\u66F8\u7C4D\u3092\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten Kobo's eBook catalogue by keyword, title, author, publisher, or genre. Returns eBook details with title, series, author, publisher, price, sale URL, language code, image URL, and review stats. Pass at least one search field.",
    "\u697D\u5929Kobo\u96FB\u5B50\u66F8\u7C4D\u30AB\u30BF\u30ED\u30B0\u3092\u3001\u30AD\u30FC\u30EF\u30FC\u30C9/\u30BF\u30A4\u30C8\u30EB/\u8457\u8005/\u51FA\u7248\u793E/\u30B8\u30E3\u30F3\u30EB\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u30BF\u30A4\u30C8\u30EB\u3001\u30B7\u30EA\u30FC\u30BA\u3001\u8457\u8005\u3001\u51FA\u7248\u793E\u3001\u4FA1\u683C\u3001\u8CFC\u5165URL\u3001\u8A00\u8A9E\u3001\u753B\u50CF\u3001\u30EC\u30D3\u30E5\u30FC\u3092\u542B\u3080\u66F8\u7C4D\u8A73\u7D30\u3092\u8FD4\u3057\u307E\u3059\u3002\u691C\u7D22\u6761\u4EF6\u306F1\u3064\u4EE5\u4E0A\u5FC5\u9808\u3002"
  ),
  inputSchema: ebookSearchInput,
  async handler(args, config) {
    const params = {
      hits: String(args.hits),
      page: String(args.page),
      sort: args.sort
    };
    if (args.keyword) params.keyword = args.keyword;
    if (args.title) params.title = args.title;
    if (args.author) params.author = args.author;
    if (args.publisherName) params.publisherName = args.publisherName;
    if (args.koboGenreId) params.koboGenreId = args.koboGenreId;
    const raw = await rakutenRequest(
      { host: HOST_OPENAPI, path: "/services/api/Kobo/EbookSearch/20170426", params },
      config
    );
    return {
      count: raw.count ?? 0,
      page: raw.page ?? args.page,
      first: raw.first ?? 0,
      last: raw.last ?? 0,
      hits: raw.hits ?? args.hits,
      pageCount: raw.pageCount ?? 0,
      items: (raw.Items ?? []).map((w) => mapKoboItem(w.Item))
    };
  }
};
var genreSearchInput3 = z7.object({
  koboGenreId: z7.string().default("101").describe(
    "Kobo genre ID. Top-level is '101' (\u96FB\u5B50\u66F8\u7C4D). Drill down with returned child IDs. \u30B8\u30E3\u30F3\u30EBID\u3002\u30C8\u30C3\u30D7\u306F '101'(\u96FB\u5B50\u66F8\u7C4D)\u3002\u5B50ID\u3067\u6398\u308A\u4E0B\u3052\u3002"
  )
});
function mapKoboGenre(raw) {
  return {
    koboGenreId: String(raw?.koboGenreId ?? ""),
    koboGenreName: raw?.koboGenreName ?? "",
    genreLevel: raw?.genreLevel ?? 0
  };
}
var koboGenreSearchTool = {
  name: "kobo_genre_search",
  title: bilingual("Browse Rakuten Kobo Genres", "\u697D\u5929Kobo\u306E\u30B8\u30E3\u30F3\u30EB\u3092\u53C2\u7167"),
  description: bilingual(
    "Browse the Rakuten Kobo eBook genre hierarchy. Top-level is '101' (\u96FB\u5B50\u66F8\u7C4D). Pass a child genre ID returned by this tool to drill down. Returns the current genre, its ancestors, and its direct children \u2014 useful for narrowing kobo_ebook_search results.",
    "\u697D\u5929Kobo\u306E\u30B8\u30E3\u30F3\u30EB\u968E\u5C64\u3092\u53C2\u7167\u3057\u307E\u3059\u3002\u6700\u4E0A\u4F4D\u306F '101'(\u96FB\u5B50\u66F8\u7C4D)\u3002\u5B50ID\u3092\u6E21\u3057\u3066\u6398\u308A\u4E0B\u3052\u53EF\u80FD\u3002\u73FE\u5728\u306E\u30B8\u30E3\u30F3\u30EB\u3001\u7956\u5148\u3001\u5B50\u30B8\u30E3\u30F3\u30EB\u3092\u8FD4\u3057\u307E\u3059\u3002kobo_ebook_search \u306E\u7D5E\u308A\u8FBC\u307F\u306B\u5229\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  ),
  inputSchema: genreSearchInput3,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/services/api/Kobo/GenreSearch/20131010",
        params: { koboGenreId: args.koboGenreId }
      },
      config
    );
    return {
      current: mapKoboGenre(raw.current),
      parents: (raw.parents ?? []).map((p) => mapKoboGenre(p.parent)),
      children: (raw.children ?? []).map((c) => mapKoboGenre(c.child))
    };
  }
};

// src/tools/gora.ts
import { z as z8 } from "zod";
function mapCourseSummary(r) {
  return {
    golfCourseId: r.golfCourseId ?? 0,
    golfCourseName: r.golfCourseName ?? "",
    golfCourseAbbr: r.golfCourseAbbr,
    golfCourseCaption: r.golfCourseCaption,
    address: r.address,
    prefecture: r.prefecture,
    highway: r.highway,
    ic: r.ic,
    icDistance: r.icDistance,
    latitude: r.latitude,
    longitude: r.longitude,
    evaluation: r.evaluation,
    ratingNum: r.ratingNum,
    imageUrl: r.golfCourseImageUrl,
    detailUrl: r.golfCourseDetailUrl,
    reserveCalUrl: r.reserveCalUrl
  };
}
var golfCourseSearchInput = z8.object({
  areaCode: z8.string().optional().describe(
    "Area code (e.g. '13' = Tokyo, '14' = Kanagawa, '23' = Aichi). Either areaCode or keyword is required. \u30A8\u30EA\u30A2\u30B3\u30FC\u30C9(\u4F8B: '13' \u6771\u4EAC\u3001'14' \u795E\u5948\u5DDD)\u3002areaCode \u307E\u305F\u306F keyword \u304C\u5FC5\u8981\u3002"
  ),
  keyword: z8.string().optional().describe(
    "Free-text keyword (course name, location). \u691C\u7D22\u30AD\u30FC\u30EF\u30FC\u30C9(\u30B3\u30FC\u30B9\u540D/\u30A8\u30EA\u30A2)\u3002"
  ),
  latitude: z8.number().optional().describe("Latitude. \u7DEF\u5EA6\u3002"),
  longitude: z8.number().optional().describe("Longitude. \u7D4C\u5EA6\u3002"),
  searchRange: z8.number().min(1).max(80).optional().describe(
    "Search radius in km (1\u201380) when using lat/lon. \u691C\u7D22\u534A\u5F84(km\u30011\u301C80)\u3002"
  ),
  hits: z8.number().int().min(1).max(30).default(10).describe("Results per page. \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z8.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002")
}).refine(
  (v) => Boolean(v.areaCode) || Boolean(v.keyword) || v.latitude !== void 0 && v.longitude !== void 0,
  { message: "Provide areaCode, keyword, or both latitude+longitude. areaCode / keyword / (latitude+longitude) \u306E\u3044\u305A\u308C\u304B\u5FC5\u8981\u3002" }
);
var goraGolfCourseSearchTool = {
  name: "gora_golf_course_search",
  title: bilingual("Search Rakuten GORA Golf Courses", "\u697D\u5929GORA\u3067\u30B4\u30EB\u30D5\u5834\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten GORA golf courses by area code, keyword, or coordinates. Returns each course with name, address, nearest highway IC, distance from IC, evaluation score, image URL, and a direct reservation calendar URL. Use gora_golf_course_detail for full information including plans, course layout, and facilities.",
    "\u697D\u5929GORA\u306E\u30B4\u30EB\u30D5\u5834\u3092\u3001\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9/\u30AD\u30FC\u30EF\u30FC\u30C9/\u5EA7\u6A19\u3067\u691C\u7D22\u3057\u307E\u3059\u3002\u30B3\u30FC\u30B9\u540D\u3001\u4F4F\u6240\u3001\u6700\u5BC4\u308AIC\u3001IC\u8DDD\u96E2\u3001\u8A55\u4FA1\u3001\u753B\u50CF\u3001\u4E88\u7D04\u30AB\u30EC\u30F3\u30C0\u30FCURL\u3092\u8FD4\u3057\u307E\u3059\u3002\u30D7\u30E9\u30F3\u8A73\u7D30\u3084\u30B3\u30FC\u30B9\u30EC\u30A4\u30A2\u30A6\u30C8\u7B49\u306E\u5168\u60C5\u5831\u306F gora_golf_course_detail \u3092\u4F7F\u7528\u3057\u3066\u304F\u3060\u3055\u3044\u3002"
  ),
  inputSchema: golfCourseSearchInput,
  async handler(args, config) {
    const params = {
      hits: String(args.hits),
      page: String(args.page)
    };
    if (args.areaCode) params.areaCode = args.areaCode;
    if (args.keyword) params.keyword = args.keyword;
    if (args.latitude !== void 0) params.latitude = String(args.latitude);
    if (args.longitude !== void 0) params.longitude = String(args.longitude);
    if (args.searchRange !== void 0) params.searchRange = String(args.searchRange);
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Gora/GoraGolfCourseSearch/20170623",
        params
      },
      config
    );
    return {
      count: raw.count ?? 0,
      page: raw.page ?? args.page,
      first: raw.first ?? 0,
      last: raw.last ?? 0,
      hits: raw.hits ?? args.hits,
      pageCount: raw.pageCount ?? 0,
      courses: (raw.Items ?? []).map((w) => mapCourseSummary(w.Item))
    };
  }
};
var golfCourseDetailInput = z8.object({
  golfCourseId: z8.number().int().positive().describe("Golf course ID (from gora_golf_course_search). \u30B4\u30EB\u30D5\u5834ID(\u691C\u7D22\u7D50\u679C\u304B\u3089\u53D6\u5F97)\u3002")
});
var goraGolfCourseDetailTool = {
  name: "gora_golf_course_detail",
  title: bilingual("Get Rakuten GORA Golf Course Detail", "\u697D\u5929GORA\u306E\u30B4\u30EB\u30D5\u5834\u8A73\u7D30\u3092\u53D6\u5F97"),
  description: bilingual(
    "Get full details for a Rakuten GORA golf course by ID \u2014 postal address, phone, designer, hole/par count, course distance, green type, dress code, practice/lodging/meal facilities, credit card acceptance, layout map URL, and weekday/holiday base prices. Use this after gora_golf_course_search to drill into a specific course.",
    "\u697D\u5929GORA\u306E\u30B4\u30EB\u30D5\u5834\u8A73\u7D30\u3092ID\u3067\u53D6\u5F97\u3057\u307E\u3059\u3002\u90F5\u4FBF\u756A\u53F7\u3001\u96FB\u8A71\u3001\u8A2D\u8A08\u8005\u3001\u30DB\u30FC\u30EB\u6570\u3001\u30D1\u30FC\u6570\u3001\u30B3\u30FC\u30B9\u8DDD\u96E2\u3001\u30B0\u30EA\u30FC\u30F3\u7A2E\u5225\u3001\u30C9\u30EC\u30B9\u30B3\u30FC\u30C9\u3001\u7DF4\u7FD2\u5834/\u5BBF\u6CCA/\u98DF\u4E8B/\u30AF\u30EC\u30B8\u30C3\u30C8\u30AB\u30FC\u30C9\u53EF\u5426\u3001\u30EC\u30A4\u30A2\u30A6\u30C8URL\u3001\u5E73\u65E5/\u4F11\u65E5\u306E\u57FA\u6E96\u6700\u5B89\u5024\u3092\u8FD4\u3057\u307E\u3059\u3002"
  ),
  inputSchema: golfCourseDetailInput,
  async handler(args, config) {
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Gora/GoraGolfCourseDetail/20170623",
        params: { golfCourseId: String(args.golfCourseId) }
      },
      config
    );
    const r = raw.Item ?? {};
    const summary = mapCourseSummary(r);
    const imageUrls = [
      r.golfCourseImageUrl1,
      r.golfCourseImageUrl2,
      r.golfCourseImageUrl3,
      r.golfCourseImageUrl4,
      r.golfCourseImageUrl5
    ].filter((u) => Boolean(u));
    return {
      ...summary,
      postalCode: r.postalCode,
      telephoneNo: r.telephoneNo,
      faxNo: r.faxNo,
      imageUrls,
      openDay: r.openDay,
      closeDay: r.closeDay,
      designer: r.designer,
      holeCount: r.holeCount,
      parCount: r.parCount,
      courseDistance: r.courseDistance,
      courseType: r.courseType,
      fairway: r.fairway,
      green: r.green,
      greenCount: r.greenCount,
      practiceFacility: r.practiceFacility,
      lodgingFacility: r.lodgingFacility,
      facility: r.facility,
      meal: r.meal,
      creditCard: r.creditCard,
      costPerformance: r.costperformance,
      dressCode: r.dressCode,
      layoutUrl: r.layoutUrl,
      routeMapUrl: r.routeMapUrl,
      baseWeekdayMinPrice: r.baseWeekdayMinPrice,
      baseHolidayMinPrice: r.baseHolidayMinPrice,
      weekdayMinPrice: r.weekdayMinPrice,
      holidayMinPrice: r.holidayMinPrice
    };
  }
};
var planSearchInput = z8.object({
  areaCode: z8.string().optional().describe("Area code (e.g. '13' = Tokyo). \u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u3002"),
  playDate: z8.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Format: YYYY-MM-DD").describe("Play date (YYYY-MM-DD). \u30D7\u30EC\u30FC\u65E5(YYYY-MM-DD)\u3002"),
  golfCourseId: z8.number().int().positive().optional().describe("Restrict to a specific course. \u7279\u5B9A\u306E\u30B4\u30EB\u30D5\u5834\u3067\u7D5E\u308A\u8FBC\u307F\u3002"),
  playerNum: z8.number().int().min(1).max(4).optional().describe("Number of players (1\u20134). \u30D7\u30EC\u30A4\u30E4\u30FC\u6570\u3002"),
  budget: z8.number().int().positive().optional().describe("Max budget per player (JPY). 1\u4EBA\u3042\u305F\u308A\u306E\u4E88\u7B97\u4E0A\u9650(\u5186)\u3002"),
  hits: z8.number().int().min(1).max(30).default(10).describe("Results per page. \u53D6\u5F97\u4EF6\u6570\u3002"),
  page: z8.number().int().min(1).max(100).default(1).describe("Page number. \u30DA\u30FC\u30B8\u756A\u53F7\u3002")
}).refine(
  (v) => Boolean(v.areaCode) || v.golfCourseId !== void 0,
  { message: "Provide either areaCode or golfCourseId. areaCode \u304B golfCourseId \u304C\u5FC5\u8981\u3002" }
);
function mapPlan(raw) {
  return {
    planId: raw.planId !== void 0 ? String(raw.planId) : void 0,
    planName: raw.planName,
    basePrice: raw.basePrice,
    price: raw.price,
    cart: raw.cart,
    caddie: raw.caddie,
    lunch: raw.lunch,
    drink: raw.drink,
    round: raw.round,
    startTimeZone: raw.startTimeZone,
    playerNumMin: raw.playerNumMin,
    playerNumMax: raw.playerNumMax,
    point: raw.point,
    isStay: Boolean(raw.stay && raw.stay !== "")
  };
}
var goraPlanSearchTool = {
  name: "gora_plan_search",
  title: bilingual("Search Rakuten GORA Reservation Plans", "\u697D\u5929GORA\u306E\u30D7\u30E9\u30F3\u691C\u7D22"),
  description: bilingual(
    "Search Rakuten GORA for available reservation plans on a specific play date. Returns each golf course together with its available plans (plan name, price per player, base price, cart/caddie/lunch/drink inclusions, start time zone, points). Filter by area code, specific golfCourseId, player count, or budget cap. Use this to compare options across courses before reserving.",
    "\u6307\u5B9A\u306E\u30D7\u30EC\u30FC\u65E5\u306B\u304A\u3051\u308B\u697D\u5929GORA\u306E\u4E88\u7D04\u53EF\u80FD\u30D7\u30E9\u30F3\u3092\u691C\u7D22\u3057\u307E\u3059\u3002\u5404\u30B4\u30EB\u30D5\u5834\u3068\u5229\u7528\u53EF\u80FD\u30D7\u30E9\u30F3(\u30D7\u30E9\u30F3\u540D\u30011\u4EBA\u3042\u305F\u308A\u306E\u4FA1\u683C\u3001\u57FA\u6E96\u4FA1\u683C\u3001\u30AB\u30FC\u30C8/\u30AD\u30E3\u30C7\u30A3/\u663C\u98DF/\u30C9\u30EA\u30F3\u30AF\u306E\u4ED8\u5E2F\u3001\u30B9\u30BF\u30FC\u30C8\u6642\u9593\u5E2F\u3001\u30DD\u30A4\u30F3\u30C8)\u3092\u8FD4\u3057\u307E\u3059\u3002\u30A8\u30EA\u30A2\u30B3\u30FC\u30C9\u3001\u30B4\u30EB\u30D5\u5834ID\u3001\u30D7\u30EC\u30A4\u30E4\u30FC\u6570\u3001\u4E88\u7B97\u3067\u7D5E\u308A\u8FBC\u307F\u53EF\u80FD\u3002"
  ),
  inputSchema: planSearchInput,
  async handler(args, config) {
    const params = {
      playDate: args.playDate,
      hits: String(args.hits),
      page: String(args.page)
    };
    if (args.areaCode) params.areaCode = args.areaCode;
    if (args.golfCourseId !== void 0) params.golfCourseId = String(args.golfCourseId);
    if (args.playerNum !== void 0) params.playerNum = String(args.playerNum);
    if (args.budget !== void 0) params.budget = String(args.budget);
    const raw = await rakutenRequest(
      {
        host: HOST_OPENAPI,
        path: "/engine/api/Gora/GoraPlanSearch/20170623",
        params
      },
      config
    );
    return {
      count: raw.count ?? 0,
      page: raw.page ?? args.page,
      first: raw.first ?? 0,
      last: raw.last ?? 0,
      hits: raw.hits ?? args.hits,
      pageCount: raw.pageCount ?? 0,
      courses: (raw.Items ?? []).map((w) => {
        const summary = mapCourseSummary(w.Item);
        return {
          ...summary,
          displayWeekdayMinPrice: w.Item.displayWeekdayMinPrice,
          displayHolidayMinPrice: w.Item.displayHolidayMinPrice,
          cancelFee: w.Item.cancelFee,
          plans: (w.Item.planInfo ?? []).map((p) => mapPlan(p.plan))
        };
      })
    };
  }
};

// src/tools/index.ts
var tools = [
  // Ichiba tools (5 of 5 — complete)
  // Note: AttributeSearch and Item Review do NOT exist on Rakuten's API as of
  // 2026-06-04 (verified via direct probes). Both return "Operation X doesn't
  // exist" — they appeared in third-party docs but are not real endpoints.
  ichibaItemSearchTool,
  ichibaGenreSearchTool,
  ichibaTagSearchTool,
  ichibaItemRankingTool,
  ichibaProductSearchTool,
  // Books tools (9 of 9 — Week 2)
  booksTotalSearchTool,
  booksBookSearchTool,
  booksCDSearchTool,
  booksDVDSearchTool,
  booksForeignBookSearchTool,
  booksMagazineSearchTool,
  booksGameSearchTool,
  booksSoftwareSearchTool,
  booksGenreSearchTool,
  // Travel tools (7 of 7 — Week 2)
  travelSimpleHotelSearchTool,
  travelVacantHotelSearchTool,
  travelHotelDetailSearchTool,
  travelGetAreaClassTool,
  travelKeywordHotelSearchTool,
  travelGetHotelChainListTool,
  travelHotelRankingTool,
  // Recipe tools (2 of 2 — Week 3)
  recipeCategoryListTool,
  recipeCategoryRankingTool,
  // Kobo tools (2 of 2 — Week 3)
  koboEbookSearchTool,
  koboGenreSearchTool,
  // GORA tools (3 of 3 — Week 3)
  goraGolfCourseSearchTool,
  goraGolfCourseDetailTool,
  goraPlanSearchTool
];

// src/tools/meta.ts
var READONLY = {
  readOnlyHint: true,
  idempotentHint: true,
  openWorldHint: true
};
var ACRONYMS = /* @__PURE__ */ new Set(["id", "url", "api", "isbn", "jan", "ng", "uuid", "sdk", "ng"]);
function titleFromKey(key) {
  return key.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/[_-]+/g, " ").split(/\s+/).filter(Boolean).map(
    (w) => ACRONYMS.has(w.toLowerCase()) ? w.toUpperCase() : w.charAt(0).toUpperCase() + w.slice(1)
  ).join(" ");
}
function withParamTitles(shape) {
  return Object.fromEntries(
    Object.entries(shape).map(([key, field]) => [
      key,
      field.meta({ title: titleFromKey(key) })
    ])
  );
}

// src/server.ts
var SERVER_NAME = "rakuten-mcp";
var SERVER_VERSION = "1.1.0";
var SERVER_INSTRUCTIONS = `rakuten-mcp exposes the public Rakuten Web Service as MCP tools across six families: Ichiba (e-commerce), Books, Travel (hotels), Recipe, Kobo (eBooks), and GORA (golf).

All tools are READ-ONLY. There are no money-moving operations.

Auth: set RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY (free at https://webservice.rakuten.co.jp/). Optionally set RAKUTEN_AFFILIATE_ID to append affiliate links.

When tools error with rate limits, the server retries automatically with exponential backoff (max 3 retries by default; override with RAKUTEN_MAX_RETRIES).

Tool naming: every tool is prefixed by its API family \u2014 ichiba_*, books_*, travel_*, recipe_*, kobo_*, gora_*.

Bilingual: every tool description is provided in English (primary) and Japanese ([JA]). Use whichever the user prefers.

Ichiba value comparison: when the user asks for cheapest deals, per-unit price, shipping-inclusive totals, or phrases like \u9001\u6599\u8FBC\u307F / \u30B3\u30B9\u30D1 / \u5B89\u3044\u9806 / \u6700\u5B89 on Rakuten Ichiba products, prefer the compare_ichiba_value PROMPT over calling ichiba_item_search alone. That prompt chains API search with web shipping verification on finalists.`;
function buildServer() {
  const capabilities = { tools: {} };
  if (prompts.length > 0) capabilities.prompts = {};
  if (resources.length > 0) capabilities.resources = {};
  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION
    },
    {
      capabilities,
      instructions: SERVER_INSTRUCTIONS
    }
  );
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title.en,
        description: `${tool.description.en}

[JA] ${tool.description.ja}`,
        inputSchema: withParamTitles(tool.inputSchema.shape),
        annotations: READONLY
      },
      async (rawArgs) => {
        try {
          const config = tryLoadConfig();
          if (!config) {
            return {
              isError: true,
              content: [
                {
                  type: "text",
                  text: `Configuration error: RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY must be set.

[JA] \u8A2D\u5B9A\u30A8\u30E9\u30FC: RAKUTEN_APP_ID \u3068 RAKUTEN_ACCESS_KEY \u3092\u8A2D\u5B9A\u3057\u3066\u304F\u3060\u3055\u3044\u3002`
                }
              ]
            };
          }
          const parsed = tool.inputSchema.parse(rawArgs);
          const result = await tool.handler(parsed, config);
          return {
            content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
          };
        } catch (err) {
          if (err instanceof RakutenError) {
            return {
              isError: true,
              content: [{ type: "text", text: err.toToolError() }]
            };
          }
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [
              {
                type: "text",
                text: `Unexpected error in ${tool.name}: ${message}`
              }
            ]
          };
        }
      }
    );
  }
  for (const prompt of prompts) {
    const argsSchema = Object.fromEntries(
      Object.entries(buildPromptArgsSchema(prompt.arguments)).map(([name, schema]) => {
        const arg = prompt.arguments?.find((a) => a.name === name);
        return [
          name,
          schema.describe(`${arg?.description.en ?? ""} ${arg?.description.ja ?? ""}`.trim())
        ];
      })
    );
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title.en,
        description: `${prompt.description.en}

[JA] ${prompt.description.ja}`,
        argsSchema
      },
      async (args) => {
        const text = prompt.build(args);
        return {
          messages: [
            {
              role: "user",
              content: { type: "text", text: text.en }
            }
          ]
        };
      }
    );
  }
  for (const resource of resources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title.en,
        description: `${resource.description.en}

[JA] ${resource.description.ja}`,
        mimeType: resource.mimeType
      },
      async (uri) => {
        const config = tryLoadConfig();
        if (!config) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: resource.mimeType,
                text: "Configuration error: credentials not set."
              }
            ]
          };
        }
        const text = await resource.read(config);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: resource.mimeType,
              text
            }
          ]
        };
      }
    );
  }
  return server;
}

// src/transports/http.ts
function gateRequest(headers, config) {
  const host = headers.host?.split(":")[0]?.toLowerCase() ?? "";
  const allowedHosts = /* @__PURE__ */ new Set([
    config.httpHost.toLowerCase(),
    "127.0.0.1",
    "localhost",
    "[::1]",
    "::1"
  ]);
  if (host && !allowedHosts.has(host)) {
    return { ok: false, status: 403, reason: `Host '${host}' not allowed` };
  }
  if (headers.origin) {
    const lowerOrigin = headers.origin.toLowerCase();
    const allowedOrigins = config.httpAllowedOrigins.map((o) => o.toLowerCase());
    const isLocalhost = /^https?:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?$/.test(lowerOrigin);
    if (!isLocalhost && !allowedOrigins.includes(lowerOrigin)) {
      return { ok: false, status: 403, reason: `Origin '${headers.origin}' not allowed` };
    }
  }
  if (config.httpAuthToken) {
    const header = headers.authorization ?? "";
    if (!header.startsWith("Bearer ")) {
      return { ok: false, status: 401, reason: "Missing Bearer token" };
    }
    const presented = header.slice("Bearer ".length).trim();
    if (presented !== config.httpAuthToken) {
      return { ok: false, status: 401, reason: "Invalid Bearer token" };
    }
  }
  return { ok: true };
}
async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(Buffer.from(chunk));
  }
  if (chunks.length === 0) return void 0;
  const raw = Buffer.concat(chunks).toString("utf8");
  if (raw.length === 0) return void 0;
  try {
    return JSON.parse(raw);
  } catch {
    return void 0;
  }
}
async function runHttp(config) {
  if (isPubliclyBound(config.httpHost) && !config.httpAuthToken) {
    console.error(
      `Refusing to bind to ${config.httpHost} without MCP_HTTP_AUTH_TOKEN set.
Either bind to 127.0.0.1 (the default), or set MCP_HTTP_AUTH_TOKEN to require authentication.`
    );
    process.exit(2);
  }
  const httpServer = createServer(async (req, res) => {
    const headers = {
      host: typeof req.headers.host === "string" ? req.headers.host : void 0,
      origin: typeof req.headers.origin === "string" ? req.headers.origin : void 0,
      authorization: typeof req.headers.authorization === "string" ? req.headers.authorization : void 0
    };
    const gate = gateRequest(headers, {
      httpHost: config.httpHost,
      httpAuthToken: config.httpAuthToken,
      httpAllowedOrigins: config.httpAllowedOrigins
    });
    if (!gate.ok) {
      respondJson(res, gate.status ?? 403, {
        error: gate.reason ?? "Forbidden"
      });
      return;
    }
    const body = await readJsonBody(req);
    const transport = new StreamableHTTPServerTransport({
      sessionIdGenerator: void 0
    });
    const mcpServer = buildServer();
    try {
      await mcpServer.connect(transport);
      await transport.handleRequest(req, res, body);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (!res.headersSent) {
        respondJson(res, 500, { error: `Internal server error: ${message}` });
      } else {
        console.error(`HTTP transport error after response started: ${message}`);
      }
    } finally {
      try {
        await transport.close();
      } catch {
      }
    }
  });
  await new Promise((resolve) => {
    httpServer.listen(config.httpPort, config.httpHost, () => {
      console.error(
        `${SERVER_NAME} v${SERVER_VERSION} running on http://${config.httpHost}:${config.httpPort}`
      );
      if (!config.httpAuthToken) {
        console.error(
          `Warning: no MCP_HTTP_AUTH_TOKEN set. Server is only safe on localhost binding.`
        );
      }
      resolve();
    });
  });
  const shutdown = () => {
    console.error("Shutting down HTTP server...");
    httpServer.close(() => {
      process.exit(0);
    });
    setTimeout(() => process.exit(0), 5e3).unref();
  };
  process.once("SIGINT", shutdown);
  process.once("SIGTERM", shutdown);
}
function respondJson(res, status, payload) {
  if (res.headersSent) return;
  const body = JSON.stringify(payload);
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Content-Length", Buffer.byteLength(body));
  res.end(body);
}

// src/transports/stdio.ts
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
async function runStdio() {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error(`${SERVER_NAME} v${SERVER_VERSION} running on stdio`);
}

// src/index.ts
async function main() {
  const cliOverride = parseCliTransport(process.argv.slice(2));
  const config = tryLoadConfig();
  const transport = cliOverride.transport ?? config?.transport ?? "stdio";
  if (transport === "http") {
    const httpConfig = loadConfig();
    if (cliOverride.httpPort !== void 0) {
      httpConfig.httpPort = cliOverride.httpPort;
    }
    await runHttp(httpConfig);
    return;
  }
  await runStdio();
}
main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`Fatal error: ${message}`);
  process.exit(1);
});
