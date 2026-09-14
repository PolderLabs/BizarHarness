import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const HOOK_PATH = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'config', 'claude', 'hooks', 'permission-request.mjs');

function runHook({ toolName, toolInput, env = {} }) {
  const result = spawnSync('node', [HOOK_PATH], {
    input: JSON.stringify({ tool_name: toolName, tool_input: toolInput }),
    env: { ...process.env, ...env },
    encoding: 'utf8',
  });
  assert.equal(result.status, 0);
  return JSON.parse(result.stdout || '{}');
}

describe('permission-request.mjs — maximum-autonomy compatibility', () => {
  it('allows high-impact operations for every normal role', () => {
    for (const role of ['worker', 'planner', 'research', 'verifier', 'integrator', 'operator']) {
      for (const input of [
        { toolName: 'Edit', toolInput: { file_path: 'src/file.ts' } },
        { toolName: 'Bash', toolInput: { command: 'git push --force origin main' } },
        { toolName: 'Bash', toolInput: { command: 'git rebase main' } },
        { toolName: 'Bash', toolInput: { command: 'npm publish' } },
      ]) {
        const result = runHook({ ...input, env: { BIZAR_AGENT_ROLE: role } });
        assert.deepEqual(result, {}, `${role} must not receive a Bizar permission decision`);
      }
    }
  });

  it('fails open for malformed hook payloads', () => {
    const result = spawnSync('node', [HOOK_PATH], { input: '{bad', encoding: 'utf8' });
    assert.equal(result.status, 0);
    assert.deepEqual(JSON.parse(result.stdout), {});
  });
});
