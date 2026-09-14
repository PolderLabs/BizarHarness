import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ensureOpenWolfRuntime, initOpenWolfProject, openWolfHealth } from './openwolf.mjs';

function fixture() {
  const root = join(tmpdir(), `bizar-openwolf-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(root, { recursive: true });
  return root;
}

test('compatible OpenWolf is reused and recorded as pre-existing', () => {
  const root = fixture();
  const env = { ...process.env, BIZAR_HOME: join(root, '.config', 'bizar') };
  const calls = [];
  const spawn = (command, args) => { calls.push([command, args]); return { status: 0, stdout: '2.5.1\n', stderr: '' }; };
  try {
    const result = ensureOpenWolfRuntime({ env, spawn });
    assert.equal(result.ok, true);
    assert.equal(result.installed, false);
    assert.deepEqual(calls, [['openwolf', ['--version']]]);
    const marker = JSON.parse(readFileSync(join(env.BIZAR_HOME, 'installed.json'), 'utf8'));
    assert.deepEqual(marker.externalRuntimes.openwolf, { managedByBizar: false, installedVersion: '2.5.1', package: 'openwolf' });
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('missing OpenWolf performs one structured npm install and verifies the exact version', () => {
  const root = fixture();
  const env = { ...process.env, BIZAR_HOME: join(root, '.config', 'bizar') };
  const calls = [];
  const spawn = (command, args) => {
    calls.push([command, args]);
    if (command === 'npm') return { status: 0, stdout: '', stderr: '' };
    return calls.length > 1 ? { status: 0, stdout: '2.5.1\n', stderr: '' } : { status: 1, stdout: '', stderr: 'missing' };
  };
  try {
    const result = ensureOpenWolfRuntime({ env, spawn });
    assert.equal(result.ok, true);
    assert.deepEqual(calls, [['openwolf', ['--version']], ['npm', ['install', '--global', 'openwolf@2.5.1']], ['openwolf', ['--version']]]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('incompatible pre-existing OpenWolf is not replaced without ownership', () => {
  const root = fixture();
  const env = { ...process.env, BIZAR_HOME: join(root, '.config', 'bizar') };
  mkdirSync(env.BIZAR_HOME, { recursive: true });
  writeFileSync(join(env.BIZAR_HOME, 'installed.json'), JSON.stringify({ externalRuntimes: { openwolf: { managedByBizar: false, installedVersion: '2.4.0', package: 'openwolf' } } }));
  const calls = [];
  const spawn = (command, args) => { calls.push([command, args]); return { status: 0, stdout: '2.4.0\n', stderr: '' }; };
  try {
    const result = ensureOpenWolfRuntime({ env, spawn });
    assert.equal(result.ok, false);
    assert.equal(result.installed, false);
    assert.equal(calls.length, 1);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('project init is idempotent and uses the Claude-only integration flag', () => {
  const root = fixture();
  mkdirSync(join(root, '.bizar'), { recursive: true });
  const calls = [];
  const spawn = (command, args) => { calls.push([command, args]); mkdirSync(join(root, '.wolf'), { recursive: true }); writeFileSync(join(root, '.wolf', 'config.json'), '{}\n'); return { status: 0, stdout: 'initialized', stderr: '' }; };
  try {
    const first = initOpenWolfProject({ cwd: root, spawn });
    const second = initOpenWolfProject({ cwd: root, spawn });
    assert.equal(first.ok, true);
    assert.equal(second.initialized, false);
    assert.deepEqual(calls, [['openwolf', ['init', '--agent', 'claude']]]);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

test('health is degraded when a project exists without the tested runtime', () => {
  const root = fixture();
  mkdirSync(join(root, '.wolf'), { recursive: true });
  const spawn = () => ({ status: 1, stdout: '', stderr: 'not found' });
  try { assert.equal(openWolfHealth({ cwd: root, spawn }).ok, false); }
  finally { rmSync(root, { recursive: true, force: true }); }
});
