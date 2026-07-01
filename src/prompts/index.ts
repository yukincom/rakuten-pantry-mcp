/**
 * Prompt registry — Ichiba value-comparison workflow only.
 */

import type { PromptDefinition } from "../tools/types.js";
import { compareIchibaValue } from "./ichiba.js";

export const prompts: PromptDefinition[] = [compareIchibaValue];