import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.js';
import { mixedCapture, mixedMap } from '../fixtures.js';

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

for (const locale of ['ko', 'en'])
  test(`coverage and unqueried labels use report locale ${locale} while source labels stay literal`, async (t) => {
    const capture = mixedCapture();
    capture.locale = locale === 'ko' ? 'en' : 'ko';
    const originalLabel = capture.locale === 'ko' ? '미조회' : 'Not queried';
    capture.records[0].data.status = originalLabel;
    capture.records[0].data.relations.relatedTo = [
      { id: 'EXT-99', title: 'Unfetched reference' },
    ];
    const data = mixedMap(capture);
    data.locale = locale;
    const context = data.issues.find((i) => i.detail === 'unqueried');
    assert.equal(context.status.label, originalLabel);
    const expectedLabel = locale === 'ko' ? '미조회' : 'Not queried';
    const incomplete = locale === 'ko' ? '조회 제한' : 'Incomplete coverage';
    for (const coverage of ['complete', 'partial', 'unavailable']) {
      for (const source of data.sources)
        source.coverage = { issues: 'complete', relations: coverage };
      const page = await openMap(t, data);
      assert.equal(
        (await page.locator('#snapshot').textContent()).includes(incomplete),
        coverage !== 'complete',
      );
      await page.locator('#help-open').click();
      const coverageLabel =
        locale === 'ko'
          ? {
              complete: '명시한 범위 내 완료',
              partial: '부분 조회',
              unavailable: '조회 불가',
            }[coverage]
          : {
              complete: 'Complete within scope',
              partial: 'Partial',
              unavailable: 'Unavailable',
            }[coverage];
      assert.ok(
        (await page.locator('.source-card').first().textContent()).includes(
          coverageLabel,
        ),
      );
      await page.keyboard.press('Escape');
      await page.locator('#search').fill('EXT-99');
      assert.ok(
        (await page.locator('.search-result').textContent()).includes(
          expectedLabel,
        ),
      );
      assert.ok(
        !(await page.locator('.search-result').textContent()).includes(
          originalLabel,
        ),
      );
      await page.locator('.search-result').click();
      assert.equal(
        await page.locator('#inspector > .pill').textContent(),
        expectedLabel,
      );
      assert.equal(
        await page.evaluate(() => window.stellar.getState().baseCount),
        4,
      );
      await page.locator('#search').fill('OBS-1');
      await page.locator('.search-result').click();
      assert.equal(
        await page.locator('#inspector > .pill').textContent(),
        originalLabel,
      );
      assert.equal(
        context.status.label,
        originalLabel,
        'rendering must not rewrite input data',
      );
      if (coverage === 'unavailable') {
        await page.locator('#search').fill('EXT-99');
        await page.locator('.search-result').click();
        await screenshot(page, locale + '-unavailable-context');
      }
      await page.close();
    }
  });

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

test('browser modifier shortcuts leave the camera and default action alone', async (t) => {
  const page = await openMap(t, fixture);
  await page.locator('#zoom-in').click();
  const checks = await page.evaluate(() => {
    const before = window.stellar.getState().transform;
    return ['metaKey', 'ctrlKey', 'altKey'].flatMap((modifier) =>
      ['f', '/', '+', '=', '-'].map((key) => {
        const event = new KeyboardEvent('keydown', {
          key,
          [modifier]: true,
          bubbles: true,
          cancelable: true,
        });
        document.body.dispatchEvent(event);
        return {
          key,
          modifier,
          prevented: event.defaultPrevented,
          before,
          after: window.stellar.getState().transform,
        };
      }),
    );
  });
  for (const check of checks) {
    assert.equal(check.prevented, false, `${check.modifier}+${check.key}`);
    assert.deepEqual(
      check.after,
      check.before,
      `${check.modifier}+${check.key}`,
    );
  }
  const zoomed = await page.evaluate(
    () => window.stellar.getState().transform.k,
  );
  await page.keyboard.press('f');
  assert.ok(
    (await page.evaluate(() => window.stellar.getState().transform.k)) < zoomed,
  );
  await page.keyboard.press('/');
  assert.equal(
    await page
      .locator('#search')
      .evaluate((el) => el === document.activeElement),
    true,
  );
});

test('empty or dismissed search results cannot be selected with Enter', async (t) => {
  const page = await openMap(t, fixture);
  await page.locator('#search').fill('MUS-2');
  await page.locator('#search-results [data-issue="MUS-2"]').click();
  await page.locator('#overview').click();
  await page.keyboard.press('/');
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => window.stellar.getState().selected),
    null,
  );
  await page.locator('#search').fill('MUS-1');
  await page.keyboard.press('Escape');
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => window.stellar.getState().selected),
    null,
  );
  await page.locator('#search').fill('MUS-2');
  await page.keyboard.press('Enter');
  assert.equal(
    await page.evaluate(() => window.stellar.getState().selected.id),
    'MUS-2',
  );
});

test('reselecting the same node does not add redundant navigation history', async (t) => {
  const page = await openMap(t, fixture);
  await page.locator('#search').fill('MUS-1');
  await page.locator('#search-results [data-issue="MUS-1"]').click();
  await page.locator('[data-node="i:MUS-1"]').click();
  await page.locator('[data-node="i:MUS-1"]').click();
  await page.locator('#back').click();
  assert.equal(
    await page.evaluate(() => window.stellar.getState().selected),
    null,
  );
  assert.equal(await page.locator('#back').isDisabled(), true);
});

test('context search, scope labels and target tags preserve the counting boundary in both locales', async (t) => {
  for (const locale of ['ko', 'en']) {
    const data = structuredClone(fixture);
    data.locale = locale;
    const context = data.issues.find((i) => i.id === 'CTX-2');
    const sharedTarget = data.issues[0].targets[0];
    context.targets = ['Only context', sharedTarget];
    const page = await openMap(t, data);
    const outside =
      locale === 'ko' ? '현재 상태 필터 밖' : 'Outside current status filter';
    const contextLabel =
      locale === 'ko' ? '집계 밖 맥락 이슈' : 'Context issue outside totals';
    await page.locator('#search').fill('MUS-1');
    await page.keyboard.press('Enter');
    const parentRow = page.locator('#inspector [data-issue="MUS-10"] small');
    assert.equal(await parentRow.textContent(), 'Done · ' + outside);
    assert.equal(
      await page.locator('#inspector [data-issue="CTX-2"] small').textContent(),
      (locale === 'ko' ? '미조회' : 'Not queried') + ' · ' + contextLabel,
    );
    const caption = await page.locator('#canvas-caption').textContent();
    assert.ok(
      caption.includes(locale === 'ko' ? '맥락 이슈 1개' : 'Context issues: 1'),
    );
    assert.ok(
      caption.includes(
        locale === 'ko' ? '상태 필터 밖 1개' : 'Outside status filter: 1',
      ),
    );
    await page.locator('[data-node="i:MUS-10"] .node-hit').hover();
    assert.ok((await page.locator('#tooltip').textContent()).includes(outside));
    assert.ok(
      !(await page.locator('#tooltip').textContent()).includes(contextLabel),
    );
    await page.locator('#search').fill(context.title);
    const result = page.locator('#search-results [data-issue="CTX-2"]');
    assert.equal(await result.count(), 1);
    assert.ok((await result.textContent()).includes(contextLabel));
    await result.click();
    assert.equal(
      await page.evaluate(() => window.stellar.getState().baseCount),
      9,
    );
    assert.ok(
      (await page.locator('#inspector').textContent()).includes(contextLabel),
    );
    const tag = page
      .locator('#inspector span.tag.target')
      .filter({ hasText: 'Only context' });
    assert.equal(await tag.count(), 1);
    assert.ok(await tag.getAttribute('title'));
    assert.equal(
      await page.locator('#inspector [data-target="Only context"]').count(),
      0,
    );
    assert.equal(
      await page.locator('#target option[value="Only context"]').count(),
      0,
    );
    await screenshot(page, locale + '-context-scope');
    await page.locator('#inspector button[data-target]').click();
    assert.equal(await page.locator('#target').inputValue(), sharedTarget);
    assert.equal(
      await page.evaluate(() => window.stellar.getState().target),
      sharedTarget,
    );
    assert.ok(
      !(await page.evaluate(() => window.stellar.getState().nodes)).some(
        (n) => n.key === 'CTX-2',
      ),
    );
    await page.locator('#target-clear').click();
    await page.locator('#scope').selectOption('all');
    assert.equal(
      await page.evaluate(() => window.stellar.getState().baseCount),
      12,
    );
    await page.locator('#search').fill('CTX-1');
    await page.keyboard.press('Enter');
    assert.equal(
      await page.evaluate(() => window.stellar.getState().selected.id),
      'CTX-1',
    );
    assert.equal(
      await page.evaluate(() => window.stellar.getState().baseCount),
      12,
    );
    if (locale === 'ko') {
      assert.equal(
        await page.locator('#scope option[value="started"]').textContent(),
        '진행 중',
      );
      assert.ok(
        (await page.locator('#inspector').textContent()).includes('Done'),
      );
    }
  }
});

test('owner text retains literal whitespace in the header and exported SVG title', async (t) => {
  for (const locale of ['ko', 'en']) {
    const data = structuredClone(fixture);
    data.locale = locale;
    data.owner = '  Alex  Two\tSpaces <&>  ';
    const expected =
      data.owner + (locale === 'ko' ? '의 Stellar' : '’s Stellar');
    const page = await openMap(t, data);
    assert.equal(await page.locator('title').textContent(), expected);
    assert.equal(await page.locator('#brand-title').textContent(), expected);
    assert.equal(
      await page.locator('#brand-title').getAttribute('title'),
      expected,
    );
    const event = page.waitForEvent('download');
    await page.locator('#export').click();
    const download = await event;
    const svg = await readFile(await download.path(), 'utf8');
    const title = await page.evaluate(
      (text) =>
        new DOMParser()
          .parseFromString(text, 'image/svg+xml')
          .querySelector('title').textContent,
      svg,
    );
    assert.ok(title.startsWith(expected + ' · '));
  }
});

test('parallel relations remain readable and selectable in a phone neighborhood', async (t) => {
  for (const locale of ['ko', 'en']) {
    const data = structuredClone(fixture);
    data.locale = locale;
    data.domains = data.domains.slice(0, 1);
    data.categories = data.categories.slice(0, 2);
    data.issues = data.issues.slice(0, 2);
    data.issues[1].classification.category = data.categories[1].id;
    data.relations = [
      { kind: 'blocks', source: 'MUS-1', target: 'MUS-2' },
      { kind: 'blocks', source: 'MUS-2', target: 'MUS-1' },
      { kind: 'related', source: 'MUS-1', target: 'MUS-2' },
      { kind: 'duplicate', source: 'MUS-2', target: 'MUS-1' },
    ];
    const page = await openMap(t, data);
    await page.locator('#search').fill('MUS-1');
    await page.keyboard.press('Enter');
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(180);
    const assertLabels = async () => {
      const boxes = await page
        .locator('.edge-label')
        .evaluateAll((labels) =>
          labels
            .filter((el) => el.style.display !== 'none')
            .map((el) => el.getBoundingClientRect().toJSON()),
        );
      assert.ok(boxes.length > 0);
      const nodeBoxes = await page
        .locator('.node-label')
        .evaluateAll((labels) =>
          labels
            .filter((el) => el.style.display !== 'none')
            .map((el) => el.getBoundingClientRect().toJSON()),
        );
      for (const x of boxes)
        for (const y of nodeBoxes) {
          assert.ok(
            x.right <= y.left ||
              y.right <= x.left ||
              x.bottom <= y.top ||
              y.bottom <= x.top,
            'relation labels must not obscure node identities',
          );
        }
      for (let a = 0; a < boxes.length; a++)
        for (let b = a + 1; b < boxes.length; b++) {
          const x = boxes[a],
            y = boxes[b];
          assert.ok(
            x.right <= y.left ||
              y.right <= x.left ||
              x.bottom <= y.top ||
              y.bottom <= x.top,
            'visible relation labels must not overlap',
          );
        }
    };
    await assertLabels();
    assert.ok(
      await page
        .locator('.edge-label')
        .evaluateAll(
          (labels) =>
            labels.filter((el) => el.style.display !== 'none').length < 4,
        ),
      'the fitted phone view suppresses crowded text without losing edges',
    );
    await screenshot(page, locale + '-phone-relations-dark');
    await page.locator('#theme').click();
    await screenshot(page, locale + '-phone-relations-light');
    const edges = (
      await page.evaluate(() => window.stellar.getState().edges)
    ).filter((e) => e.kind !== 'classification');
    assert.equal(edges.length, 4);
    for (const edge of edges) {
      const point = await page
        .locator(`[data-edge="${edge.id}"] .graph-edge`)
        .evaluate((path) => {
          for (const fraction of [0.5, 0.4, 0.6, 0.3, 0.7]) {
            const p = path
              .getPointAtLength(path.getTotalLength() * fraction)
              .matrixTransform(path.getScreenCTM());
            if (
              document.elementFromPoint(p.x, p.y)?.closest('[data-edge]')
                ?.dataset.edge === path.parentElement.dataset.edge
            )
              return { x: p.x, y: p.y };
          }
          return null;
        });
      assert.ok(point, `${edge.kind} must have an independent pointer target`);
      await page.mouse.click(point.x, point.y);
      assert.deepEqual(
        await page.locator('#inspector .info-note p').allTextContents(),
        edge.actual.map(
          (e) =>
            `${e.source} ${edge.kind === 'related' ? '↔' : '→'} ${e.target}`,
        ),
      );
      await page.locator('#info-toggle').click();
    }
    for (let i = 0; i < 6; i++) await page.locator('#zoom-in').click();
    await assertLabels();
    assert.equal(
      await page
        .locator('.edge-label')
        .evaluateAll(
          (labels) => labels.filter((el) => el.style.display !== 'none').length,
        ),
      4,
    );
  }
});
