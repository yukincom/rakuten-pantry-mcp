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
    const priceFilterJa = maxPrice ? `\u5546\u54C1\u4FA1\u683C\u4E0A\u9650: ${maxPrice}\u5186 (ichiba_item_search \u306E max_price \u306B\u6E21\u3059)\u3002` : "\u30E6\u30FC\u30B6\u30FC\u6307\u5B9A\u304C\u306A\u3051\u308C\u3070\u4FA1\u683C\u4E0A\u9650\u306A\u3057\u3002";
    return {
      text: `\u697D\u5929\u5E02\u5834\u3067\u30B3\u30B9\u30D1\uFF08\u5358\u4FA1\uFF09\u6700\u5B89\u306E\u5546\u54C1\u3092\u63A2\u3057\u3066\u304F\u3060\u3055\u3044\u3002

\u30AD\u30FC\u30EF\u30FC\u30C9: ${keyword}
${priceFilterJa}
\u9001\u6599\u30A6\u30A7\u30D6\u78BA\u8A8D\u3059\u308B\u4E0A\u4F4D\u4EF6\u6570: ${finalists}

\u624B\u9806:

1. ichiba_item_search \u3092\u30AD\u30FC\u30EF\u30FC\u30C9${maxPrice ? `\u30FBmax_price=${maxPrice}` : ""}\u3067\u547C\u3076 (\u5FC5\u8981\u306A\u3089 hits=30)\u3002
2. unitPrice \u6607\u9806\u3067\u7C97\u30BD\u30FC\u30C8 (unitPrice \u4E0D\u660E\u306F\u30D1\u30C3\u30AF\u4FA1\u683C\u91CD\u8996\u6642\u306E\u307F\u8003\u616E)\u3002
3. \u4ED5\u5206\u3051:
   - shippingVerified=true \u304B\u3064 needsShippingRecheck \u304C\u7ACB\u3063\u3066\u3044\u306A\u3044: estimatedTotalPrice \u3092\u78BA\u5B9A\u5408\u8A08\u3001\u9001\u65990\u5186\u3002
   - shippingVerified=false \u307E\u305F\u306F needsShippingRecheck=true: \u30A6\u30A7\u30D6\u78BA\u8A8D\u304C\u5FC5\u8981(\u5F8C\u8005\u306FAPI\u306EpostageFlag\u8868\u8A18\u306B\u9F5F\u9F6C\u306E\u7591\u3044\u304C\u3042\u308B\u30B1\u30FC\u30B9\u3002\u4ED6\u5546\u54C1\u3088\u308AunitPrice\u304C\u4E0D\u81EA\u7136\u306B\u5B89\u3044)\u3002
4. \u8981\u78BA\u8A8D\u306E\u4E0A\u4F4D${finalists}\u4EF6\u306B\u3064\u3044\u3066\u3001itemUrl \u307E\u305F\u306F\u300C\u5E97\u8217\u540D+\u5546\u54C1\u540D+\u9001\u6599\u300D\u3067\u30A6\u30A7\u30D6\u691C\u7D22\u3057\u3001\u672C\u571F\u5411\u3051\u9001\u6599(\u5186)\u3092\u78BA\u8A8D\u3002\u4E0D\u660E\u306A\u3089\u300C\u9001\u6599\u8981\u78BA\u8A8D\u300D\u3068\u3057\u3001\u91D1\u984D\u3092\u63A8\u6E2C\u3057\u306A\u3044\u3002
5. totalPrice = \u5546\u54C1\u4FA1\u683C + \u78BA\u8A8D\u6E08\u307F\u9001\u6599 \u3067\u518D\u30BD\u30FC\u30C8\u3002\u540C\u7A0B\u5EA6\u306A\u3089 unitPrice \u9806\u3002
6. \u9806\u4F4D\u8868\u3092\u63D0\u793A: \u9806\u4F4D\u3001\u5546\u54C1\u540D\u3001\u5E97\u8217\u3001\u5546\u54C1\u4FA1\u683C\u3001postageLabel\u3001\u9001\u6599\u3001totalPrice\u3001quantity\u3001unitPrice\u3001URL\u3002
7. 1\u4F4D\u3092\u63A8\u5968\u3057\u3001\u6CE8\u610F\u70B9(\u9001\u6599\u672A\u78BA\u8A8D\u3001\u30EC\u30D3\u30E5\u30FC\u5C11\u306A\u3069)\u30921\u3064\u6DFB\u3048\u308B\u3002

\u9001\u6599\u306F\u63A8\u6E2C\u7981\u6B62\u3002\u30A6\u30A7\u30D6\u6839\u62E0\u307E\u305F\u306F postageFlag=1(\u9001\u6599\u7121\u6599)\u306E\u307F\u4F7F\u7528\u3002`
    };
  }
};

// src/prompts/index.ts
var prompts = [compareIchibaValue];

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
      "User-Agent": `rakuten-pantry-mcp/${SERVER_VERSION}`
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
function detectShippingOutliers(items, minRatio = 1.12) {
  const comparable = items.filter((item) => item.unitPrice !== void 0).sort((a, b) => a.unitPrice - b.unitPrice);
  if (comparable.length < 5) return items;
  const cheapest = comparable[0];
  const medianOf3to5 = comparable[3].unitPrice;
  if (cheapest.unitPrice > 0 && medianOf3to5 / cheapest.unitPrice >= minRatio) {
    cheapest.needsShippingRecheck = true;
  }
  return items;
}
var ICHIBA_VALUE_COMPARE_WORKFLOW = bilingual(
  "For cheapest / per-unit / shipping-inclusive comparisons (\u9001\u6599\u8FBC\u307F, \u30B3\u30B9\u30D1, \u5B89\u3044\u9806, \u6700\u5B89): use the compare_ichiba_value PROMPT instead of this tool alone. If you must use this tool directly: (1) pre-sort by unitPrice ascending; (2) shippingVerified=true AND needsShippingRecheck is not true \u2192 estimatedTotalPrice is final; (3) web-search top 3\u20135 items where shippingVerified=false OR needsShippingRecheck=true for JPY shipping; (4) re-rank by itemPrice+shipping; never guess shipping.",
  "\u9001\u6599\u8FBC\u307F\u30FB\u30B3\u30B9\u30D1\u30FB\u5B89\u3044\u9806\u30FB\u6700\u5B89\u306E\u6BD4\u8F03\u306F compare_ichiba_value \u30D7\u30ED\u30F3\u30D7\u30C8\u3092\u4F7F\u3046\u3053\u3068(\u3053\u306E\u30C4\u30FC\u30EB\u5358\u4F53\u306F\u4E0D\u5341\u5206)\u3002\u76F4\u63A5\u4F7F\u3046\u5834\u5408: (1) unitPrice\u6607\u9806 (2) shippingVerified=true \u304B\u3064 needsShippingRecheck \u304C\u7ACB\u3063\u3066\u3044\u306A\u3051\u308C\u3070\u78BA\u5B9A (3) shippingVerified=false \u307E\u305F\u306F needsShippingRecheck=true \u306E\u4E0A\u4F4D3\u301C5\u4EF6\u3092\u30A6\u30A7\u30D6\u691C\u7D22 (4) \u518D\u30BD\u30FC\u30C8\u3002\u9001\u6599\u63A8\u6E2C\u7981\u6B62\u3002"
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
    detectShippingOutliers(result.items);
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
    detectShippingOutliers(mapped);
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

// src/tools/index.ts
var tools = [
  ichibaItemSearchTool,
  ichibaGenreSearchTool,
  ichibaTagSearchTool,
  ichibaItemRankingTool,
  ichibaProductSearchTool
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
var SERVER_NAME = "rakuten-pantry-mcp";
var SERVER_VERSION = "1.2.0";
var SERVER_INSTRUCTIONS = `rakuten-pantry-mcp exposes Rakuten Ichiba (marketplace) as MCP tools \u2014 5 read-only ichiba_* tools plus the compare_ichiba_value prompt.

Fork of mrslbt/rakuten-mcp with quantity/unitPrice parsing, shipping flags (postageLabel, estimatedTotalPrice, shippingVerified), and compare_ichiba_value. Ichiba only (no Books/Travel/Recipe/Kobo/GORA).

Auth: RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY (https://webservice.rakuten.co.jp/). Optional RAKUTEN_AFFILIATE_ID.

Rate limits: automatic retry with backoff (RAKUTEN_MAX_RETRIES, default 3).

For \u9001\u6599\u8FBC\u307F / \u30B3\u30B9\u30D1 / \u5B89\u3044\u9806 / per-unit ranking, prefer compare_ichiba_value over ichiba_item_search alone. Web-search shipping for finalists where shippingVerified=false. Never guess shipping amounts.`;
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
              content: { type: "text", text: text.text }
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
function parseEnvFlags(argv) {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env" && i + 1 < argv.length) {
      const pair = argv[i + 1];
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const key = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        process.env[key] = value;
        i++;
      }
    }
  }
}
async function main() {
  parseEnvFlags(process.argv.slice(2));
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
export {
  parseEnvFlags
};
