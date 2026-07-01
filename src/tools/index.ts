/**
 * Tool registry — Ichiba (Rakuten marketplace) only.
 *
 * Forked from mrslbt/rakuten-mcp with unit-price and shipping workflow additions.
 * Books, Travel, Recipe, Kobo, and GORA families are intentionally omitted.
 */

import type { ToolDefinition } from "./types.js";
import {
  ichibaGenreSearchTool,
  ichibaItemRankingTool,
  ichibaItemSearchTool,
  ichibaProductSearchTool,
  ichibaTagSearchTool,
} from "./ichiba.js";

export const tools: ToolDefinition[] = [
  ichibaItemSearchTool,
  ichibaGenreSearchTool,
  ichibaTagSearchTool,
  ichibaItemRankingTool,
  ichibaProductSearchTool,
];

export type { ToolDefinition } from "./types.js";