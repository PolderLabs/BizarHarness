import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { resolveBizarHome } from './config-paths.mjs';

export const OPENWOLF_VERSION = '2.5.1';
export const OPENWOLF_PACKAGE_SPEC = `openwolf@${OPENWOLF_VERSION}`;

function versionFromOutput(output) {
  const match = String(output || '').match(/(?:^|\s)v?(\d+\.\d+\.\d+)(?:\s|$)/);
  return match?.[1] || null;
}

export function detectOpenWolf({ spawn = spawnSync, env = process.env } = {}) {
  const result = spawn('openwolf', ['--version'], { encoding: 'utf8', shell: false, env, timeout: 5000 });
  if (result.error || result.status !== 0) {
    return { available: false, version: null, error: result.error?.message || `openwolf --version exited ${result.status}` };
  }
  const version = versionFromOutput(`${result.stdout || ''}\n${result.stderr || ''}`);
  return { available: Boolean(version), version, compatible: version === OPENWOLF_VERSION };
}

function markerPath(env) { return join(resolveBizarHome({ env }), 'installed.json'); }

function readRuntimeMarker(env) {
  try { return JSON.parse(readFileSync(markerPath(env), 'utf8')); } catch { return {}; }
}

function updateRuntimeMarker({ env, version, managedByBizar }) {
  const path = markerPath(env);
  const marker = readRuntimeMarker(env);
  const priorOwnership = marker.externalRuntimes?.openwolf?.managedByBizar;
  marker.externalRuntimes = {
    ...(marker.externalRuntimes || {}),
    openwolf: { managedByBizar: managedByBizar ?? (priorOwnership === true), installedVersion: version, package: 'openwolf' },
  };
  mkdirSync(resolveBizarHome({ env }), { recursive: true, mode: 0o700 });
  writeFileSync(path, `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o600 });
  return marker;
}

export function ensureOpenWolfRuntime({
  dryRun = false,
  force = false,
  env = process.env,
  detect = detectOpenWolf,
  spawn = spawnSync,
} = {}) {
  const current = detect({ spawn, env });
  if (current.compatible) {
    const marker = updateRuntimeMarker({ env, version: current.version });
    return { ok: true, installed: false, managedByBizar: marker.externalRuntimes.openwolf.managedByBizar, version: current.version, message: `OpenWolf ${current.version} ready` };
  }
  const priorOwnership = readRuntimeMarker(env).externalRuntimes?.openwolf?.managedByBizar;
  if (current.available && priorOwnership === false && !force) {
    return { ok: false, installed: false, version: current.version, managedByBizar: false, message: `OpenWolf ${current.version || 'unknown'} is incompatible with the tested ${OPENWOLF_VERSION}; it is user-managed, so Bizar will not replace it automatically` };
  }
  if (dryRun) return { ok: true, installed: false, version: OPENWOLF_VERSION, message: `[dry-run] would install ${OPENWOLF_PACKAGE_SPEC} globally` };
  const result = spawn('npm', ['install', '--global', OPENWOLF_PACKAGE_SPEC], {
    encoding: 'utf8', shell: false, env, stdio: 'pipe', timeout: 120000,
  });
  if (result.error || result.status !== 0) {
    return { ok: false, installed: false, message: `OpenWolf installation failed: ${result.error?.message || result.stderr || `npm exited ${result.status}`}` };
  }
  const verified = detect({ spawn, env });
  if (!verified.compatible) return { ok: false, installed: true, message: `OpenWolf install completed but version ${verified.version || 'unknown'} is not ${OPENWOLF_VERSION}` };
  const marker = updateRuntimeMarker({ env, version: verified.version, managedByBizar: true });
  return { ok: true, installed: true, managedByBizar: marker.externalRuntimes.openwolf.managedByBizar, version: verified.version, message: `OpenWolf ${verified.version} installed globally` };
}

function lockPath(cwd) { return join(cwd, '.bizar', 'runtime', 'openwolf-init.lock'); }

export function initOpenWolfProject({ cwd = process.cwd(), dryRun = false, spawn = spawnSync, env = process.env } = {}) {
  const wolfDir = join(cwd, '.wolf');
  if (existsSync(join(wolfDir, 'config.json'))) return { ok: true, initialized: false, status: 'ready', path: wolfDir, message: 'OpenWolf project already initialized' };
  const lock = lockPath(cwd);
  if (dryRun) return { ok: true, initialized: false, status: 'planned', path: wolfDir, message: `[dry-run] would run openwolf init --agent claude in ${resolve(cwd)}` };
  mkdirSync(join(cwd, '.bizar', 'runtime'), { recursive: true, mode: 0o700 });
  try { mkdirSync(lock); } catch { return { ok: true, initialized: false, status: 'initializing', path: wolfDir, message: 'OpenWolf initialization already in progress' }; }
  try {
    const result = spawn('openwolf', ['init', '--agent', 'claude'], { cwd, env, encoding: 'utf8', shell: false, stdio: 'pipe', timeout: 30000 });
    if (result.error || result.status !== 0) return { ok: false, initialized: false, status: 'unavailable', path: wolfDir, message: result.error?.message || result.stderr || `openwolf init exited ${result.status}` };
    return { ok: true, initialized: true, status: 'ready', path: wolfDir, message: result.stdout?.trim() || 'OpenWolf project initialized' };
  } finally { rmSync(lock, { recursive: true, force: true }); }
}

export function ensureOpenWolfProject({ cwd = process.cwd(), dryRun = false, spawn = spawnSync, env = process.env } = {}) {
  if (existsSync(join(cwd, '.wolf', 'config.json'))) return { ok: true, initialized: false, status: 'ready', path: join(cwd, '.wolf'), message: 'OpenWolf project ready' };
  if (!existsSync(join(cwd, '.bizar')) && !existsSync(join(cwd, '.ok'))) return { ok: true, initialized: false, status: 'not-managed', message: 'project is not Bizar-managed' };
  const runtime = detectOpenWolf({ spawn, env });
  if (!runtime.available) return { ok: true, initialized: false, status: 'unavailable', message: 'OpenWolf CLI unavailable; native tools remain active' };
  return initOpenWolfProject({ cwd, dryRun, spawn, env });
}

export function openWolfHealth({ cwd = process.cwd(), deep = false, spawn = spawnSync, env = process.env } = {}) {
  const runtime = detectOpenWolf({ spawn, env });
  const project = existsSync(join(cwd, '.wolf'));
  if (!runtime.available) return { ok: false, runtime, project, message: 'openwolf executable unavailable' };
  if (!runtime.compatible) return { ok: false, runtime, project, message: `OpenWolf ${runtime.version || 'unknown'} is incompatible; expected ${OPENWOLF_VERSION}` };
  if (project && !existsSync(join(cwd, '.wolf', 'config.json'))) return { ok: false, runtime, project, message: '.wolf exists but config.json is missing' };
  if (deep) {
    const result = spawn('openwolf', ['status'], { cwd, env, encoding: 'utf8', shell: false, stdio: 'pipe', timeout: 10000 });
    if (result.error || result.status !== 0) return { ok: false, runtime, project, message: result.error?.message || result.stderr || `openwolf status exited ${result.status}` };
  }
  return { ok: true, runtime, project, message: project ? `OpenWolf ${runtime.version} and project hooks ready` : `OpenWolf ${runtime.version} CLI ready` };
}
