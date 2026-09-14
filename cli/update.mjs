/**
 * update.mjs — `bizar update` subcommand (v4.4.7 — thin wrapper).
 *
 * The full update logic now lives in `cli/provision.mjs:runProvision`.
 * `bizar install` and `bizar update` are the same code path with
 * different `mode` flags. This file just re-exports the API the rest of
 * the codebase expects.
 *
 * Why a thin wrapper:
 *   - One source of truth. Install + update used to drift apart (and
 *     did — install.mjs and update.mjs each grew their own copy of
 *     "sync Claude Code surfaces, refresh settings, run doctor").
 *     Now both call the same function.
 *   - Easier to maintain. Adding a new step means editing provision.mjs
 *     once; both `install` and `update` pick it up.
 *   - Same idempotency guarantees. Both modes probe existing state
 *     first and skip work that's already done.
 *
 * Backward-compatible: `runUpdate` is still exported with the same
 * signature (`runUpdate(subargs: string[])`).
 */

export {
  runUpdate,
  runProvision,
  detectState,
  readLivePid,
  killAndWait,
} from './provision.mjs';

import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { verifyRelease } from '../packages/sdk/dist/release/index.js';

/** Parse the requested immutable package version without treating arbitrary
 * shell text as a package spec. */
export function resolveRequestedVersion(args = []) {
  const index = args.indexOf('--version');
  const value = index >= 0 ? args[index + 1] : undefined;
  if (value === undefined) return null;
  if (!/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/.test(value)) throw new Error('update --version must be a semantic version');
  return value;
}

/** Switch the active package only after a supplied artifact bundle verifies. */
export function switchToVerifiedPackage({ version, artifactDir, npm = 'npm', run = execFileSync } = {}) {
  if (!version || !artifactDir) throw new Error('version and artifactDir are required for verified update');
  const files = {
    tarball: join(artifactDir, `${version}.tgz`),
    sbom: join(artifactDir, `${version}.sbom.cdx.json`),
    provenance: join(artifactDir, `${version}.provenance.intoto.jsonl`),
    minisig: join(artifactDir, `${version}.minisig`),
  };
  if (Object.values(files).some((path) => !existsSync(path))) throw new Error('verified update artifact bundle is incomplete');
  const verification = verifyRelease({
    version,
    tarballBytes: readFileSync(files.tarball),
    sbomJson: readFileSync(files.sbom, 'utf8'),
    provenanceJsonl: readFileSync(files.provenance, 'utf8'),
    minisigText: readFileSync(files.minisig, 'utf8'),
  });
  if (!verification.ok) throw new Error(`release verification failed: ${verification.reason}${verification.detail ? ` — ${verification.detail}` : ''}`);
  return run(npm, ['install', '--global', `@polderlabs/bizar@${version}`], { encoding: 'utf8' });
}

export async function runVerifiedUpdate(args = [], options = {}) {
  const version = resolveRequestedVersion(args);
  if (!version) throw new Error('runVerifiedUpdate requires --version <X.Y.Z>');
  switchToVerifiedPackage({ version, artifactDir: options.artifactDir, npm: options.npm, run: options.run });
  const { runInstaller } = await import('./install/index.mjs');
  return runInstaller({ ...options, mode: 'update' });
}
