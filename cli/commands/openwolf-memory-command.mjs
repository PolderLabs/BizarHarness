import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { ensureOpenWolfRuntime, openWolfHealth } from '../openwolf.mjs';

export const USAGE = `
  bizar memory — OpenWolf project memory/context integration

  Usage:
    bizar memory status
    bizar memory update                 Update OpenWolf for the current project only
    bizar memory update --all-projects  Delegate the explicit global OpenWolf update
`;

export async function run(name, args = [], isHelpRequest = false) {
  if (name !== 'memory') return false;
  if (isHelpRequest || !args[0] || args[0] === 'help') { process.stdout.write(USAGE); return true; }
  if (args[0] === 'status') {
    process.stdout.write(`${JSON.stringify(openWolfHealth({ cwd: process.cwd(), deep: args.includes('--deep') }), null, 2)}\n`);
    return true;
  }
  if (args[0] !== 'update') { process.stdout.write(USAGE); process.exitCode = 2; return true; }
  const runtime = ensureOpenWolfRuntime({});
  if (!runtime.ok) { process.stderr.write(`OpenWolf runtime unavailable: ${runtime.message}\n`); process.exitCode = 1; return true; }
  const updateArgs = args.includes('--all-projects') ? ['update'] : ['update', '--project', resolve(process.cwd())];
  const result = spawnSync('openwolf', updateArgs, { cwd: process.cwd(), shell: false, encoding: 'utf8', stdio: 'inherit', timeout: 120000 });
  if (result.error || result.status !== 0) process.exitCode = result.status || 1;
  return true;
}
