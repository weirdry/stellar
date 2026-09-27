import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mkdtemp,
  mkdir,
  readFile,
  writeFile,
  chmod,
  symlink,
  stat,
  rm,
} from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { must, objectJSON } from './support.ts';

void test('documented file-first recipe retains paginated native bytes without echoing bodies or overwriting evidence', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-collection-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const bin = join(dir, 'bin');
  await mkdir(bin);
  await symlink(process.execPath, join(bin, 'node'));
  const gh = join(bin, 'gh');
  await writeFile(
    gh,
    '#!/bin/bash\nset -eu\nprintf "%s\\n" "$@" >> "$STELLAR_TEST_CALLS"\ncat "$STELLAR_TEST_RESPONSE"\nexit "${STELLAR_TEST_EXIT:-0}"\n',
  );
  await chmod(gh, 0o700);
  const guide = await readFile(
    new URL('../references/github.md', import.meta.url),
    'utf8',
  );
  const recipe = must(guide.match(/```bash\n([\s\S]*?)\n```/)?.[1]);
  const response = join(dir, 'response.json');
  const calls = join(dir, 'calls.txt');
  const marker = 'source-body-not-for-stdout';
  const issue = (number: number) => ({
    node_id: `I_invented_${number}`,
    number,
    html_url: `https://github.com/example/observatory/issues/${number}`,
    title: 'Invented observation',
    body: `${marker}\r\n🪐 Measure drift.`,
  });
  const bytes =
    JSON.stringify(
      [[issue(1), { ...issue(2), pull_request: {} }], [issue(3)]],
      null,
      2,
    ) + '\n';
  await writeFile(response, bytes);
  const run = (stage: string, exit = '0') =>
    spawnSync('bash', ['-c', recipe], {
      encoding: 'utf8',
      env: {
        ...process.env,
        PATH: `${bin}:${process.env['PATH'] ?? ''}`,
        REPOSITORY: 'example/observatory',
        ASSIGNEE: 'invented-user',
        STAGING: join(dir, stage),
        STELLAR_TEST_RESPONSE: response,
        STELLAR_TEST_CALLS: calls,
        STELLAR_TEST_EXIT: exit,
      },
    });
  const result = run('success');
  assert.equal(result.status, 0, result.stderr);
  const summary = objectJSON(result.stdout);
  const retained = join(dir, 'success/evidence/raw/assigned-pages.json');
  assert.equal(await readFile(retained, 'utf8'), bytes);
  assert.equal((await stat(retained)).mode & 0o777, 0o600);
  assert.equal(summary['pages'], 2);
  assert.equal(summary['issues'], 2);
  assert.equal(summary['bytes'], Buffer.byteLength(bytes));
  assert.equal(
    summary['sha256'],
    createHash('sha256').update(bytes).digest('hex'),
  );
  assert.ok(!result.stdout.includes(marker));
  const args = await readFile(calls, 'utf8');
  assert.deepEqual(args.trim().split('\n'), [
    'api',
    '--method',
    'GET',
    '--paginate',
    '--slurp',
    '/repos/example/observatory/issues',
    '-f',
    'assignee=invented-user',
    '-f',
    'state=all',
  ]);
  const occupied = run('success');
  assert.notEqual(occupied.status, 0);
  assert.equal(occupied.stdout, '');
  assert.equal(await readFile(calls, 'utf8'), args);
  assert.equal(await readFile(retained, 'utf8'), bytes);

  const failed = run('failed', '7');
  assert.equal(failed.status, 7);
  assert.equal(failed.stdout, '');
  assert.equal(
    await readFile(
      join(dir, 'failed/evidence/raw/assigned-pages.json'),
      'utf8',
    ),
    bytes,
  );
  for (const [name, raw] of [
    ['malformed', `{${marker}`],
    ['wrong-shape', JSON.stringify({ body: marker })],
    ['nested-record-array', JSON.stringify([[[{ body: marker }]]])],
  ]) {
    await writeFile(response, must(raw));
    const invalid = run(must(name));
    assert.notEqual(invalid.status, 0);
    assert.equal(invalid.stdout, '');
    assert.ok(!invalid.stderr.includes(marker));
  }
});
