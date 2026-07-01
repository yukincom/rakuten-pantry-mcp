/**
 * Zod helpers for MCP prompt arguments.
 *
 * LLMs often pass numbers (e.g. finalists: 5) where the protocol expects
 * strings — coerce instead of rejecting.
 */

import { z } from "zod";

export function promptArgumentSchema(required: boolean) {
  const scalar = z
    .union([z.string(), z.number(), z.boolean()])
    .transform((value) => String(value));

  return required ? scalar : scalar.optional();
}

export function buildPromptArgsSchema(
  arguments_: Array<{ name: string; required: boolean }> | undefined,
): Record<string, z.ZodTypeAny> {
  return Object.fromEntries(
    (arguments_ ?? []).map((arg) => [
      arg.name,
      promptArgumentSchema(arg.required),
    ]),
  );
}