import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { decodePng } from './helpers/png';

async function start(page: import('@playwright/test').Page) {
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Checker loaded. Initialize WebGPU to render.');
  await expect(page.locator('#download')).toBeDisabled();
  await page.getByLabel('Width', { exact: true }).fill('65');
  await page.getByLabel('Height', { exact: true }).fill('3');
  await page.locator('#initialize').click();
  await expect(page.getByRole('status')).toHaveText('WebGPU ready. Render when ready.');
  await page.locator('#render').click();
  await expect(page.getByRole('status')).toHaveText('Render complete.');
}

test('odd dimensions, all eight channel encodings and downloads after disposal', async ({ page }, testInfo) => {
  await start(page);
  for (const channel of ['baseColor', 'normal', 'roughness', 'metallic', 'height', 'ambientOcclusion', 'opacity', 'emissive']) {
    await page.locator('#channels').selectOption(channel);
    await expect(page.getByRole('status')).toHaveText('Render complete.');
    const downloaded = page.waitForEvent('download');
    await page.locator('#download').click();
    const download = await downloaded;
    expect(download.suggestedFilename()).toBe(`checker-${channel}-65x3.png`);
    const png = decodePng(await readFile((await download.path())!));
    expect([png.width, png.height]).toEqual([65, 3]);
    expect(png.gamma).toBe(['baseColor', 'emissive'].includes(channel) ? 45455 : 100000);
  }
  await page.locator('#dispose').click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  const downloaded = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await downloaded).suggestedFilename()).toBe('checker-emissive-65x3.png');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await testInfo.attach('export-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

for (const action of ['edit', 'pagehide', 'failure'] as const) {
  test(`pending PNG ${action} cannot download stale bytes and releases export busy state`, async ({ page }) => {
    await page.addInitScript(() => {
      const control = { held: false, fail: false, release: () => {} };
      Object.defineProperty(window, 'pngControl', { value: control });
      const Original = CompressionStream;
      // Delay consumption, while using the browser's real deflate stream.
      globalThis.CompressionStream = class extends Original {
        constructor(format: CompressionFormat) {
          if (control.fail) throw new Error('test compression failure');
          super(format);
          const stream = this.readable.pipeThrough(new TransformStream({
            async transform(chunk, controller) {
              await new Promise<void>(resolve => { control.held = true; control.release = () => { control.held = false; resolve(); }; });
              controller.enqueue(chunk);
            },
          }));
          Object.defineProperty(this, 'readable', { value: stream });
        }
      };
    });
    await start(page);
    let downloads = 0;
    page.on('download', () => downloads++);
    if (action === 'failure') {
      await page.evaluate(() => { (window as unknown as { pngControl: { fail: boolean } }).pngControl.fail = true; });
      await page.locator('#download').click();
      await expect(page.locator('#export-status')).toContainText('PNG export failed: test compression failure');
      await expect(page.locator('#download')).toBeEnabled();
      expect(downloads).toBe(0);
      return;
    }
    await page.locator('#download').click();
    await expect.poll(() => page.evaluate(() => (window as unknown as { pngControl: { held: boolean } }).pngControl.held)).toBe(true);
    if (action === 'edit') {
      await page.getByLabel('frequency', { exact: true }).fill('4');
      await expect(page.getByRole('status')).toHaveText('Render complete.');
    } else {
      await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
      await expect(page.getByRole('status')).toHaveText('GPU disposed. Initialize WebGPU to render again.');
    }
    // Release each real compressed chunk until encoding settles.
    await page.evaluate(async () => {
      const control = (window as unknown as { pngControl: { release(): void } }).pngControl;
      for (let i = 0; i < 10; i++) { control.release(); await new Promise(resolve => setTimeout(resolve, 20)); }
    });
    if (action === 'edit') await expect(page.locator('#download')).toBeEnabled();
    else await expect(page.locator('#download')).toBeDisabled();
    expect(downloads).toBe(0);
  });
}

test('long uploaded filenames remain bounded and visible on narrow screens', async ({ page }) => {
  await start(page);
  const source = await readFile(new URL('../public/samples/checker.mix', import.meta.url));
  await page.locator('#file').setInputFiles({ name: `${'a'.repeat(200)}.mix`, mimeType: 'application/json', buffer: source });
  await expect(page.getByRole('status')).toHaveText('Render complete.');
  const downloaded = page.waitForEvent('download');
  await page.locator('#download').click();
  expect((await downloaded).suggestedFilename()).toBe(`${'a'.repeat(80)}-baseColor-65x3.png`);
  await page.setViewportSize({ width: 390, height: 844 });
  const bounds = await page.locator('#export-status').evaluate(el => ({ scroll: el.scrollWidth, client: el.clientWidth }));
  expect(bounds.scroll).toBe(bounds.client);
});
