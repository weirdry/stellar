import test from 'node:test';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { mkdtemp, readFile, writeFile, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { renderWorkMap } from '../../lib/render.js';

function overviewMap(fixture, locale) {
  const data = structuredClone(fixture);
  data.locale = locale;
  data.view.initialScope = 'all';
  data.domains = data.domains.slice(0, 2);
  data.categories = data.categories.slice(0, 4);
  data.categories[2].domain = data.domains[0].id;
  const labels =
    locale === 'ko'
      ? [
          '전시 자료 해석과 관람 경험 설계',
          '예약과 현장 안내 서비스 운영',
          '야간 전시 해설 원고와 접근성 검토',
          '전시 공간 조도 측정과 빛 반사 평가',
          '관람객 체험 기록 수집과 피드백 해석',
          '온라인 관람 예약과 현장 길찾기 안내',
        ]
      : [
          'Exhibition interpretation and visitor experience',
          'Booking and on-site visitor service operations',
          'Night exhibition narratives and accessibility review',
          'Gallery illumination and reflection assessment',
          'Visitor experience recording and feedback interpretation',
          'Online visit booking and on-site wayfinding',
        ];
  [...data.domains, ...data.categories].forEach((group, index) => {
    group.label = labels[index];
  });
  data.issues = data.issues.slice(0, 5);
  data.issues.forEach((issue, index) => {
    issue.classification.category = data.categories[Math.min(index, 3)].id;
  });
  const ids = new Set(data.issues.map((issue) => issue.id));
  data.relations = data.relations.filter(
    (edge) => ids.has(edge.source) && ids.has(edge.target),
  );
  return data;
}

async function readableLabels(page) {
  const boxes = await page.locator('.graph-node').evaluateAll((nodes) =>
    nodes.flatMap((node) =>
      [...node.querySelectorAll('.node-label, .node-dot')]
        .filter((element) => element.style.display !== 'none')
        .map((element) => {
          const box = element.getBoundingClientRect();
          return {
            node: node.dataset.node,
            label: element.classList.contains('node-label'),
            left: box.left,
            right: box.right,
            top: box.top,
            bottom: box.bottom,
          };
        }),
    ),
  );
  for (let i = 0; i < boxes.length; i++) {
    for (const b of boxes.slice(i + 1)) {
      const a = boxes[i];
      if (!a.label && !b.label) continue;
      assert.ok(
        a.right + 2 <= b.left ||
          b.right + 2 <= a.left ||
          a.bottom + 2 <= b.top ||
          b.bottom + 2 <= a.top,
        `labels must clear other labels and nodes: ${a.node} / ${b.node}`,
      );
    }
  }
  return boxes.filter((box) => box.label);
}

async function fittedLabels(page) {
  const labels = await readableLabels(page);
  assert.equal(
    labels.length,
    6,
    'the small overview retains both domains and all four group labels',
  );
  const occluded = await page.evaluate(() => {
    const stage = document.querySelector('#stage').getBoundingClientRect();
    const controls = [
      '#canvas-caption',
      '.minimap-wrap',
      '.legend-panel',
      '#zoom-in',
    ].map((selector) =>
      document.querySelector(selector).getBoundingClientRect(),
    );
    return [...document.querySelectorAll('.node-label')]
      .filter((label) => label.style.display !== 'none')
      .flatMap((label) => [...label.querySelectorAll('tspan')])
      .filter((line) => {
        const box = line.getBoundingClientRect();
        return (
          box.left < stage.left ||
          box.right > stage.right ||
          box.top < stage.top ||
          box.bottom > stage.bottom ||
          controls.some(
            (control) =>
              box.left < control.right &&
              box.right > control.left &&
              box.top < control.bottom &&
              box.bottom > control.top,
          )
        );
      })
      .map((line) => line.textContent);
  });
  assert.deepEqual(
    occluded,
    [],
    'fitted label lines stay inside the stage and clear of canvas controls',
  );
}

for (const locale of ['ko', 'en']) {
  test(`long ${locale} overview labels remain readable on a phone`, async (t) => {
    const fixture = JSON.parse(
      await readFile(
        new URL('../../examples/museum.json', import.meta.url),
        'utf8',
      ),
    );
    const data = overviewMap(fixture, locale);
    const dir = await mkdtemp(join(tmpdir(), 'stellar-overview-'));
    t.after(() => rm(dir, { recursive: true, force: true }));
    const browser = await chromium.launch({
      headless: true,
      ...(process.env.STELLAR_CHROME
        ? { executablePath: process.env.STELLAR_CHROME }
        : {}),
    });
    t.after(() => browser.close());
    const page = await browser.newPage({
      viewport: { width: 390, height: 844 },
    });
    const errors = [],
      requests = [];
    page.on('pageerror', (error) => errors.push(error.message));
    page.on('request', (request) => {
      if (/^https?:/.test(request.url())) requests.push(request.url());
    });
    t.after(() => assert.deepEqual(errors, []));
    t.after(() => assert.deepEqual(requests, []));
    const file = join(dir, 'map.html');
    await writeFile(file, await renderWorkMap(data));
    await page.goto(pathToFileURL(file).href);
    await page.waitForFunction(() => window.stellar);
    await page.waitForTimeout(150);
    const shot = async (name) => {
      if (!process.env.STELLAR_QA_DIR) return;
      await mkdir(process.env.STELLAR_QA_DIR, { recursive: true });
      await page.mouse.move(2, 2);
      await page.screenshot({
        path: join(process.env.STELLAR_QA_DIR, `${locale}-long-${name}.png`),
      });
    };
    const state = () => page.evaluate(() => window.stellar.getState());
    const initial = await state();
    assert.equal(initial.baseCount, 5);
    await shot('overview');
    await fittedLabels(page);
    await page.locator('#theme').click();
    await fittedLabels(page);
    await shot('overview-light');

    // Text is re-evaluated at each zoom, without moving nodes or changing edges.
    for (let i = 0; i < 5; i++) await page.locator('#zoom-out').click();
    const reduced = await readableLabels(page);
    assert.ok(
      reduced.length >= 2 && reduced.length < 6,
      'crowded labels yield to readable area names',
    );
    assert.ok(reduced.some((box) => box.node.startsWith('d:')));
    assert.deepEqual((await state()).nodes, initial.nodes);
    assert.deepEqual((await state()).edges, initial.edges);
    await page.locator('#fit').click();
    await fittedLabels(page);

    const beforePan = await readableLabels(page),
      camera = (await state()).transform;
    await page.mouse.move(20, 430);
    await page.mouse.down();
    await page.mouse.move(55, 455, { steps: 4 });
    await page.mouse.up();
    const afterPan = await readableLabels(page);
    assert.ok(Math.abs((await state()).transform.x - camera.x - 35) < 1);
    assert.equal(afterPan.length, beforePan.length);
    for (let i = 0; i < afterPan.length; i++) {
      assert.ok(Math.abs(afterPan[i].left - beforePan[i].left - 35) < 1);
      assert.ok(Math.abs(afterPan[i].top - beforePan[i].top - 25) < 1);
    }
    assert.deepEqual((await state()).nodes, initial.nodes);
    await page.locator('#fit').click();

    // Every full name remains discoverable and every node remains selectable,
    // including names shortened with an ellipsis in the fitted canvas.
    for (const group of [...data.domains, ...data.categories]) {
      const type = group.domain ? 'category' : 'domain';
      const node = page.locator(
        `[data-node="${type === 'domain' ? 'd' : 'c'}:${group.id}"]`,
      );
      assert.equal(await node.getAttribute('aria-label'), group.label);
      await node.locator('.node-dot').hover();
      assert.ok(
        (await page.locator('#tooltip').textContent()).includes(group.label),
      );
      await node.locator('.node-dot').click();
      assert.deepEqual((await state()).selected, { type, id: group.id });
      await page.locator('#info-toggle').click();
      assert.equal(
        await page.locator('#inspector h2').textContent(),
        group.label,
      );
      assert.ok(await page.locator('#inspector h2').isVisible());
      await page.keyboard.press('Escape');
      await page.locator('#overview').click();
    }

    await page.locator('#tree-toggle').click();
    for (const category of data.categories) {
      assert.equal(
        await page
          .locator(`#tree [data-category="${category.id}"]`)
          .textContent(),
        category.label,
      );
    }
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 1600, height: 1000 });
    await page.waitForTimeout(180);
    await shot('desktop');
    await fittedLabels(page);
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(180);
    await fittedLabels(page);
    assert.deepEqual(
      (await state()).nodes,
      initial.nodes,
      'resizing back restores the original layout',
    );
    assert.deepEqual((await state()).edges, initial.edges);
    assert.deepEqual(
      await page
        .locator('#data')
        .evaluate((element) => JSON.parse(element.textContent)),
      data,
    );
  });
}
