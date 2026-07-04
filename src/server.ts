/**
 * MCP server wiring — registers every tool/prompt/resource and returns the
 * configured McpServer instance.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { tryLoadConfig } from "./config.js";
import { RakutenError } from "./errors.js";
import { prompts } from "./prompts/index.js";
import { buildPromptArgsSchema } from "./prompts/schema.js";
import { resources } from "./resources/index.js";
import { tools } from "./tools/index.js";
import { READONLY, withParamTitles } from "./tools/meta.js";

const SERVER_NAME = "rakuten-pantry-mcp";
const SERVER_VERSION = "1.2.0";

const SERVER_INSTRUCTIONS = `rakuten-pantry-mcp exposes Rakuten Ichiba (marketplace) as MCP tools — 5 read-only ichiba_* tools plus the compare_ichiba_value prompt.

Fork of mrslbt/rakuten-mcp with quantity/unitPrice parsing, shipping flags (postageLabel, estimatedTotalPrice, shippingVerified), and compare_ichiba_value. Ichiba only (no Books/Travel/Recipe/Kobo/GORA).

Auth: RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY (https://webservice.rakuten.co.jp/). Optional RAKUTEN_AFFILIATE_ID.

Rate limits: automatic retry with backoff (RAKUTEN_MAX_RETRIES, default 3).

For 送料込み / コスパ / 安い順 / per-unit ranking, prefer compare_ichiba_value over ichiba_item_search alone. Web-search shipping for finalists where shippingVerified=false. Never guess shipping amounts.`;

export function buildServer(): McpServer {
  // Only advertise capabilities the server actually serves. The SDK only
  // registers a `prompts/list` / `resources/list` handler when at least one
  // prompt / resource is registered. Advertising an empty `prompts: {}` while
  // the SDK returns `-32601 Method not found` for `prompts/list` is a spec
  // mismatch that surfaces as a noisy error in Claude Desktop's logs.
  const capabilities: {
    tools: Record<string, unknown>;
    prompts?: Record<string, unknown>;
    resources?: Record<string, unknown>;
  } = { tools: {} };
  if (prompts.length > 0) capabilities.prompts = {};
  if (resources.length > 0) capabilities.resources = {};

  const server = new McpServer(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities,
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  // Tools
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        title: tool.title.en,
        description: `${tool.description.en}\n\n[JA] ${tool.description.ja}`,
        inputSchema: withParamTitles(tool.inputSchema.shape),
        annotations: READONLY,
      },
      async (rawArgs: unknown) => {
        try {
          // Lazy-load config so resources/prompts can be enumerated without auth.
          const config = tryLoadConfig();
          if (!config) {
            return {
              isError: true,
              content: [
                {
                  type: "text" as const,
                  text: `Configuration error: RAKUTEN_APP_ID and RAKUTEN_ACCESS_KEY must be set.\n\n[JA] 設定エラー: RAKUTEN_APP_ID と RAKUTEN_ACCESS_KEY を設定してください。`,
                },
              ],
            };
          }

          const parsed = tool.inputSchema.parse(rawArgs);
          const result = await tool.handler(parsed, config);
          return {
            content: [{ type: "text" as const, text: JSON.stringify(result, null, 2) }],
          };
        } catch (err) {
          if (err instanceof RakutenError) {
            return {
              isError: true,
              content: [{ type: "text" as const, text: err.toToolError() }],
            };
          }
          const message = err instanceof Error ? err.message : String(err);
          return {
            isError: true,
            content: [
              {
                type: "text" as const,
                text: `Unexpected error in ${tool.name}: ${message}`,
              },
            ],
          };
        }
      },
    );
  }

  // Prompts
  for (const prompt of prompts) {
    const argsSchema = Object.fromEntries(
      Object.entries(buildPromptArgsSchema(prompt.arguments)).map(([name, schema]) => {
        const arg = prompt.arguments?.find((a) => a.name === name);
        return [
          name,
          schema.describe(`${arg?.description.en ?? ""} ${arg?.description.ja ?? ""}`.trim()),
        ];
      }),
    );
    server.registerPrompt(
      prompt.name,
      {
        title: prompt.title.en,
        description: `${prompt.description.en}\n\n[JA] ${prompt.description.ja}`,
        argsSchema,
      },
      async (args) => {
        const text = prompt.build(args as Record<string, string | undefined>);
        return {
          messages: [
            {
              role: "user" as const,
              content: { type: "text" as const, text: text.text },
            },
          ],
        };
      },
    );
  }

  // Resources
  for (const resource of resources) {
    server.registerResource(
      resource.name,
      resource.uri,
      {
        title: resource.title.en,
        description: `${resource.description.en}\n\n[JA] ${resource.description.ja}`,
        mimeType: resource.mimeType,
      },
      async (uri: URL) => {
        const config = tryLoadConfig();
        if (!config) {
          return {
            contents: [
              {
                uri: uri.href,
                mimeType: resource.mimeType,
                text: "Configuration error: credentials not set.",
              },
            ],
          };
        }
        const text = await resource.read(config);
        return {
          contents: [
            {
              uri: uri.href,
              mimeType: resource.mimeType,
              text,
            },
          ],
        };
      },
    );
  }

  return server;
}

export { SERVER_NAME, SERVER_VERSION };
