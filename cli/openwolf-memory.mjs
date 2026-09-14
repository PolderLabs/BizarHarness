import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const MIGRATION_SCHEMA = 'bizar.openwolf-migration.v1';
const SECTION = '## Bizar Project Learnings';

function paths(cwd) {
  return {
    lessons: join(cwd, '.bizar', 'learning', 'project-lessons.json'),
    session: join(cwd, '.bizar', 'session-state.json'),
    wolf: join(cwd, '.wolf'),
    cerebrum: join(cwd, '.wolf', 'cerebrum.md'),
    status: join(cwd, '.wolf', 'STATUS.md'),
    migration: join(cwd, '.bizar', 'migrations', 'openwolf-memory-v1.json'),
  };
}

function readJson(path, fallback = null) {
  try { return JSON.parse(readFileSync(path, 'utf8')); } catch { return fallback; }
}

function readText(path) {
  try { return readFileSync(path, 'utf8'); } catch { return ''; }
}

function atomicWrite(path, content) {
  mkdirSync(dirname(path), { recursive: true, mode: 0o700 });
  const tmp = `${path}.${process.pid}.tmp`;
  writeFileSync(tmp, content, { mode: 0o600 });
  renameSync(tmp, path);
}

function normalizeItems(store) {
  const now = Date.now();
  return Array.isArray(store?.items)
    ? store.items.filter((item) => {
      if (!item?.key || !item?.value) return false;
      if (item.confidence != null && Number(item.confidence) < 0.5) return false;
      if (item.expiresAt && Number.isFinite(Date.parse(item.expiresAt)) && Date.parse(item.expiresAt) <= now) return false;
      return true;
    }).slice(-128)
    : [];
}

export function readProjectLearning({ cwd = process.cwd() } = {}) {
  const source = readText(paths(cwd).cerebrum);
  const sectionIndex = source.indexOf(SECTION);
  if (sectionIndex < 0) return [];
  const body = source.slice(sectionIndex + SECTION.length).split(/^## /m)[0];
  return body.split('\n').map((line) => line.match(/^[-*]\s+([^:]+):\s+(.+)$/)).filter(Boolean).map(([, key, value]) => ({ key: key.trim(), value: value.trim(), scope: 'project', source: 'openwolf' }));
}

export function rememberOpenWolfProject({ cwd = process.cwd(), key, value }) {
  const p = paths(cwd);
  if (!existsSync(p.wolf)) throw new Error('OpenWolf project is not initialized; run bizar init first');
  const current = readText(p.cerebrum);
  const items = readProjectLearning({ cwd });
  const next = items.filter((item) => item.key !== key);
  next.push({ key, value });
  const block = `${SECTION}\n\n${next.map((item) => `- ${item.key}: ${item.value}`).join('\n')}\n`;
  const sectionIndex = current.indexOf(SECTION);
  let output;
  if (sectionIndex < 0) output = `${current.trimEnd()}\n\n${block}`;
  else {
    const end = current.indexOf('\n## ', sectionIndex + SECTION.length);
    output = `${current.slice(0, sectionIndex).trimEnd()}\n\n${block}${end >= 0 ? `\n${current.slice(end + 1)}` : ''}`;
  }
  atomicWrite(p.cerebrum, `${output.trimEnd()}\n`);
  return { scope: 'project', path: p.cerebrum, item: { key, value } };
}

export function forgetOpenWolfProject({ cwd = process.cwd(), key }) {
  const p = paths(cwd);
  const current = readText(p.cerebrum);
  const items = readProjectLearning({ cwd }).filter((item) => item.key !== key && item.id !== key);
  const sectionIndex = current.indexOf(SECTION);
  if (sectionIndex < 0) return { scope: 'project', removed: 0, path: p.cerebrum };
  const end = current.indexOf('\n## ', sectionIndex + SECTION.length);
  const block = items.length ? `${SECTION}\n\n${items.map((item) => `- ${item.key}: ${item.value}`).join('\n')}\n` : '';
  const output = `${current.slice(0, sectionIndex).trimEnd()}${block ? `\n\n${block}` : ''}${end >= 0 ? `\n${current.slice(end + 1)}` : '\n'}`;
  atomicWrite(p.cerebrum, output.trimEnd() + '\n');
  return { scope: 'project', removed: 1, path: p.cerebrum };
}

export function migrateProjectMemoryToOpenWolf({ cwd = process.cwd(), dryRun = false } = {}) {
  const p = paths(cwd);
  const existing = readJson(p.migration);
  if (existing?.schema === MIGRATION_SCHEMA) return { ok: true, migrated: false, marker: existing };
  if (!existsSync(p.wolf)) return { ok: false, migrated: false, message: 'OpenWolf project is not initialized' };
  const lessons = readJson(p.lessons, null);
  const items = normalizeItems(lessons);
  const session = readJson(p.session, null);
  const imported = [];
  if (items.length && !dryRun) {
    for (const item of items) {
      try { rememberOpenWolfProject({ cwd, key: item.key, value: item.value }); imported.push(item.key); } catch { /* preserve migration marker even if one item is malformed */ }
    }
  } else if (items.length) imported.push(...items.map((item) => item.key));
  if (session && (session.nextStep || session.reason || session.activeTask) && !dryRun) {
    const status = readText(p.status).trimEnd();
    const handoff = `\n\n## Bizar Handoff (migrated)\n\n${session.activeTask ? `- Active task: ${session.activeTask}\n` : ''}${session.nextStep ? `- Next step: ${session.nextStep}\n` : ''}${session.reason ? `- Reason: ${session.reason}\n` : ''}`;
    if (!status.includes('## Bizar Handoff (migrated)')) atomicWrite(p.status, `${status}${handoff}\n`);
  }
  const marker = { schema: MIGRATION_SCHEMA, migratedAt: new Date().toISOString(), sourceFiles: [p.lessons, p.session].filter((file) => existsSync(file)), itemsImported: imported.length };
  if (!dryRun) {
    mkdirSync(join(cwd, '.bizar', 'migrations'), { recursive: true, mode: 0o700 });
    writeFileSync(p.migration, `${JSON.stringify(marker, null, 2)}\n`, { mode: 0o600 });
  }
  return { ok: true, migrated: true, marker };
}
