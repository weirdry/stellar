import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.js';

const fixture = JSON.parse(
  await readFile(
    new URL('../../examples/museum.json', import.meta.url),
    'utf8',
  ),
);

async function openMap(t, data) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-regression-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
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
  page.on('pageerror', (error) => errors.push(error.message));
  t.after(() => assert.deepEqual(errors, []));
  const path = join(dir, 'map.html');
  await writeFile(path, await renderWorkMap(data));
  await page.goto(pathToFileURL(path).href);
  await page.waitForFunction(() => window.stellar);
  await page.waitForTimeout(150); // the viewer's resize debounce
  return page;
}

async function screenshot(page, name) {
  if (!process.env.STELLAR_QA_DIR) return;
  await mkdir(process.env.STELLAR_QA_DIR, { recursive: true });
  await page.mouse.move(2, 2);
  await page.screenshot({
    path: join(process.env.STELLAR_QA_DIR, name + '.png'),
  });
}

test('opposite relations remain independently clickable in both input orders and graph views', async (t) => {
  const data = structuredClone(fixture);
  data.domains = data.domains.slice(0, 1);
  data.categories = data.categories.slice(0, 2);
  data.issues = data.issues.slice(0, 2);
  data.issues[1].classification.category = data.categories[1].id;
  data.relations = [
    { kind: 'blocks', source: 'MUS-1', target: 'MUS-2' },
    { kind: 'blocks', source: 'MUS-2', target: 'MUS-1' },
  ];

  for (const reverse of [false, true]) {
    if (reverse) data.relations.reverse();
    const page = await openMap(t, data);
    for (const view of ['overview', 'neighborhood']) {
      if (view === 'neighborhood') {
        await page.locator('#search').fill('MUS-1');
        await page.locator('#search-results [data-issue="MUS-1"]').click();
      }
      const edges = await page.evaluate(() =>
        window.stellar
          .getState()
          .edges.filter((edge) => edge.kind === 'blocks'),
      );
      assert.equal(edges.length, 2);
      for (const edge of edges) {
        const path = page.locator(`[data-edge="${edge.id}"] .graph-edge`);
        assert.equal(
          await path.getAttribute('marker-end'),
          'url(#arrow-blocks)',
        );
        // Sample away from the central area node in the collapsed view.
        const point = await path.evaluate((element) => {
          const p = element
            .getPointAtLength(element.getTotalLength() * 0.3)
            .matrixTransform(element.getScreenCTM());
          return {
            x: p.x,
            y: p.y,
            hit: document.elementFromPoint(p.x, p.y)?.closest('[data-edge]')
              ?.dataset.edge,
          };
        });
        assert.equal(
          point.hit,
          edge.id,
          `${view}: each relation has its own click target`,
        );
        await page.mouse.click(point.x, point.y);
        assert.deepEqual(
          await page.locator('#inspector .info-note p').allTextContents(),
          edge.actual.map(
            (relation) => `${relation.source} → ${relation.target}`,
          ),
          'the selected edge shows its original directed relation',
        );
      }
      if (view === 'neighborhood') {
        const boxes = await page.locator('.edge-label').evaluateAll((labels) =>
          labels
            .filter((label) => label.style.display !== 'none')
            .map((label) => {
              const box = label.getBoundingClientRect();
              return {
                left: box.left,
                right: box.right,
                top: box.top,
                bottom: box.bottom,
              };
            }),
        );
        assert.equal(boxes.length, 2);
        const [a, b] = boxes;
        assert.ok(
          a.right <= b.left ||
            b.right <= a.left ||
            a.bottom <= b.top ||
            b.bottom <= a.top,
          'opposite relation labels do not overlap in the fitted neighborhood',
        );
      }
      if (!reverse) await screenshot(page, 'reciprocal-' + view);
    }
  }
});

test('target selection preserves whitespace and markup-like text from dropdowns and tags', async (t) => {
  const data = structuredClone(fixture);
  const targets = [
    'Research tools',
    'Research  tools',
    '  도구\t"R&D" <widgets>  ',
  ];
  data.issues.forEach((issue, index) => {
    issue.targets = index < targets.length ? [targets[index]] : [];
  });
  const page = await openMap(t, data);
  assert.deepEqual(
    await page
      .locator('#target option')
      .evaluateAll((options) => options.map((option) => option.value).sort()),
    ['', ...targets].sort(),
    'option values preserve literal target identities',
  );
  const assertMatch = async (target, id) => {
    const state = await page.evaluate(() => window.stellar.getState());
    assert.equal(state.target, target);
    assert.deepEqual(
      state.nodes
        .filter((node) => node.type === 'issue')
        .map((node) => node.key),
      [id],
    );
    assert.equal(await page.locator('#target').inputValue(), target);
    assert.equal(await page.locator('#empty').isVisible(), false);
  };
  for (const [index, target] of targets.entries()) {
    const id = data.issues[index].id;
    await page.locator('#target').selectOption({ value: target });
    await assertMatch(target, id);
    await page.locator('#search').fill(id);
    await page.locator(`#search-results [data-issue="${id}"]`).click();
    await page.locator('#inspector [data-target]').click();
    await assertMatch(target, id);
    await screenshot(page, 'literal-target-' + index);
    await page.locator('#target-clear').click();
    assert.equal(await page.locator('#target').inputValue(), '');
  }
  assert.equal(await page.locator('widgets, #target img').count(), 0);
});
