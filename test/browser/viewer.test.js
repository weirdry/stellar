import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.js';

for (const locale of ['ko', 'en'])
  test(
    `standalone ${locale} work map: source-faithful exploration, reusable UI and safe text`,
    { timeout: 120000 },
    async (t) => {
      const dir = await mkdtemp(join(tmpdir(), 'stellar-browser-'));
      t.after(() => rm(dir, { recursive: true, force: true }));
      const browser = await chromium.launch({
        headless: true,
        ...(process.env.STELLAR_CHROME
          ? { executablePath: process.env.STELLAR_CHROME }
          : {}),
      });
      t.after(() => browser.close());
      const context = await browser.newContext({
        viewport: { width: 1600, height: 1000 },
        locale: locale === 'ko' ? 'en-US' : 'ko-KR', // Artifact locale wins over the browser.
        acceptDownloads: true,
      });
      const page = await context.newPage(),
        errors = [],
        requests = [];
      page.on('pageerror', (e) => errors.push(e.message));
      page.on('request', (req) => {
        if (/^https?:/.test(req.url())) requests.push(req.url());
      });
      const state = () => page.evaluate(() => window.stellar.getState());
      const shot = async (name) => {
        if (!process.env.STELLAR_QA_DIR) return;
        await mkdir(process.env.STELLAR_QA_DIR, { recursive: true });
        await page.mouse.move(2, 2);
        await page.screenshot({
          path: join(process.env.STELLAR_QA_DIR, locale + '-' + name + '.png'),
        });
      };
      const load = async (data) => {
        const file = join(dir, 'map.html');
        await writeFile(file, await renderWorkMap(data));
        await page.goto(pathToFileURL(file).href);
        await page.waitForFunction(() => window.stellar);
        await page.waitForTimeout(150); // the viewer's resize debounce
      };
      const data = JSON.parse(
        await readFile(
          new URL('../../examples/museum.json', import.meta.url),
          'utf8',
        ),
      );
      data.locale = locale;
      await load(data);
      assert.equal((await state()).baseCount, 9);
      assert.equal(await page.locator('.tree-domain').count(), 3);
      assert.equal(
        await page.locator('#brand-title').textContent(),
        locale === 'ko' ? 'Mira의 Stellar' : 'Mira’s Stellar',
      );
      assert.equal(
        await page.title(),
        locale === 'ko' ? 'Mira의 Stellar' : 'Mira’s Stellar',
      );
      assert.equal(await page.locator('html').getAttribute('lang'), locale);
      assert.equal(
        await page.locator('#overview').textContent(),
        locale === 'ko' ? '전체 지도' : 'Overview',
      );
      assert.equal(
        await page.locator('#search').getAttribute('placeholder'),
        locale === 'ko' ? '이슈 ID · 제목 검색' : 'Search issue ID or title',
      );
      await shot('overview-dark');
      await page.locator('[data-node="d:exhibits"]').click();
      assert.ok(
        (
          await page
            .locator('[data-tree-domain="exhibits"]')
            .getAttribute('class')
        ).includes('selected'),
      );
      await page.locator('#tree [data-category="story"]').click();
      assert.equal((await state()).selected.id, 'story');
      assert.equal(
        (await state()).nodes.filter((n) => n.type === 'issue').length,
        2,
      );
      const before = (await state()).transform,
        box = await page.locator('#graph').boundingBox();
      await page.mouse.move(box.x + 65, box.y + 140);
      await page.mouse.down();
      await page.mouse.move(box.x + 125, box.y + 176, { steps: 6 });
      await page.mouse.up();
      assert.ok(Math.abs((await state()).transform.x - before.x - 60) < 1);
      const zoomBefore = (await state()).transform.k;
      await page.mouse.wheel(0, -100);
      await page.waitForFunction(
        (k) => window.stellar.getState().transform.k > k,
        zoomBefore,
      );
      await page.keyboard.press('f');
      const select = async (id) => {
        await page.locator('#search').fill(id);
        await page.locator(`#search-results [data-issue="${id}"]`).click();
      };
      const neighbors = async (id) => {
        const s = await state(),
          relations = data.relations.filter(
            (e) => e.source === id || e.target === id,
          );
        const expected = [
          ...new Set([id, ...relations.flatMap((e) => [e.source, e.target])]),
        ].sort();
        assert.deepEqual(
          s.nodes
            .filter((n) => n.type === 'issue')
            .map((n) => n.key)
            .sort(),
          expected,
        );
        assert.deepEqual(
          s.edges
            .filter((e) => e.kind !== 'classification')
            .flatMap((e) => e.actual),
          relations,
        );
        assert.equal(s.baseCount, 9);
        for (const e of s.edges.filter((e) =>
          ['blocks', 'parent', 'duplicate'].includes(e.kind),
        )) {
          assert.equal(
            await page
              .locator(`[data-edge="${e.id}"] .graph-edge`)
              .getAttribute('marker-end'),
            `url(#arrow-${e.kind})`,
          );
          assert.equal(e.source, 'i:' + e.actual[0].source);
          assert.equal(e.target, 'i:' + e.actual[0].target);
        }
      };
      for (const issue of data.issues.filter((i) => i.scope === 'assigned')) {
        await select(issue.id);
        await neighbors(issue.id);
      }
      await select('MUS-1');
      assert.ok((await state()).nodes.find((n) => n.key === 'CTX-2').ghost);
      await page.locator('#inspector [data-issue="CTX-2"]').click();
      await neighbors('CTX-2');
      assert.ok(
        (await page.locator('#inspector').textContent()).includes('미조회'),
      );
      await page.locator('#back').click();
      assert.equal((await state()).selected.id, 'MUS-1');
      await page.locator('[data-edge-toggle="parent"]').uncheck();
      assert.ok(!(await state()).nodes.some((n) => n.key === 'MUS-10'));
      await page.locator('[data-edge-toggle="parent"]').check();
      await neighbors('MUS-1');
      await shot('neighborhood-dark');
      await page.locator('#theme').click();
      assert.ok(
        (await page.locator('body').getAttribute('class')).includes('light'),
      );
      await shot('neighborhood-light');
      const downloadEvent = page.waitForEvent('download');
      await page.locator('#export').click();
      const download = await downloadEvent,
        exportPath = join(dir, 'export.svg');
      await download.saveAs(exportPath);
      assert.equal(download.suggestedFilename(), 'museum-work-map-MUS-1.svg');
      const svg = await readFile(exportPath, 'utf8');
      assert.ok(
        svg.includes('MUS-1') &&
          svg.includes(locale === 'ko' ? 'Mira의 Stellar' : 'Mira’s Stellar'),
      );
      const exported = await context.newPage();
      await exported.goto(pathToFileURL(exportPath).href);
      assert.equal(await exported.locator('parsererror').count(), 0);
      assert.ok(await exported.locator('svg').count());
      await exported.close();
      await page.locator('#target').selectOption('접근성');
      const matching = data.issues.filter(
        (i) =>
          i.scope === 'assigned' &&
          ['started', 'unstarted', 'backlog'].includes(i.status.type) &&
          i.targets.includes('접근성'),
      );
      assert.equal(
        (await state()).nodes.filter((n) => n.type === 'issue').length,
        matching.length,
      );
      for (const e of (await state()).edges
        .filter((e) => e.kind !== 'classification')
        .flatMap((e) => e.actual))
        assert.ok(
          data.relations.some(
            (source) => JSON.stringify(e) === JSON.stringify(source),
          ),
        );
      await shot('target-light');
      await page.locator('#overview').click();
      await page.locator('#scope').selectOption('all');
      assert.equal((await state()).baseCount, 12);
      await page.locator('#maps-open').click();
      assert.equal(await page.locator('.mapcard').count(), 1);
      await page.keyboard.press('Escape');
      await page.locator('#help-open').click();
      assert.ok(
        (await page.locator('#modal').textContent()).includes(
          data.sources[0].notes,
        ),
      );
      await page.keyboard.press('Escape');
      for (const [width, height] of [
        [1440, 900],
        [1920, 1080],
        [2048, 1320],
        [1024, 768],
        [390, 844],
      ]) {
        await page.setViewportSize({ width, height });
        await page.waitForTimeout(180);
        const dims = await page.evaluate(() => ({
          width: document.documentElement.scrollWidth,
          height: document.documentElement.scrollHeight,
          stage: document.querySelector('#stage').clientWidth,
        }));
        assert.ok(
          dims.width <= width && dims.height <= height && dims.stage > 250,
          JSON.stringify(dims),
        );
        if (width === 390) {
          await shot('mobile-overview');
          await page.locator('#tree-toggle').click();
          await select('MUS-1');
          assert.equal(await page.locator('#sidebar').isVisible(), false);
          await page.locator('#info-toggle').click();
          assert.equal(await page.locator('#inspector').isVisible(), true);
          await shot('mobile-inspector');
          await page.locator('#info-toggle').click();
        }
      }
      await page.setViewportSize({ width: 1600, height: 1000 });
      const other = JSON.parse(
        await readFile(
          new URL('../../examples/seed-library.json', import.meta.url),
          'utf8',
        ),
      );
      await load(other);
      assert.equal(await page.title(), 'Rowan’s Stellar');
      assert.equal(await page.locator('#overview').textContent(), 'Overview');
      assert.equal((await state()).baseCount, 3);
      assert.equal(await page.locator('#maps-open').isVisible(), false);
      assert.equal(
        await page.locator('#brand-subtitle').textContent(),
        other.sources[0].name,
      );
      await shot('seed-library');
      await page.locator('#help-open').click();
      assert.equal(
        await page.locator('#modal-title').textContent(),
        'Reading your Stellar',
      );
      assert.ok(
        !(await page.locator('body').innerText()).match(/[가-힣]/u),
        'English fixture has no Korean fixed UI',
      );
      await page.keyboard.press('Escape');
      const attack =
        '</script><script>window.pwned=true</script><img src=x onerror=alert(1)> __CSS__';
      other.owner = attack;
      other.issues[0].title = attack;
      other.issues[0].status.label = '__proto__';
      await load(other);
      await select('SEED-1');
      assert.equal(await page.locator('#inspector h2').textContent(), attack);
      assert.equal(
        await page.locator('#brand-title').textContent(),
        attack + '’s Stellar',
      );
      assert.equal(await page.evaluate(() => window.pwned), undefined);
      assert.equal(await page.locator('#inspector img').count(), 0);
      await page.setViewportSize({ width: 390, height: 844 });
      await page.waitForTimeout(180);
      assert.ok(
        await page.evaluate(
          () => document.documentElement.scrollWidth <= innerWidth,
        ),
        'long authored header remains inside the viewport',
      );

      other.issues = [];
      other.relations = [];
      other.domains = [];
      other.categories = [];
      await load(other);
      assert.equal(await page.locator('#empty').isVisible(), true);
      assert.deepEqual(errors, []);
      assert.deepEqual(
        requests,
        [],
        'opening a report makes no network requests',
      );
    },
  );
