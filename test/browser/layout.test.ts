import type { WorkMap } from '../../lib/contracts.ts';
import { must } from '../support.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium, type Page } from 'playwright';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.ts';

async function museum(locale: WorkMap['locale']) {
  const data = JSON.parse(
    await readFile(
      new URL('../../examples/museum.json', import.meta.url),
      'utf8',
    ),
  ) as WorkMap;
  data.locale = locale;
  return data;
}

async function invented(
  locale: WorkMap['locale'],
  shape: readonly number[] = [2, 2, 2],
  perGroup = 1,
) {
  const data = await museum(locale),
    template = must(data.issues[0]);
  data.view.initialScope = 'all';
  data.domains = [];
  data.categories = [];
  data.issues = [];
  data.relations = [];
  shape.forEach((count, di) => {
    const domain = `area-${di}`;
    data.domains.push({
      id: domain,
      label:
        locale === 'ko'
          ? `지역 강우 센서 보정과 주민 경보 안내 체계 ${di + 1}`
          : `Regional rainfall sensor calibration and community alerts ${di + 1}`,
      description: 'Invented area',
    });
    for (let ci = 0; ci < count; ci++) {
      const category = `${domain}-group-${ci}`;
      data.categories.push({
        id: category,
        domain,
        label:
          locale === 'ko'
            ? `현장 센서 유지 관리와 경보 문안 작성 검토 ${data.categories.length + 1}`
            : `Field sensor upkeep and alert bulletin drafting ${data.categories.length + 1}`,
        basis: 'Invented purpose',
      });
      for (let j = 0; j < perGroup; j++) {
        const n = data.issues.length + 1,
          id = `SYN-${n}`;
        data.issues.push({
          ...structuredClone(template),
          id,
          nativeId: id,
          identifier: id,
          title: `Invented task ${n}`,
          url: `https://example.com/issues/${id}`,
          targets: n % 3 === 0 ? ['Invented milestone'] : [],
          classification: {
            category,
            origin: 'agent',
            rationale: 'Invented evidence',
          },
        });
      }
    }
  });
  return data;
}

async function open(
  t: test.TestContext,
  data: unknown,
  viewport: { width: number; height: number },
  font: string | null = null,
) {
  const dir = await mkdtemp(join(tmpdir(), 'stellar-layout-'));
  t.after(() => rm(dir, { recursive: true, force: true }));
  const browser = await chromium.launch({
    headless: true,
    ...(process.env['STELLAR_CHROME']
      ? { executablePath: process.env['STELLAR_CHROME'] }
      : {}),
  });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport }),
    errors: string[] = [],
    requests: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) requests.push(request.url());
  });
  t.after(() => {
    assert.deepEqual(errors, []);
    assert.deepEqual(requests, []);
  });
  const file = join(dir, 'map.html');
  const html = await renderWorkMap(data);
  await writeFile(
    file,
    font
      ? html.replace('</style>', `body { font-family: ${font}; }</style>`)
      : html,
  );
  await page.goto(pathToFileURL(file).href);
  await page.waitForFunction(() => window.stellar);
  await page.waitForTimeout(180);
  return page;
}

async function shot(page: Page, name: string) {
  if (!process.env['STELLAR_QA_DIR']) return;
  await mkdir(process.env['STELLAR_QA_DIR'], { recursive: true });
  await page.mouse.move(1, 1);
  await page.screenshot({
    path: join(process.env['STELLAR_QA_DIR'], `${name}.png`),
  });
}

async function shown(page: Page, type: string) {
  return page
    .locator(`.graph-node.${type} .node-label`)
    .evaluateAll(
      (labels) =>
        labels.filter(
          (label: { style: { display: string } }) =>
            label.style.display !== 'none',
        ).length,
    );
}

// Measure each rendered line: empty space below a shorter subtitle is not text.
async function clearLabels(page: Page, fixedUI = true) {
  const failures = await page.evaluate((fixed) => {
    const must = <T>(value: T | null | undefined): T => {
      if (value === null || value === undefined)
        throw new Error('Missing browser fixture value');
      return value;
    };

    const overlap = (
      a: { left: number; right: number; top: number; bottom: number },
      b: DOMRect,
    ) =>
      a.left < b.right &&
      b.left < a.right &&
      a.top < b.bottom &&
      b.top < a.bottom;
    const labels = [
      ...document.querySelectorAll<SVGTextElement>('.node-label'),
    ].filter((l) => l.style.display !== 'none');
    const lines = labels.flatMap((l) =>
      [...l.querySelectorAll<SVGTextElement>('tspan')]
        .filter((s) => s.textContent)
        .map((s) => ({
          node: must(l.closest<SVGElement>('[data-node]')).dataset['node'],
          box: s.getBoundingClientRect(),
        })),
    );
    const dots = [...document.querySelectorAll<SVGElement>('.node-dot')].map(
      (d) => d.getBoundingClientRect(),
    );
    const ui = [
      '.canvas-top',
      '#canvas-caption',
      '.minimap-wrap',
      '.legend-panel',
      '.viewport-tools',
    ].map((s) => must(document.querySelector(s)).getBoundingClientRect());
    const stage = must(
        document.querySelector('#stage'),
      ).getBoundingClientRect(),
      failures = [];
    for (let i = 0; i < lines.length; i++) {
      const { node, box } = must(lines[i]);
      if (dots.some((d) => overlap(box, d))) failures.push(`${node}: node dot`);
      if (
        lines.slice(i + 1).some((l) => l.node !== node && overlap(box, l.box))
      )
        failures.push(`${node}: other text`);
      if (fixed && ui.some((r) => overlap(box, r)))
        failures.push(`${node}: fixed UI`);
      if (
        fixed &&
        (box.left < stage.left ||
          box.right > stage.right ||
          box.top < stage.top ||
          box.bottom > stage.bottom)
      )
        failures.push(`${node}: outside stage`);
    }
    return failures;
  }, fixedUI);
  assert.deepEqual(failures, []);
}

for (const locale of ['ko', 'en'] as const) {
  void test(`${locale} wide overviews preserve distinguishing ends of long area names`, async (t) => {
    const data = await invented(locale, [2, 2, 2, 2, 2, 2], 3),
      page = await open(t, data, { width: 1600, height: 1000 });
    for (const viewport of [
      { width: 1600, height: 1000 },
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
      { width: 1600, height: 1000 },
    ] as const) {
      await page.setViewportSize(viewport);
      await page.waitForTimeout(180);
      if (viewport.width === 390) continue;
      await shot(page, `${locale}-long-areas-${viewport.width}`);
      const labels = await page
        .locator('.graph-node.domain')
        .evaluateAll((nodes) => {
          const must = <T>(value: T | null | undefined): T => {
            if (value === null || value === undefined)
              throw new Error('Missing browser fixture value');
            return value;
          };
          return nodes.map((node) => ({
            id: must(node.dataset['node']).slice(2),
            visible:
              must(node.querySelector<SVGTextElement>('.node-label')).style
                .display !== 'none',
            text: [
              ...node.querySelectorAll<SVGTextElement>(
                '.node-label tspan:not(.node-sub)',
              ),
            ]
              .map((line) => line.textContent)
              .join('')
              .replace(/\s/g, ''),
          }));
        });
      assert.equal(labels.length, data.domains.length);
      for (const area of data.domains) {
        const label = labels.find((entry) => entry.id === area.id);
        assert.equal(
          must(label).visible,
          true,
          `${area.id} at ${viewport.width}`,
        );
        assert.equal(must(label).text, area.label.replace(/\s/g, ''), area.id);
      }
      await clearLabels(page);
      await associatedLabels(page);
    }
    const notice = locale === 'ko' ? '화면 밖에 남을 수' : 'off-screen';
    assert.ok(
      must(await page.locator('#fit').getAttribute('title')).includes(notice),
    );
    await page.locator('#help-open').click();
    assert.ok(
      must(await page.locator('#modal').textContent()).includes(notice),
    );
  });

  void test(`${locale} fitted overview retains every area name in common small maps`, async (t) => {
    for (const viewport of [
      { width: 390, height: 844 },
      { width: 1024, height: 768 },
    ] as const) {
      const data = await museum(locale),
        page = await open(t, data, viewport);
      await shot(page, `${locale}-museum-${viewport.width}`);
      assert.equal(await shown(page, 'domain'), 3);
      await clearLabels(page);
      assert.deepEqual(
        await page
          .locator('#data')
          .evaluate((el): unknown => JSON.parse(el.textContent)),
        data,
      );
    }
    const page = await open(t, await invented(locale, [3, 3, 3, 3, 3]), {
      width: 1600,
      height: 1000,
    });
    await shot(page, `${locale}-five-areas`);
    assert.equal(await shown(page, 'domain'), 5);
    await clearLabels(page);
  });

  void test(`${locale} target focus retains six group names on a clear desktop`, async (t) => {
    const page = await open(t, await invented(locale, [2, 2, 2], 3), {
      width: 1600,
      height: 1000,
    });
    await page.locator('#target').selectOption('Invented milestone');
    await shot(page, `${locale}-target-groups`);
    assert.equal(await shown(page, 'category'), 6);
    assert.equal(await shown(page, 'domain'), 3);
    await clearLabels(page);
  });

  void test(`${locale} short phone fit clears both caption and minimap`, async (t) => {
    const data = await invented(locale);
    data.domains.forEach((d: { label: string }, i: number) => {
      d.label =
        locale === 'ko'
          ? `해안 관측 기록 검토와 시민 안내 ${i + 1}`
          : `Coastal observation review and public guidance ${i + 1}`;
    });
    data.categories.forEach((c: { label: string }, i: number) => {
      c.label =
        locale === 'ko'
          ? `관측 실험 결과 검토와 안내 자료 제작 ${i + 1}`
          : `Observation experiment review and bulletin production ${i + 1}`;
    });
    const page = await open(t, data, { width: 320, height: 568 });
    await shot(page, `${locale}-small-phone`);
    assert.ok((await shown(page, 'domain')) > 0);
    await clearLabels(page);
    const fitted = await page.evaluate(
      () => window.stellar.getState().transform,
    );
    await page.locator('#fit').click();
    assert.deepEqual(
      await page.evaluate(() => window.stellar.getState().transform),
      fitted,
    );
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(180);
    await clearLabels(page);
    await page.setViewportSize({ width: 320, height: 568 });
    await page.waitForTimeout(180);
    assert.deepEqual(
      await page.evaluate(() => window.stellar.getState().transform),
      fitted,
    );
    await clearLabels(page);
  });
}

// Arial resolves to Liberation Sans on Ubuntu; it also reproduces the Linux
// fallback metrics on macOS without installing a font or changing the product.
for (const [name, shape, viewport, full] of [
  [
    'six-area middle grid',
    [2, 2, 2, 2, 2, 2],
    { width: 1024, height: 768 },
    true,
  ],
  ['five-area desktop', [3, 3, 3, 3, 3], { width: 1600, height: 1000 }, true],
  ['short four-group area', [4], { width: 568, height: 320 }, false],
  ['landscape four-group area', [4], { width: 667, height: 375 }, false],
] as const) {
  void test(`fallback font retains names in the ${name}`, async (t) => {
    const data = await invented('en', shape, 3),
      page = await open(t, data, viewport, 'Arial, sans-serif');
    assert.equal(await shown(page, 'domain'), must(shape).length);
    if (full) {
      const labels = await page
        .locator('.graph-node.domain')
        .evaluateAll((nodes) => {
          const must = <T>(value: T | null | undefined): T => {
            if (value === null || value === undefined)
              throw new Error('Missing browser fixture value');
            return value;
          };
          return nodes.map((node) => ({
            id: must(node.dataset['node']).slice(2),
            text: [
              ...node.querySelectorAll<SVGTextElement>(
                '.node-label tspan:not(.node-sub)',
              ),
            ]
              .map((line) => line.textContent)
              .join('')
              .replace(/\s/g, ''),
          }));
        });
      for (const area of data.domains)
        assert.equal(
          must(labels.find((l) => l.id === area.id)).text,
          area.label.replace(/\s/g, ''),
          area.id,
        );
    }
    await clearLabels(page);
    await associatedLabels(page);
    const before = await page.locator('#nodes').innerHTML(),
      camera = await page.evaluate(() => window.stellar.getState().transform);
    await page.locator('#fit').click();
    assert.deepEqual(
      await page.evaluate(() => window.stellar.getState().transform),
      camera,
    );
    assert.equal(await page.locator('#nodes').innerHTML(), before);
    assert.deepEqual(
      await page
        .locator('#data')
        .evaluate((el): unknown => JSON.parse(el.textContent)),
      data,
    );
    await shot(page, `fallback-${must(viewport).width}`);
  });
}

void test('crowded and short overviews retain area names when longer text cannot fit', async (t) => {
  for (const [shape, perGroup, viewport] of [
    [[4], 1, { width: 568, height: 320 }],
    [[3, 3, 3, 3], 12, { width: 1024, height: 768 }],
    [[1, 4, 2, 3, 1, 2], 1, { width: 740, height: 360 }],
  ] as const) {
    const page = await open(t, await invented('en', shape, perGroup), viewport);
    assert.ok(await shown(page, 'domain'));
    await clearLabels(page);
    await associatedLabels(page);
    assert.equal(
      await page.locator('.node-label[visibility="hidden"]').count(),
      0,
    );
    await shot(page, `long-area-fallback-${must(viewport).width}`);
  }
});

for (const [groups, perGroup] of [
  [2, 6],
  [3, 16],
] as const)
  void test(`${groups}-group areas keep expanded issue dots selectable without shifting area centers`, async (t) => {
    const page = await open(
      t,
      await invented('en', [groups, groups, groups], perGroup),
      {
        width: 390,
        height: 844,
      },
    );
    const centers = () =>
      page.evaluate(() =>
        window.stellar.getState().nodes.filter((n) => n.type === 'domain'),
      );
    const initialCenters = await centers();
    for (const [area, group] of [
      ['area-0', 'area-0-group-1'],
      ['area-1', 'area-1-group-0'],
    ] as const) {
      await page.locator('#tree-toggle').click();
      if (!(await page.locator(`#tree [data-category="${group}"]`).isVisible()))
        await page.locator(`[data-tree-toggle-domain="${area}"]`).click();
      await page.locator(`#tree [data-category="${group}"]`).click();
    }
    assert.deepEqual(await centers(), initialCenters);
    await shot(page, `expanded-${groups}-group-areas`);
    const collisions = await page.evaluate(() => {
      const must = <T>(value: T | null | undefined): T => {
        if (value === null || value === undefined)
          throw new Error('Missing browser fixture value');
        return value;
      };
      return [
        ...document.querySelectorAll<SVGElement>('.graph-node.issue'),
      ].flatMap((g) => {
        const b = must(
            g.querySelector<SVGElement>('.node-dot'),
          ).getBoundingClientRect(),
          x = (b.left + b.right) / 2 + b.width * 0.45,
          y = (b.top + b.bottom) / 2;
        const hit = document
          .elementFromPoint(x, y)
          ?.closest<SVGElement>('[data-node]');
        return hit && hit.dataset['node'] !== g.dataset['node']
          ? [`${g.dataset['node']} selects ${hit.dataset['node']}`]
          : [];
      });
    });
    assert.deepEqual(collisions, []);
    const id = `SYN-${must(groups) * must(perGroup) + 4}`,
      dot = page.locator(`[data-node="i:${id}"] .node-dot`),
      b = await dot.boundingBox();
    await page.mouse.click(
      must(b).x + must(b).width * 0.95,
      must(b).y + must(b).height / 2,
    );
    assert.deepEqual(
      await page.evaluate(() => window.stellar.getState().selected),
      { type: 'issue', id },
    );
  });

void test('phone source curves avoid unrelated nodes and text and retain opposite arrows', async (t) => {
  for (const mode of ['single', 'opposite', 'within'] as const) {
    const opposite = mode === 'opposite',
      data =
        mode === 'within' ? await invented('en', [4], 3) : await museum('ko');
    if (mode === 'within')
      data.relations.push({ kind: 'blocks', source: 'SYN-1', target: 'SYN-7' });
    if (opposite)
      data.relations.push({ kind: 'blocks', source: 'MUS-7', target: 'MUS-2' });
    const page = await open(t, data, { width: 390, height: 844 });
    const crossings = await page.evaluate((checkText) => {
      const must = <T>(value: T | null | undefined): T => {
        if (value === null || value === undefined)
          throw new Error('Missing browser fixture value');
        return value;
      };

      const scene = window.stellar.getState(),
        failures = [];
      for (const edge of scene.edges.filter(
        (e) => e.kind !== 'classification',
      )) {
        const path = document.querySelector<SVGPathElement>(
            `[data-edge="${CSS.escape(edge.id)}"] .graph-edge`,
          ),
          matrix = must(path).getScreenCTM(),
          length = must(path).getTotalLength();
        const obstacles = [
          ...document.querySelectorAll<SVGElement>('.graph-node'),
        ]
          .filter(
            (n) =>
              n.dataset['node'] !== edge.source &&
              n.dataset['node'] !== edge.target,
          )
          .flatMap((n) =>
            [
              n.querySelector<SVGElement>('.node-dot'),
              ...[
                ...n.querySelectorAll<SVGTextElement>('.node-label tspan'),
              ].filter(
                (line) =>
                  checkText &&
                  must(line.closest<SVGTextElement>('.node-label')).style
                    .display !== 'none',
              ),
            ].map((el) => ({
              id: n.dataset['node'],
              box: must(el).getBoundingClientRect(),
            })),
          );
        for (const { id, box } of obstacles) {
          if (
            Array.from({ length: 200 }, (_, i) => {
              const p = must(path)
                .getPointAtLength((length * (i + 1)) / 201)
                .matrixTransform(must(matrix));
              return (
                p.x > box.left &&
                p.x < box.right &&
                p.y > box.top &&
                p.y < box.bottom
              );
            }).some(Boolean)
          )
            failures.push(`${edge.id}: ${id}`);
        }
      }
      return failures;
    }, mode !== 'within');
    await shot(page, `source-${mode}-arrows`);
    assert.deepEqual(crossings, []);
    assert.deepEqual(
      await page
        .locator('#data')
        .evaluate((el): unknown => JSON.parse(el.textContent)),
      data,
    );
    if (opposite) {
      const arrows = await page.evaluate(() => {
        const must = <T>(value: T | null | undefined): T => {
          if (value === null || value === undefined)
            throw new Error('Missing browser fixture value');
          return value;
        };

        const edges = window.stellar
          .getState()
          .edges.filter(
            (e) =>
              e.kind === 'blocks' &&
              [e.source, e.target].includes('c:story') &&
              [e.source, e.target].includes('c:guide'),
          );
        return edges.map((e) => {
          const p = document.querySelector<SVGPathElement>(
            `[data-edge="${CSS.escape(e.id)}"] .graph-edge`,
          );
          const point = must(p)
            .getPointAtLength(must(p).getTotalLength() / 2)
            .matrixTransform(must(must(p).getScreenCTM()));
          return {
            source: e.source,
            target: e.target,
            marker: must(p).getAttribute('marker-end'),
            x: point.x,
            y: point.y,
          };
        });
      });
      assert.equal(arrows.length, 2);
      assert.equal(must(arrows[0]).source, must(arrows[1]).target);
      assert.equal(must(arrows[0]).target, must(arrows[1]).source);
      assert.ok(arrows.every((a) => a.marker === 'url(#arrow-blocks)'));
      assert.ok(
        Math.hypot(
          must(arrows[0]).x - must(arrows[1]).x,
          must(arrows[0]).y - must(arrows[1]).y,
        ) > 12,
      );
    }
  }
});

void test('a short view with four groups retains its area name', async (t) => {
  for (const viewport of [
    { width: 320, height: 568 },
    { width: 667, height: 375 },
  ] as const) {
    const page = await open(t, await invented('en', [4]), viewport);
    await shot(page, `four-group-${viewport.width}`);
    assert.equal(await shown(page, 'domain'), 1);
    await clearLabels(page);
  }
});

async function associatedLabels(page: Page) {
  const misplaced = await page.evaluate(() => {
    const must = <T>(value: T | null | undefined): T => {
      if (value === null || value === undefined)
        throw new Error('Missing browser fixture value');
      return value;
    };

    const dots = [...document.querySelectorAll<SVGElement>('.graph-node')].map(
      (el) => {
        const box = must(
          el.querySelector<SVGElement>('.node-dot'),
        ).getBoundingClientRect();
        return {
          id: el.dataset['node'],
          x: (box.left + box.right) / 2,
          y: (box.top + box.bottom) / 2,
        };
      },
    );
    return [
      ...document.querySelectorAll<SVGElement>('.graph-node:not(.issue)'),
    ].flatMap((el) => {
      const label = el.querySelector<SVGTextElement>('.node-label');
      if (must(label).style.display === 'none') return [];
      const box = must(
          must(label).querySelector<SVGTextElement>('tspan'),
        ).getBoundingClientRect(),
        distance = (dot: { x: number; y: number }) =>
          Math.hypot(
            Math.max(box.left - dot.x, 0, dot.x - box.right),
            Math.max(box.top - dot.y, 0, dot.y - box.bottom),
          ),
        own = distance(must(dots.find((dot) => dot.id === el.dataset['node'])));
      return dots
        .filter(
          (dot) => dot.id !== el.dataset['node'] && distance(dot) + 2.1 < own,
        )
        .map((dot) => `${el.dataset['node']} reads as ${dot.id}`);
    });
  });
  assert.deepEqual(
    misplaced,
    [],
    'a visible name remains nearest its owning dot',
  );
}

for (const locale of ['ko', 'en'] as const) {
  void test(`${locale} labels remain associated with their own dots after fit and navigation`, async (t) => {
    for (const viewport of [
      { width: 1024, height: 768 },
      { width: 390, height: 844 },
      { width: 667, height: 375 },
    ] as const) {
      const page = await open(t, await museum(locale), viewport);
      assert.ok(await shown(page, 'domain'));
      await associatedLabels(page);
      await page.locator('[data-node="c:story"]').focus();
      await page.keyboard.press('Enter');
      await associatedLabels(page);
      await page.locator('#back').click();
      await associatedLabels(page);
    }
  });

  void test(`${locale} control clearance survives relation toggles and Back at the same camera`, async (t) => {
    for (const viewport of [
      { width: 320, height: 568 },
      { width: 667, height: 375 },
    ] as const) {
      const page = await open(t, await invented(locale), viewport);
      const before = await page.evaluate(
        () => window.stellar.getState().transform,
      );
      await page.locator('[data-edge-toggle="related"]').uncheck();
      await clearLabels(page);
      assert.deepEqual(
        await page.evaluate(() => window.stellar.getState().transform),
        before,
      );
      await page.locator('[data-node="d:area-0"]').focus();
      await page.keyboard.press('Enter');
      await page.locator('#back').click();
      await clearLabels(page);
      assert.deepEqual(
        await page.evaluate(() => window.stellar.getState().transform),
        before,
      );
      await shot(page, `${locale}-controls-after-back-${viewport.width}`);
    }
  });

  void test(`${locale} selected phone groups retain their issue identifiers`, async (t) => {
    const data = await museum(locale);
    data.view.initialScope = 'all';
    for (const height of [667, 844] as const) {
      const page = await open(t, data, { width: 390, height });
      for (const category of data.categories) {
        await page.locator(`[data-node="c:${category.id}"]`).focus();
        await page.keyboard.press('Enter');
        const selectedCamera = await page.evaluate(
          () => window.stellar.getState().transform,
        );
        await page.locator('#fit').click();
        assert.deepEqual(
          await page.evaluate(() => window.stellar.getState().transform),
          selectedCamera,
        );
        for (const issue of data.issues.filter(
          (i) =>
            i.scope === 'assigned' &&
            i.classification?.category === category.id,
        )) {
          const label = page.locator(`[data-node="i:${issue.id}"] .node-label`);
          assert.notEqual(
            await label.evaluate((el) => el.style.display),
            'none',
            issue.identifier,
          );
        }
        await clearLabels(page);
        if (category === data.categories[0])
          await shot(page, `${locale}-selected-group-${height}`);
        await page.locator('#back').click();
      }
    }
  });
}

void test('short fitted views keep distinct node dots instead of shrinking into blobs', async (t) => {
  for (const [data, viewport] of [
    [await museum('en'), { width: 844, height: 390 }],
    [await invented('en'), { width: 1280, height: 500 }],
    [await invented('en', [1, 1, 1, 1]), { width: 667, height: 375 }],
    [await invented('en', [3, 3, 3, 3], 12), { width: 390, height: 667 }],
  ] as const) {
    const page = await open(t, data, viewport);
    const overlaps = await page.evaluate(() => {
      const must = <T>(value: T | null | undefined): T => {
        if (value === null || value === undefined)
          throw new Error('Missing browser fixture value');
        return value;
      };

      const dots = [
        ...document.querySelectorAll<SVGElement>('.graph-node'),
      ].map((el) => {
        const b = must(
          el.querySelector<SVGElement>('.node-dot'),
        ).getBoundingClientRect();
        return {
          id: el.dataset['node'],
          x: (b.left + b.right) / 2,
          y: (b.top + b.bottom) / 2,
          r: b.width / 2,
        };
      });
      return dots.flatMap((a, i) =>
        dots
          .slice(i + 1)
          .filter((b) => Math.hypot(a.x - b.x, a.y - b.y) < a.r + b.r + 2)
          .map((b) => `${a.id}/${b.id}`),
      );
    });
    assert.deepEqual(overlaps, []);
    assert.ok(await shown(page, 'domain'));
    await clearLabels(page);
    await shot(page, `readable-dots-${viewport.width}-${viewport.height}`);
  }
});

void test('panning to a cropped area reveals its retained label without moving the label relative to its dot', async (t) => {
  const page = await open(t, await invented('en', [1, 1, 1, 1]), {
    width: 390,
    height: 667,
  });
  const target = await page.evaluate(() => {
    const must = <T>(value: T | null | undefined): T => {
      if (value === null || value === undefined)
        throw new Error('Missing browser fixture value');
      return value;
    };

    const s = window.stellar.getState(),
      stage = must(document.querySelector('#stage')).getBoundingClientRect();
    return s.nodes.find(
      (node) =>
        node.type === 'domain' &&
        (node.y * s.transform.k + s.transform.y < 0 ||
          node.y * s.transform.k + s.transform.y > stage.height),
    );
  });
  assert.ok(
    target,
    'the readable fit leaves another area available by panning',
  );
  const label = page.locator(`[data-node="${target.id}"] .node-label`),
    placement = await label.getAttribute('transform');
  assert.equal(await label.evaluate((el) => el.style.display), 'none');
  const movement = await page.evaluate((node) => {
    const must = <T>(value: T | null | undefined): T => {
      if (value === null || value === undefined)
        throw new Error('Missing browser fixture value');
      return value;
    };

    const s = window.stellar.getState(),
      stage = must(document.querySelector('#stage')).getBoundingClientRect();
    return {
      x: stage.left + stage.width / 2,
      y: stage.top + stage.height / 2,
      dx: stage.width / 2 - node.x * s.transform.k - s.transform.x,
      dy: stage.height / 2 - node.y * s.transform.k - s.transform.y,
    };
  }, target);
  await page.mouse.move(movement.x, movement.y);
  await page.mouse.down();
  await page.mouse.move(movement.x + movement.dx, movement.y + movement.dy, {
    steps: 5,
  });
  await page.mouse.up();
  assert.notEqual(await label.evaluate((el) => el.style.display), 'none');
  assert.equal(await label.getAttribute('transform'), placement);
});
