import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { migrateProjectMemoryToOpenWolf, readProjectLearning, rememberOpenWolfProject } from './openwolf-memory.mjs';

function fixture() {
  const cwd = join(tmpdir(), `bizar-memory-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  mkdirSync(cwd, { recursive: true });
  return cwd;
}

test('project memory migrates once and remains in OpenWolf cerebrum', () => {
  const cwd = join(tmpdir(), `bizar-memory-${Date.now()}`);
  mkdirSync(join(cwd, '.wolf', 'hooks'), { recursive: true });
  mkdirSync(join(cwd, '.bizar', 'learning'), { recursive: true });
  writeFileSync(join(cwd, '.wolf', 'config.json'), '{}\n');
  writeFileSync(join(cwd, '.wolf', 'cerebrum.md'), '# Cerebrum\n');
  writeFileSync(join(cwd, '.bizar', 'learning', 'project-lessons.json'), JSON.stringify({ items: [{ key: 'test-style', value: 'run focused tests' }] }));
  try {
    const first = migrateProjectMemoryToOpenWolf({ cwd });
    const second = migrateProjectMemoryToOpenWolf({ cwd });
    assert.equal(first.migrated, true);
    assert.equal(second.migrated, false);
    assert.deepEqual(readProjectLearning({ cwd }).map((item) => item.key), ['test-style']);
    assert.match(readFileSync(join(cwd, '.bizar', 'migrations', 'openwolf-memory-v1.json'), 'utf8'), /bizar\.openwolf-migration\.v1/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('migration skips low-confidence and expired project lessons', () => {
  const cwd = fixture();
  mkdirSync(join(cwd, '.wolf'), { recursive: true });
  mkdirSync(join(cwd, '.bizar', 'learning'), { recursive: true });
  writeFileSync(join(cwd, '.bizar', 'learning', 'project-lessons.json'), JSON.stringify({ items: [
    { key: 'keep', value: 'durable', confidence: 1 },
    { key: 'weak', value: 'uncertain', confidence: 0.2 },
    { key: 'expired', value: 'old', expiresAt: '2020-01-01T00:00:00Z' },
  ] }));
  writeFileSync(join(cwd, '.wolf', 'cerebrum.md'), '# Cerebrum\n');
  try {
    const result = migrateProjectMemoryToOpenWolf({ cwd });
    assert.equal(result.marker.itemsImported, 1);
    assert.match(readFileSync(join(cwd, '.wolf', 'cerebrum.md'), 'utf8'), /keep: durable/);
    assert.doesNotMatch(readFileSync(join(cwd, '.wolf', 'cerebrum.md'), 'utf8'), /uncertain|old/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

test('project learning writes to cerebrum instead of a second project store', () => {
  const cwd = join(tmpdir(), `bizar-memory-${Date.now()}-remember`);
  mkdirSync(join(cwd, '.wolf'), { recursive: true });
  writeFileSync(join(cwd, '.wolf', 'config.json'), '{}\n');
  writeFileSync(join(cwd, '.wolf', 'cerebrum.md'), '# Cerebrum\n');
  try {
    rememberOpenWolfProject({ cwd, key: 'convention', value: 'focused tests first' });
    assert.match(readFileSync(join(cwd, '.wolf', 'cerebrum.md'), 'utf8'), /convention: focused tests first/);
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});
