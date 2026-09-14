import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

export const RUNTIME_MANIFEST_SCHEMA = 'bizar.runtime-manifest.v1';

function walk(root, dir = root, out = {}) {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) walk(root, path, out);
    else if (entry.isFile()) out[relative(root, path)] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
  return out;
}

/** Generate the exact files shipped by the package/runtime installer. */
export function generateRuntimeManifest({ root, version = 'unknown' }) {
  const files = {};
  for (const dir of ['config', 'cli', 'packages/sdk/dist', 'hooks']) {
    const path = join(root, dir);
    if (existsSync(path) && statSync(path).isDirectory()) Object.assign(files, walk(root, path));
  }
  return { schema: RUNTIME_MANIFEST_SCHEMA, version, generatedAt: new Date().toISOString(), files };
}

export function writeRuntimeManifest({ root, destination, version }) {
  const manifest = generateRuntimeManifest({ root, version });
  writeFileSync(destination, `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o644 });
  return manifest;
}
