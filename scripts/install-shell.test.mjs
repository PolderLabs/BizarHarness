import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import {
  chmodSync,
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';

const REPO_ROOT = resolve(import.meta.dirname, '..');
const INSTALL_SCRIPT = join(REPO_ROOT, 'install.sh');

function executable(path, contents) {
  writeFileSync(path, contents);
  chmodSync(path, 0o755);
}

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'bizar-install-test-'));
  const bin = join(root, 'bin');
  const archiveTree = join(root, 'archive-tree', 'BizarHarness-fixture');
  const archive = join(root, 'fixture.tar.gz');
  const curlLog = join(root, 'curl.log');
  const nodeLog = join(root, 'node.log');
  const npmLog = join(root, 'npm.log');
  const bizarLog = join(root, 'bizar.log');
  const bootstrapTmp = join(root, 'tmp');

  mkdirSync(bin, { recursive: true });
  mkdirSync(join(archiveTree, 'cli'), { recursive: true });
  mkdirSync(bootstrapTmp, { recursive: true });
  cpSync(INSTALL_SCRIPT, join(archiveTree, 'install.sh'));
  writeFileSync(
    join(archiveTree, 'package.json'),
    JSON.stringify({ name: '@polderlabs/bizar', version: '0.0.0-test' }),
  );
  writeFileSync(join(archiveTree, 'cli', 'provision.mjs'), '// fixture\n');

  const tar = spawnSync(
    'tar',
    ['-czf', archive, '-C', dirname(archiveTree), 'BizarHarness-fixture'],
    { encoding: 'utf8' },
  );
  assert.equal(tar.status, 0, tar.stderr);

  executable(join(bin, 'curl'), `#!/usr/bin/env bash
set -euo pipefail
printf '%s\\n' "$*" >> "$FAKE_CURL_LOG"
output=''
while [ "$#" -gt 0 ]; do
  if [ "$1" = '-o' ]; then output="$2"; shift 2; else shift; fi
done
[ -n "$output" ]
cp "$FAKE_ARCHIVE" "$output"
`);
  executable(join(bin, 'node'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_NODE_LOG"
`);
executable(join(bin, 'npm'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_NPM_LOG"
if [ "$1" = 'view' ]; then printf 'sha512-test-integrity\\n'; exit 0; fi
if [ "$1" = 'install' ]; then exit 0; fi
`);
  executable(join(bin, 'git'), `#!/usr/bin/env bash
if [ "$1" = 'ls-remote' ]; then printf '0123456789abcdef0123456789abcdef01234567\\trefs/tags/v10.32.0\\n'; else exit 0; fi
`);
  executable(join(bin, 'bizar'), `#!/usr/bin/env bash
printf '%s\\n' "$*" >> "$FAKE_BIZAR_LOG"
if [ "$1" = '--version' ]; then printf '10.32.0\\n'; fi
`);
  executable(join(bin, 'uv'), '#!/usr/bin/env bash\nexit 0\n');
  executable(join(bin, 'uname'), '#!/usr/bin/env bash\nprintf \'Darwin\\n\'\n');
  executable(join(bin, 'brew'), '#!/usr/bin/env bash\nexit 0\n');

  return {
    root,
    bin,
    archive,
    curlLog,
    nodeLog,
    npmLog,
    bizarLog,
    bootstrapTmp,
    env: {
      ...process.env,
      PATH: `${bin}:${process.env.PATH}`,
      FAKE_ARCHIVE: archive,
      FAKE_CURL_LOG: curlLog,
      FAKE_NODE_LOG: nodeLog,
      FAKE_NPM_LOG: npmLog,
      FAKE_BIZAR_LOG: bizarLog,
      TMPDIR: bootstrapTmp,
    },
  };
}

test('local checkout mode provisions directly without downloading an archive', () => {
  const f = fixture();
  try {
    const result = spawnSync('bash', [INSTALL_SCRIPT, '--dry-run'], {
      cwd: REPO_ROOT,
      env: f.env,
      encoding: 'utf8',
    });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(existsSync(f.curlLog), false, 'local mode must not invoke curl');
    assert.match(readFileSync(f.nodeLog, 'utf8'), /cli\/provision\.mjs --mode=install --dry-run/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});

test('pipe mode resolves an immutable canonical release and installs the persistent npm package', () => {
  const f = fixture();
  try {
    const result = spawnSync(
      'bash',
      ['-c', 'cat "$INSTALL_SCRIPT" | bash -s --'],
      {
        cwd: f.root,
        env: { ...f.env, INSTALL_SCRIPT, BIZAR_INSTALL_REF: 'v10.32.0' },
        encoding: 'utf8',
      },
    );
    assert.equal(result.status, 0, result.stderr || result.stdout);

    const npm = readFileSync(f.npmLog, 'utf8');
    assert.match(npm, /install --global @polderlabs\/bizar@10\.32\.0/);
    const bizar = readFileSync(f.bizarLog, 'utf8');
    assert.match(bizar, /install --non-interactive/);
    const source = readFileSync(INSTALL_SCRIPT, 'utf8');
    assert.match(source, /PolderLabsVOF\/BizarHarness/);
    assert.doesNotMatch(source, /DrB0rk\/BizarHarness/);
  } finally {
    rmSync(f.root, { recursive: true, force: true });
  }
});
