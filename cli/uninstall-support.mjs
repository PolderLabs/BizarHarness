import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { ownershipManifestPath, BIZAR_HOME } from './provision.mjs';

export { ownershipManifestPath, BIZAR_HOME };
export function hashManagedFileForUninstall(path) {
  try { return createHash('sha256').update(readFileSync(path)).digest('hex'); } catch { return null; }
}
