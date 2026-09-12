import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { validateWorkMap, safeAttachmentURL } from '../lib/validate.js';
import { renderWorkMap, renderFile } from '../lib/render.js';

const fixture = JSON.parse(
  await readFile(new URL('../examples/museum.json', import.meta.url), 'utf8'),
);
const fresh = () => structuredClone(fixture);
const invalid = (change, code, path) => {
  const data = fresh();
  change(data);
  const result = validateWorkMap(data);
  assert.equal(result.valid, false);
  assert.ok(
    result.diagnostics.some((d) => d.code === code && d.path === path && d.fix),
    JSON.stringify(result),
  );
};

test('both independent examples validate and render deterministically without altering input', async () => {
  for (const name of ['museum', 'seed-library']) {
    const data = JSON.parse(
      await readFile(
        new URL(`../examples/${name}.json`, import.meta.url),
        'utf8',
      ),
    );
    const before = structuredClone(data);
    assert.deepEqual(validateWorkMap(data), { valid: true, diagnostics: [] });
    const html = await renderWorkMap(data);
    assert.equal(html, await renderWorkMap(data));
    assert.deepEqual(data, before);
    assert.ok(html.includes('id="graph"') && html.includes(data.owner));
    assert.ok(!/<script[^>]+src=|<link[^>]+stylesheet/.test(html));
  }
});

test('diagnostics identify incorrect shape, identities, classifications and endpoints', () => {
  invalid(
    (d) => {
      d.issues[0].status.type = 'done';
    },
    'schema',
    '/issues/0/status/type',
  );
  invalid(
    (d) => {
      d.issues.push(d.issues[0]);
    },
    'duplicate-id',
    '/issues/14/id',
  );
  invalid(
    (d) => {
      delete d.issues[0].classification;
    },
    'missing-classification',
    '/issues/0/classification',
  );
  invalid(
    (d) => {
      d.issues[0].classification.category = 'absent';
    },
    'unknown-category',
    '/issues/0/classification/category',
  );
  invalid(
    (d) => {
      d.categories[0].domain = 'absent';
    },
    'unknown-domain',
    '/categories/0/domain',
  );
  invalid(
    (d) => {
      d.relations[0].source = 'absent';
    },
    'unknown-endpoint',
    '/relations/0/source',
  );
  invalid(
    (d) => {
      d.issues.at(-1).status.type = 'completed';
    },
    'unqueried-status',
    '/issues/13/status/type',
  );
  invalid(
    (d) => {
      d.issues[0].parentId = 'MUS-10';
    },
    'schema',
    '/issues/0/parentId',
  );
  invalid(
    (d) => {
      d.issues[0].relations = [];
    },
    'schema',
    '/issues/0/relations',
  );
});

test('source relation invariants preserve direction and reject duplicate or impossible hierarchies', () => {
  invalid(
    (d) => {
      d.relations.push({ kind: 'related', source: 'MUS-5', target: 'MUS-1' });
    },
    'duplicate-relation',
    '/relations/10',
  );
  invalid(
    (d) => {
      d.relations[0].target = d.relations[0].source;
    },
    'self-relation',
    '/relations/0',
  );
  invalid(
    (d) => {
      d.relations.push({ kind: 'parent', source: 'MUS-5', target: 'MUS-1' });
    },
    'multiple-parents',
    '/relations/10',
  );
  invalid(
    (d) => {
      d.relations.push({ kind: 'parent', source: 'MUS-1', target: 'MUS-10' });
    },
    'parent-cycle',
    '/relations/0',
  );
  const d = fresh();
  d.relations.push({ kind: 'blocks', source: 'MUS-2', target: 'MUS-1' });
  assert.equal(
    validateWorkMap(d).valid,
    true,
    'real blocker cycles must not be silently rewritten',
  );
});

test('empty, all-completed, unknown and context-only snapshots are valid', () => {
  const completed = fresh();
  completed.issues.forEach((i) => {
    i.status = { type: 'completed', label: 'Finished' };
    i.detail = 'full';
  });
  assert.equal(validateWorkMap(completed).valid, true);

  const data = fresh();
  data.issues = [];
  data.relations = [];
  data.domains = [];
  data.categories = [];
  assert.equal(validateWorkMap(data).valid, true);
  const context = fresh();
  context.issues.forEach((i) => {
    i.scope = 'context';
    delete i.classification;
  });
  assert.equal(validateWorkMap(context).valid, true);
});

test('authored text stays literal across HTML embedding and template substitution', async () => {
  const data = fresh();
  const attack =
    '</script><script>window.pwned=true</script><!-- __CSS__ $& <img src=x onerror=alert(1)>';
  data.owner = attack;
  data.issues[0].title = attack;
  const html = await renderWorkMap(data);
  const embedded = html.match(
    /<script type="application\/json" id="data">([\s\S]*?)<\/script>/,
  )[1];
  assert.equal(JSON.parse(embedded).owner, attack);
  assert.ok(!embedded.includes('<'));
  assert.ok(!html.includes('<script>window.pwned'));
  assert.ok(html.includes('&lt;/script&gt;'));
});

test('active or credential-bearing URLs are rejected; references remain optional', () => {
  const unicode = fresh();
  unicode.issues[0].url = 'https://example.com/issues/전시-안내';
  assert.equal(validateWorkMap(unicode).valid, true);
  invalid(
    (d) => {
      d.issues[0].url = 'https://';
    },
    'unsafe-url',
    '/issues/0/url',
  );
  for (const url of [
    'javascript:alert(1)',
    'data:text/html,bad',
    'file:///tmp/report.html',
  ])
    invalid(
      (d) => {
        d.issues[0].url = url;
      },
      'schema',
      '/issues/0/url',
    );
  invalid(
    (d) => {
      d.issues[0].url = 'https://user:secret@example.com/';
    },
    'unsafe-url',
    '/issues/0/url',
  );
  for (const url of [
    '../private.json',
    '/tmp/report.html',
    '//example.com',
    '%2e%2e/private.json',
    'x\\y',
    'javascript:alert(1)',
    'https://user:secret@example.com/',
  ]) {
    assert.equal(safeAttachmentURL(url), false, url);
    invalid(
      (d) => {
        d.attachments[0].href = url;
      },
      'unsafe-attachment',
      '/attachments/0/href',
    );
  }
  for (const url of ['references/guide.html', 'https://example.com/guide'])
    assert.equal(safeAttachmentURL(url), true);
});

test('CLI works outside the checkout, reports JSON diagnostics and preserves previous output on failure', async (t) => {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-cli-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const input = join(dir, 'input.json'),
    output = join(dir, 'report.html');
  await writeFile(input, JSON.stringify(fixture));
  const cli = fileURLToPath(new URL('../bin/stellar.js', import.meta.url));
  const run = (...args) =>
    spawnSync(process.execPath, [cli, ...args], { cwd: dir, encoding: 'utf8' });
  assert.equal(run('validate', input).status, 0);
  assert.equal(run('render', input, output).status, 0);
  const previous = await readFile(output, 'utf8');
  const bad = fresh();
  delete bad.issues[0].classification;
  await writeFile(input, JSON.stringify(bad));
  const result = run('render', input, output);
  assert.equal(result.status, 1);
  assert.equal(
    JSON.parse(result.stderr).diagnostics[0].code,
    'missing-classification',
  );
  assert.equal(await readFile(output, 'utf8'), previous);
  await writeFile(input, '{"private title":');
  const malformed = run('render', input, output);
  assert.equal(malformed.status, 1);
  assert.ok(!malformed.stderr.includes('private title'));
  assert.equal(await readFile(output, 'utf8'), previous);
  assert.equal(run('invalid').status, 2);
  await writeFile(input, JSON.stringify(fixture));
  await assert.rejects(renderFile(input, input), /different files/);
  const alias = join(dir, 'alias.json');
  await symlink(input, alias);
  await assert.rejects(renderFile(input, alias), /different files/);
});

test('locale is explicit, supported, and determines the branded document title', async () => {
  for (const [locale, title] of [
    ['ko', 'Mira의 Stellar'],
    ['en', 'Mira’s Stellar'],
  ]) {
    const data = fresh();
    data.locale = locale;
    const html = await renderWorkMap(data);
    assert.ok(html.includes(`<title>${title}</title>`));
    assert.ok(html.includes(`<html lang="${locale}">`));
    assert.ok(!/\{\{ui\.[\w.]+\}\}/.test(html));
    const embedded = JSON.parse(
      html.match(
        /<script type="application\/json" id="data">([\s\S]*?)<\/script>/,
      )[1],
    );
    assert.deepEqual(
      embedded.issues,
      data.issues,
      'locale does not translate or rewrite source facts',
    );
  }
  invalid(
    (d) => {
      delete d.locale;
    },
    'schema',
    '/locale',
  );
  invalid(
    (d) => {
      d.locale = 'fr';
    },
    'schema',
    '/locale',
  );
  invalid(
    (d) => {
      d.title = 'An arbitrary report title';
    },
    'schema',
    '/title',
  );
});

test('bundled locale catalogs have the same keys and interpolation parameters', async () => {
  const catalogs = await Promise.all(
    ['ko', 'en'].map(async (locale) =>
      JSON.parse(
        await readFile(
          new URL(`../assets/viewer/locales/${locale}.json`, import.meta.url),
          'utf8',
        ),
      ),
    ),
  );
  assert.deepEqual(
    Object.keys(catalogs[0]).sort(),
    Object.keys(catalogs[1]).sort(),
  );
  const params = (value) =>
    [...value.matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();
  for (const key of Object.keys(catalogs[0])) {
    for (const catalog of catalogs)
      assert.ok(typeof catalog[key] === 'string' && catalog[key].trim(), key);
    assert.deepEqual(params(catalogs[0][key]), params(catalogs[1][key]), key);
  }
  for (const path of ['app.js', 'shell.html', 'style.css']) {
    const source = await readFile(
      new URL(`../assets/viewer/${path}`, import.meta.url),
      'utf8',
    );
    assert.ok(
      !/[가-힣]/u.test(source),
      `Fixed Korean UI copy belongs in the catalog, not ${path}`,
    );
  }
});
