import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.js';
import {
  rememberMap,
  applyChoices,
  refreshState,
} from '../../lib/continuity.js';
import { mixedCapture, mixedMap } from '../fixtures.js';

test(
  'refreshed viewer combines saved user grouping with current status and excludes remembered absent work',
  { timeout: 60000 },
  async (t) => {
    const dir = await mkdtemp(join(tmpdir(), 'stellar-refresh-browser-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const saved = rememberMap(mixedMap());
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
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
  },
);
