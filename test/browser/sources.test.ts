import { must } from '../support.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.ts';
import { mixedCapture, mixedMap } from '../fixtures.ts';

for (const locale of ['ko', 'en'] as const)
  void test(
    `mixed sources in ${locale}: colliding identifiers navigate independently with provenance`,
    { timeout: 60000 },
    async (t) => {
      const dir = await mkdtemp(join(tmpdir(), 'stellar-sources-'));
      t.after(() => rm(dir, { recursive: true, force: true }));
      const browser = await chromium.launch({
        headless: true,
        ...(process.env['STELLAR_CHROME']
          ? { executablePath: process.env['STELLAR_CHROME'] }
          : {}),
      });
      t.after(() => browser.close());
      const page = await browser.newPage({
        viewport: { width: 1600, height: 1000 },
      });
      const errors: string[] = [],
        requests: string[] = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (r) => {
        if (/^https?:/.test(r.url())) requests.push(r.url());
      });
      const capture = mixedCapture();
      must(capture.records[2]).data['state'] = 'closed';
      must(capture.records[2]).data['state_reason'] = 'duplicate';
      const data = mixedMap(capture);
      data.locale = locale;
      must(data.issues[0]).status = { type: 'backlog', label: 'Queued' };
      must(data.issues[1]).title = 'Follow up on OBS-1';
      must(data.issues[1]).status = { type: 'started', label: 'Investigating' };
      const file = join(dir, 'mixed.html');
      await writeFile(file, await renderWorkMap(data));
      await page.goto(pathToFileURL(file).href);
      await page.waitForFunction(() => window.stellar);
      assert.equal(
        await page.locator('#brand-subtitle').textContent(),
        'Linear + GitHub',
      );
      assert.ok(
        must(await page.locator('#snapshot').textContent()).includes(
          locale === 'ko' ? '조회 제한' : 'Incomplete coverage',
        ),
      );
      assert.ok(
        must(
          await page.locator('#brand-subtitle').getAttribute('title'),
        ).includes('github.com/example/delivery'),
      );
      await page.locator('#search').fill('#7');
      assert.equal(await page.locator('.search-result').count(), 2);
      for (const issue of data.issues.filter((i) => i.identifier === '#7')) {
        await page.locator('#search').fill('#7');
        const result = page.locator(
          `#search-results [data-issue="${issue.id}"]`,
        );
        assert.ok(
          must(await result.textContent()).includes(
            must(data.sources.find((s) => s.id === issue.sourceId)).namespace,
          ),
        );
        await result.click();
        assert.equal(
          await page.locator('#inspector h2').textContent(),
          issue.title,
        );
        assert.equal(
          await page
            .locator('#inspector a.primary-button')
            .getAttribute('href'),
          issue.url,
        );
        assert.ok(
          must(await page.locator('.issue-source').textContent()).includes(
            'GitHub',
          ),
        );
        const state = await page.evaluate(() => window.stellar.getState());
        assert.equal(must(state.selected).id, issue.id);
        assert.equal(state.baseCount, 4);
        const expected = data.relations.filter(
          (e) => e.source === issue.id || e.target === issue.id,
        );
        assert.deepEqual(
          state.edges
            .filter((e) => e.kind !== 'classification')
            .flatMap((e) => e.actual),
          expected,
        );
        assert.ok(
          must(await page.locator('#nodes').textContent()).includes('#7'),
        );
      }
      await page.locator('#search').fill('github.com/example/control');
      assert.equal(await page.locator('.search-result').count(), 1);
      await page.locator('#search').fill('example/control#7');
      assert.equal(await page.locator('.search-result').count(), 1);
      await page.locator('#search').fill('OBS-1');
      assert.equal(
        await page.locator('.search-result').first().getAttribute('data-issue'),
        must(data.issues[0]).id,
      );
      await page.locator('#search').fill('');
      await page.locator('#scope').selectOption('closed');
      assert.equal(
        await page.evaluate(() => window.stellar.getState().baseCount),
        1,
      );
      await page.locator('#search').fill('example/control#7');
      await page.locator('.search-result').click();
      assert.ok(
        must(await page.locator('#inspector').textContent()).includes(
          'closed · duplicate',
        ),
      );
      await page.locator('#search').fill('');
      await page.locator('#scope').selectOption('all');
      await page.locator('#help-open').click();
      assert.equal(await page.locator('.source-card').count(), 3);
      for (const source of data.sources)
        assert.ok(
          must(await page.locator('#modal-content').textContent()).includes(
            source.notes,
          ),
        );
      await page.keyboard.press('Escape');
      if (process.env['STELLAR_QA_DIR']) {
        await mkdir(process.env['STELLAR_QA_DIR'], { recursive: true });
        await page.screenshot({
          path: join(
            process.env['STELLAR_QA_DIR'],
            `${locale}-mixed-sources.png`,
          ),
        });
      }
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(180);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
      );
      assert.deepEqual(errors, []);
      assert.deepEqual(requests, []);
    },
  );
