import { existsSync, mkdirSync, readFileSync, rmSync, copyFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { ownershipManifestPath, BIZAR_HOME, hashManagedFileForUninstall } from './uninstall-support.mjs';

function loadManifest() {
  try { return JSON.parse(readFileSync(ownershipManifestPath(), 'utf8')); } catch { return { files: {} }; }
}

export async function runUninstall({ dryRun = false, keepState = false, purgeOpenWolfRuntime = false } = {}) {
  const manifest = loadManifest();
  let installMarker = {};
  try { installMarker = JSON.parse(readFileSync(join(BIZAR_HOME(), 'installed.json'), 'utf8')); } catch { /* marker may already be absent */ }
  const managedOpenWolf = installMarker.externalRuntimes?.openwolf?.managedByBizar === true;
  const files = Array.isArray(manifest.files)
    ? Object.fromEntries(manifest.files.map((record) => [record.path, record]))
    : (manifest.files || {});
  const removed = [], restored = [], conflicts = [];
  for (const [path, record] of Object.entries(files)) {
    if (!existsSync(path)) continue;
    const expected = record.installedSha256 || record.sha256;
    const actual = hashManagedFileForUninstall(path);
    if (expected && actual !== expected) { conflicts.push(path); continue; }
    if (dryRun) { removed.push(path); continue; }
    if (record.backupPath && existsSync(record.backupPath)) {
      mkdirSync(join(path, '..'), { recursive: true });
      copyFileSync(record.backupPath, path); restored.push(path);
    } else {
      rmSync(path, { force: true }); removed.push(path);
    }
  }
  if (!dryRun && !keepState) {
    try { rmSync(BIZAR_HOME(), { recursive: true, force: true }); } catch (error) { conflicts.push(BIZAR_HOME()); }
  }
  if (!dryRun) {
    try { execFileSync('npm', ['uninstall', '-g', '@polderlabs/bizar'], { stdio: 'ignore' }); }
    catch { /* package may already be absent; state cleanup remains valid */ }
    if (purgeOpenWolfRuntime && managedOpenWolf && !existsSync(join(process.cwd(), '.wolf'))) {
      try { execFileSync('npm', ['uninstall', '-g', 'openwolf'], { stdio: 'ignore' }); }
      catch { /* runtime may be user-owned or already absent */ }
    }
  }
  return { ok: conflicts.length === 0, dryRun, removed, restored, conflicts, keptState: keepState, purgedOpenWolfRuntime: purgeOpenWolfRuntime && managedOpenWolf && !existsSync(join(process.cwd(), '.wolf')) };
}

export function showUninstallHelp() {
  console.log(`\n  bizar uninstall — remove only unchanged Bizar-owned files\n\n  Usage:\n    bizar uninstall              Restore backups and remove Bizar state\n    bizar uninstall --dry-run    Show changes without modifying files\n    bizar uninstall --keep-state Keep ~/.config/bizar/ durable state\n    bizar uninstall --purge-openwolf-runtime  Also remove Bizar-managed global OpenWolf CLI\n\n  Project .wolf/ memory is never removed by Bizar uninstall.\n`);
}
