import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const BACKENDS = new Set(['openkan', 'ao']);

export function executionContextPath(cwd = process.cwd()) {
  return join(cwd, '.bizar', 'runtime', 'execution-context.json');
}

function readContext(cwd) {
  try {
    const value = JSON.parse(readFileSync(executionContextPath(cwd), 'utf8'));
    return BACKENDS.has(value?.executionBackend) ? value : null;
  } catch {
    return null;
  }
}

export function resolveExecutionBackend({ cwd = process.cwd(), env = process.env, explicit } = {}) {
  const requested = explicit || env.BIZAR_EXECUTION_BACKEND;
  if (requested && !BACKENDS.has(requested)) {
    throw new Error(`execution backend must be openkan or ao, received ${requested}`);
  }
  if (requested) return requested;
  if (env.AO_SESSION_ID || env.AO_PROJECT_ID) return 'ao';
  return readContext(cwd)?.executionBackend || 'openkan';
}

export function resolveExecutionContext({ cwd = process.cwd(), env = process.env, explicit, sessionId } = {}) {
  const executionBackend = resolveExecutionBackend({ cwd, env, explicit });
  const context = {
    schema: 'bizar.execution-context.v1',
    executionBackend,
    sessionId: sessionId || env.AO_SESSION_ID || env.CLAUDE_SESSION_ID || null,
    resolvedAt: new Date().toISOString(),
  };
  return context;
}

export function persistExecutionContext(context, { cwd = process.cwd(), dryRun = false } = {}) {
  if (!BACKENDS.has(context?.executionBackend)) throw new Error('cannot persist an invalid execution backend');
  const path = executionContextPath(cwd);
  if (!dryRun) {
    mkdirSync(join(cwd, '.bizar', 'runtime'), { recursive: true, mode: 0o700 });
    writeFileSync(path, `${JSON.stringify(context, null, 2)}\n`, { mode: 0o600 });
  }
  return { path, context };
}

export function isAoExecution({ cwd = process.cwd(), env = process.env, explicit } = {}) {
  return resolveExecutionBackend({ cwd, env, explicit }) === 'ao';
}

export function isOpenKanExecution(options = {}) {
  return !isAoExecution(options);
}
