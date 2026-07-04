import { afterEach, describe, expect, it } from "vitest";
import { parseEnvFlags } from "../src/index.js";

describe("parseEnvFlags", () => {
  const originalFoo = process.env.FOO;
  const originalBar = process.env.BAR;

  afterEach(() => {
    if (originalFoo === undefined) {
      delete process.env.FOO;
    } else {
      process.env.FOO = originalFoo;
    }
    if (originalBar === undefined) {
      delete process.env.BAR;
    } else {
      process.env.BAR = originalBar;
    }
  });

  it("sets env from --env KEY=VAL", () => {
    parseEnvFlags(["--env", "FOO=bar"]);
    expect(process.env.FOO).toBe("bar");
  });

  it("ignores malformed --env flags without =", () => {
    delete process.env.BAR;
    parseEnvFlags(["--env", "BAR"]);
    expect(process.env.BAR).toBeUndefined();
  });

  it("skips the value arg after a valid --env pair", () => {
    parseEnvFlags(["--env", "FOO=first", "--stdio"]);
    expect(process.env.FOO).toBe("first");
  });
});