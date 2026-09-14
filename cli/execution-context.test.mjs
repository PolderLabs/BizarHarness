import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { resolveExecutionBackend, persistExecutionContext } from './execution-context.mjs';

test('AO context wins over filesystem leftovers and never selects both backends', () => {
  const cwd = join(tmpdir(), `bizar-exec-${Date.now()}`);
  mkdirSync(join(cwd, '.ok'), { recursive: true });
  try {
    assert.equal(resolveExecutionBackend({ cwd, env: { AO_SESSION_ID: 'ao-1' } }), 'ao');
    assert.equal(resolveExecutionBackend({ cwd, env: {}, explicit: 'openkan' }), 'openkan');
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('invalid backend is rejected before project state is touched', () => {
  assert.throws(() => resolveExecutionBackend({ explicit: 'both' }), /openkan or ao/);
});

test('selected backend is persisted as operational Bizar state', () => {
  const cwd = join(tmpdir(), `bizar-exec-${Date.now()}-persist`);
  try {
    const result = persistExecutionContext({ schema: 'bizar.execution-context.v1', executionBackend: 'ao' }, { cwd });
    assert.match(result.path, /\.bizar\/runtime\/execution-context\.json$/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
