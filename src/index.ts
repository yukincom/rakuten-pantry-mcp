#!/usr/bin/env node

/**
 * rakuten-pantry-mcp entry point.
 *
 * Reads transport from CLI flag (--http [port] / --stdio) or MCP_TRANSPORT env,
 * defaults to stdio, then dispatches to the appropriate transport runner.
 */

import { loadConfig, parseCliTransport, tryLoadConfig } from "./config.js";
import { runHttp } from "./transports/http.js";
import { runStdio } from "./transports/stdio.js";

/** Parse --env KEY=VALUE flags from CLI args. (exported for testing) */
export function parseEnvFlags(argv: string[]): void {
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--env" && i + 1 < argv.length) {
      const pair = argv[i + 1];
      const eq = pair.indexOf("=");
      if (eq > 0) {
        const key = pair.slice(0, eq);
        const value = pair.slice(eq + 1);
        process.env[key] = value;
        i++; // skip the value arg
      }
    }
  }
}

async function main(): Promise<void> {
  // Apply --env KEY=VALUE flags before loading config
  parseEnvFlags(process.argv.slice(2));
  const cliOverride = parseCliTransport(process.argv.slice(2));
  // Try config but tolerate missing creds — let stdio boot and surface the error
  // through tool calls. Useful for inspectors / `npx rakuten-pantry-mcp --help`.
  const config = tryLoadConfig();

  const transport = cliOverride.transport ?? config?.transport ?? "stdio";

  if (transport === "http") {
    // HTTP requires config (auth token, port). loadConfig throws if creds missing.
    const httpConfig = loadConfig();
    if (cliOverride.httpPort !== undefined) {
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
