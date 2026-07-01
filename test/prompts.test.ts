import { describe, expect, it } from "vitest";
import { z } from "zod";
import { compareIchibaValue } from "../src/prompts/ichiba.js";
import { buildPromptArgsSchema } from "../src/prompts/schema.js";

describe("prompt argument schema", () => {
  const schema = z.object(buildPromptArgsSchema(compareIchibaValue.arguments));

  it("accepts finalists as a number and coerces to string", () => {
    expect(schema.parse({ keyword: "モンスターエナジー", finalists: 5 })).toEqual({
      keyword: "モンスターエナジー",
      finalists: "5",
    });
  });

  it("accepts max_price as a number and coerces to string", () => {
    expect(schema.parse({ keyword: "tea", max_price: 3000 })).toEqual({
      keyword: "tea",
      max_price: "3000",
    });
  });

  it("rejects missing required keyword", () => {
    expect(() => schema.parse({ finalists: 5 })).toThrow();
  });
});

describe("compare_ichiba_value prompt", () => {
  it("builds instructions with coerced numeric args", () => {
    const text = compareIchibaValue.build({
      keyword: "モンスターエナジー",
      finalists: "5",
      max_price: "5000",
    });

    expect(text.en).toContain("モンスターエナジー");
    expect(text.en).toContain("Finalists to web-check for shipping: 5");
    expect(text.en).toContain("max_price=5000");
    expect(text.ja).toContain("送料は推測禁止");
  });
});