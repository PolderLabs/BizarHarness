import { resolve } from "node:path";

export type ExecutionMode = "standalone-claude" | "ao-orchestrator" | "ao-worker" | "operator-cli";

export interface ExecutionContext {
  readonly mode: ExecutionMode;
  readonly sessionId: string;
  readonly agentId?: string;
  readonly role?: string;
  readonly objectiveId?: string;
  readonly taskId?: string;
  readonly projectRoot: string;
  readonly projectId?: string;
  readonly worktree?: {
    readonly id: string;
    readonly path: string;
    readonly branch: string;
    readonly baseSha: string;
  };
}

export type ContextErrorCode = "AO_CONTEXT_UNAVAILABLE" | "INVALID_CONTEXT" | "AO_OWNED_OPERATION";

export class ExecutionContextError extends Error {
  readonly code: ContextErrorCode;
  constructor(code: ContextErrorCode, message: string) {
    super(message);
    this.name = "ExecutionContextError";
    this.code = code;
  }
}

function nonEmpty(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value.trim() : undefined;
}

/** Resolve one context from the host's authoritative AO/session fields. */
export function resolveExecutionContext(env: NodeJS.ProcessEnv = process.env, cwd = process.cwd()): ExecutionContext {
  const sessionId = nonEmpty(env.AO_SESSION_ID) ?? nonEmpty(env.BIZAR_SESSION_ID) ?? `standalone:${process.pid}`;
  const projectRoot = resolve(nonEmpty(env.AO_PROJECT_ROOT) ?? nonEmpty(env.BIZAR_PROJECT_ROOT) ?? cwd);
  const hasAoSession = Boolean(nonEmpty(env.AO_SESSION_ID) || nonEmpty(env.AO_PROJECT_ID));
  const mode: ExecutionMode = env.BIZAR_OPERATOR_CLI === "1"
    ? "operator-cli"
    : hasAoSession
      ? (env.AO_ROLE === "orchestrator" || env.AO_SESSION_ROLE === "orchestrator" ? "ao-orchestrator" : "ao-worker")
      : "standalone-claude";
  return {
    mode,
    sessionId,
    projectRoot,
    projectId: nonEmpty(env.AO_PROJECT_ID),
    agentId: nonEmpty(env.AO_AGENT_ID),
    role: nonEmpty(env.BIZAR_AGENT_ROLE),
    objectiveId: nonEmpty(env.BIZAR_OBJECTIVE_ID),
    taskId: nonEmpty(env.AO_TASK_ID) ?? nonEmpty(env.BIZAR_TASK_ID),
  };
}

/** Commands which would create a second lifecycle owner inside an AO worker. */
export function assertLifecycleOwner(context: ExecutionContext, operation: string): void {
  if (context.mode === "ao-worker") {
    throw new ExecutionContextError(
      "AO_OWNED_OPERATION",
      `${operation} is owned by Agent Orchestrator in AO worker context; use AO coordination instead`,
    );
  }
}

export function isAoContext(context: ExecutionContext): boolean {
  return context.mode === "ao-worker" || context.mode === "ao-orchestrator";
}
