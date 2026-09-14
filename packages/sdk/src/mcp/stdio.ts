import { createInterface } from "node:readline";
import { createBizarMcpServerConfig, type SdkMcpToolDef } from "./server.js";

interface RpcRequest { readonly jsonrpc?: string; readonly id?: string | number | null; readonly method?: string; readonly params?: any; }

function response(id: RpcRequest["id"], result: unknown): string {
  return JSON.stringify({ jsonrpc: "2.0", id: id ?? null, result });
}

function errorResponse(id: RpcRequest["id"], code: number, message: string): string {
  return JSON.stringify({ jsonrpc: "2.0", id: id ?? null, error: { code, message } });
}

function toolResult(tool: SdkMcpToolDef, value: unknown) {
  return tool.handler(value);
}

/** Standards-compliant newline-delimited JSON-RPC MCP stdio adapter. */
export async function runStdioServer(options: { input?: NodeJS.ReadableStream; output?: NodeJS.WritableStream } = {}): Promise<void> {
  const input = options.input ?? process.stdin;
  const output = options.output ?? process.stdout;
  const config = createBizarMcpServerConfig();
  const tools = new Map(config.tools.map((tool) => [tool.name, tool]));
  const rl = createInterface({ input, crlfDelay: Infinity });
  const write = (line: string) => output.write(`${line}\n`);

  for await (const line of rl) {
    if (!line.trim()) continue;
    let request: RpcRequest;
    try { request = JSON.parse(line) as RpcRequest; } catch {
      write(errorResponse(null, -32700, "Invalid JSON"));
      continue;
    }
    if (request.method === "notifications/initialized" || request.method === "notifications/cancelled") continue;
    try {
      if (request.method === "initialize") {
        write(response(request.id, {
          protocolVersion: "2025-06-18",
          capabilities: { tools: { listChanged: false } },
          serverInfo: { name: config.name, version: config.version },
        }));
      } else if (request.method === "tools/list") {
        write(response(request.id, { tools: config.tools.map((tool) => ({ name: tool.name, description: tool.description, inputSchema: tool.inputSchema, annotations: tool.annotations })) }));
      } else if (request.method === "tools/call") {
        const name = request.params?.name;
        const tool = tools.get(name);
        if (!tool) {
          write(response(request.id, { isError: true, content: [{ type: "text", text: `error: unknown tool ${String(name)}` }], structuredContent: { code: "NOT_FOUND", message: `Unknown tool: ${String(name)}`, retryable: false } }));
          continue;
        }
        const result = await toolResult(tool, request.params?.arguments ?? {});
        write(response(request.id, result));
      } else if (request.method === "ping") {
        write(response(request.id, {}));
      } else if (request.method) {
        write(errorResponse(request.id, -32601, `Method not found: ${request.method}`));
      }
    } catch (error) {
      write(response(request.id, { isError: true, content: [{ type: "text", text: "error: tool execution failed" }], structuredContent: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : String(error), retryable: false } }));
    }
  }
}
