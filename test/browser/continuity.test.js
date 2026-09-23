import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.ts';
import {
  rememberMap,
  applyChoices,
  refreshState,
} from '../../lib/continuity.ts';
import { mixedCapture, mixedMap } from '../fixtures.js';

test(
  'refreshed viewer combines saved user grouping with current status and excludes remembered absent work',
  { timeout: 60000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'stellar-refresh-browser-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const map = mixedMap();
    map.attachments = [
      {
        title: 'Work context',
        note: 'Web reference',
        href: 'https://example.com/context.html',
      },
    ];
    const saved = rememberMap(map);
    const revised = applyChoices(
      saved,
      {
        categories: [
          {
            id: 'shared-tools',
            domain: 'research',
            label: 'Research tooling',
            basis: 'User-selected shared capability',
          },
        ],
        issues: [
          {
            issueId: saved.map.issues[2].id,
            classification: {
              category: 'shared-tools',
              rationale: 'Explicit user choice',
            },
            targets: ['Shared tooling'],
          },
        ],
      },
      'user',
    );
    const capture = mixedCapture();
    capture.records[2].data.state = 'closed';
    capture.records[2].data.state_reason = 'completed';
    capture.records.pop();
    const refreshed = refreshState(revised, capture);
    assert.equal(refreshed.memory.length, 5);
    assert.equal(refreshed.map.issues.length, 4);
    const html = await renderWorkMap(refreshed.map);
    assert.ok(!html.includes(saved.map.issues[4].title));
    const file = join(dir, 'refreshed.html');
    await writeFile(file, html);
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.STELLAR_CHROME
        ? { executablePath: process.env.STELLAR_CHROME }
        : {}),
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [],
      requests = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('request', (r) => {
      if (/^https?:/.test(r.url())) requests.push(r.url());
    });
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.stellar);
    await page.locator('#scope').selectOption('all');
    await page.locator('[data-node="d:research"]').click();
    await page.locator('#tree [data-category="shared-tools"]').click();
    assert.equal(
      (await page.evaluate(() => window.stellar.getState())).selected.id,
      'shared-tools',
    );
    await page.locator('#search').fill('example/control#7');
    await page.locator('.search-result').click();
    const inspector = await page.locator('#inspector').textContent();
    assert.ok(inspector.includes('Research tooling'));
    assert.ok(inspector.includes('Shared tooling'));
    assert.ok(inspector.includes('closed · completed'));
    await page.locator('#search').fill('');
    await page.locator('#scope').selectOption('completed');
    assert.equal(
      (await page.evaluate(() => window.stellar.getState())).baseCount,
      1,
    );
    await page.locator('#search').fill(saved.map.issues[4].title);
    assert.equal(await page.locator('.search-result').count(), 0);
    await page.locator('#maps-open').click();
    assert.equal(
      await page.locator('.mapcard').getAttribute('href'),
      map.attachments[0].href,
    );
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
  },
);

test(
  'unqueried context does not display an unresolved classification after repeated refreshes',
  { timeout: 60000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'stellar-pending-browser-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const saved = rememberMap(mixedMap()),
      capture = mixedCapture();
    capture.records[3].data.body =
      'A changed research objective awaiting classification.';
    const pending = refreshState(saved, capture);
    capture.records.splice(3, 1);
    const state = refreshState(refreshState(pending, capture), capture);
    assert.deepEqual(
      state.changes.review.map((r) => r.reason),
      ['purpose-text-changed'],
    );
    const file = join(dir, 'pending.html');
    await writeFile(file, await renderWorkMap(state.map));
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.STELLAR_CHROME
        ? { executablePath: process.env.STELLAR_CHROME }
        : {}),
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      viewport: { width: 1600, height: 1000 },
    });
    const errors = [];
    page.on('pageerror', (e) => errors.push(e.message));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.stellar);
    await page.locator('#search').fill('example/delivery#7');
    await page.locator('.search-result').click();
    const inspector = await page.locator('#inspector').textContent();
    assert.ok(inspector.includes('Not queried'));
    assert.ok(!inspector.includes('Delivery operations'));
    assert.ok(!inspector.includes('Shared delivery infrastructure'));
    assert.deepEqual(errors, []);
  },
);

for (const [locale, label, unknown] of [
  ['ko', '이전 조회에 근거한 분류', '상세 미조회'],
  [
    'en',
    'Classification based on a previous observation',
    'Details not fetched',
  ],
]) {
  test(
    `the ${locale} inspector distinguishes retained evidence from current context classification`,
    { timeout: 60000 },
    async (t) => {
      const dir = await mkdtemp(join(tmpdir(), 'stellar-evidence-browser-'));
      t.after(() => rm(dir, { recursive: true, force: true }));
      const map = mixedMap(),
        capture = mixedCapture();
      map.locale = locale;
      capture.locale = locale;
      capture.records.splice(3, 1);
      const state = refreshState(rememberMap(map), capture);
      const issue = state.map.issues.find(
        (i) => i.nativeId === 'I_invented_delivery_7',
      );
      const current = applyChoices(
        state,
        {
          issues: [
            {
              issueId: issue.id,
              classification: {
                category: 'delivery',
                rationale: 'Current decision from available context',
              },
            },
          ],
        },
        'agent',
      );
      const browser = await chromium.launch({
        headless: true,
        ...(process.env.STELLAR_CHROME
          ? { executablePath: process.env.STELLAR_CHROME }
          : {}),
      });
      t.after(() => browser.close());
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      });
      const errors = [],
        requests = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      for (const [name, data, retained] of [
        ['retained', state.map, true],
        ['current', current.map, false],
      ]) {
        const file = join(dir, name + '.html');
        await writeFile(file, await renderWorkMap(data));
        await page.goto(pathToFileURL(file).href);
        await page.waitForFunction(() => window.stellar);
        await page.locator('#search').fill('example/delivery#7');
        await page.locator('.search-result').click();
        const inspector = await page.locator('#inspector').textContent();
        assert.ok(inspector.includes(unknown));
        assert.ok(inspector.includes('Delivery operations'));
        assert.equal(inspector.includes(label), retained);
        assert.equal(
          await page.locator('.classification-evidence').count(),
          retained ? 1 : 0,
        );
        if (retained) {
          const box = await page
            .locator('.classification-evidence')
            .boundingBox();
          const panel = await page.locator('#inspector').boundingBox();
          assert.ok(
            box.x >= panel.x && box.x + box.width <= panel.x + panel.width + 1,
          );
          assert.ok(inspector.includes(issue.classification.rationale));
        } else
          assert.ok(
            inspector.includes('Current decision from available context'),
          );
        assert.equal(
          (await page.evaluate(() => window.stellar.getState())).baseCount,
          3,
        );
      }
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
    },
  );
}
