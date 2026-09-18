import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { chromium } from 'playwright';

test('canonical diagrams retain their default through OS changes and preserve reader choices', async (t) => {
  const browser = await chromium.launch({
    headless: true,
    ...(process.env.STELLAR_CHROME
      ? { executablePath: process.env.STELLAR_CHROME }
      : {}),
  });
  t.after(() => browser.close());
  const root = new URL('../../docs/architecture/diagrams/', import.meta.url);
  const { diagrams } = JSON.parse(
    await readFile(new URL('manifest.json', root), 'utf8'),
  );
  for (const { name } of diagrams) {
    const context = await browser.newContext({ colorScheme: 'light' });
    try {
      await context.route('https://**/*', (route) => route.abort());
      const page = await context.newPage();
      const url = new URL(`${name}.html`, root).href;
      const theme = () => page.locator('html').getAttribute('data-theme');
      await page.goto(url);
      assert.equal(await theme(), 'dark', `${name}: fresh light OS`);
      await page.evaluate(() => {
        window.themeEvents = 0;
        window
          .matchMedia('(prefers-color-scheme: light)')
          .addEventListener('change', () => {
            window.themeEvents += 1;
          });
      });
      for (const [index, colorScheme] of ['dark', 'light'].entries()) {
        await page.emulateMedia({ colorScheme });
        // Wait for the actual event, not just matchMedia's synchronous value.
        await page.waitForFunction(
          (count) => window.themeEvents === count,
          index + 1,
        );
        assert.equal(
          await theme(),
          'dark',
          `${name}: settled ${colorScheme} OS event`,
        );
      }
      await page.getByRole('button', { name: 'Toggle color theme' }).click();
      assert.equal(await theme(), 'light', `${name}: explicit toggle`);
      await page.emulateMedia({ colorScheme: 'dark' });
      await page.waitForFunction(() => window.themeEvents === 3);
      assert.equal(
        await theme(),
        'light',
        `${name}: saved choice survives OS event`,
      );
      await page.reload();
      assert.equal(await theme(), 'light', `${name}: saved preference`);
      await page.goto(`${url}?theme=dark`);
      assert.equal(await theme(), 'dark', `${name}: dark URL override`);
      await page.goto(`${url}?theme=light`);
      assert.equal(await theme(), 'light', `${name}: light URL override`);
    } finally {
      await context.close();
    }
  }
});
