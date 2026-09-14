#!/usr/bin/env node
/**
 * packages/sdk/src/mcp/bin.ts — `bizar-mcp` standalone stdio MCP server.
 *
 * This is the runtime entry-point that `claude mcp add` and
 * `.mcp.json` invoke. The Claude Code CLI launches this as a child
 * process and speaks the Model Context Protocol over stdio.
 *
 *     claude mcp add bizar -- npx -y @polderlabs/bizar-sdk mcp
 *
 * The actual server is built dynamically via
 * `@anthropic-ai/claude-agent-sdk`'s `createSdkMcpServer()` and `tool()`
 * helpers so we don't take a hard dependency on zod at SDK-level.
 */

import { runStdioServer } from "./stdio.js";

async function main() {
  await runStdioServer();
}

main().catch((err) => {
  process.stderr.write(`bizar-mcp fatal: ${err instanceof Error ? err.stack ?? err.message : String(err)}\n`);
  process.exit(1);
});
