import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { ChannelId, ParameterValue } from '@openmixture/runtime';
import type {} from './harness';

const checker = await readFile(new URL('../public/samples/checker.mix', import.meta.url), 'utf8');
const pixels = (page: Page) => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) =>
  Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
const digest = (bytes: number[]) => createHash('sha256').update(new Uint8Array(bytes)).digest('hex');
async function ready(page: Page, size = 65): Promise<void> {
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Checker loaded. Initialize WebGPU to render.');
  await page.getByLabel('Width', { exact: true }).fill(String(size));
  await page.getByLabel('Height', { exact: true }).fill(size === 65 ? '3' : String(size));
}
async function initialize(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('WebGPU ready. Render when ready.');
}
async function render(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Render', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Render complete.');
}
async function reference(page: Page, source: string, overrides: Record<string, ParameterValue>, channels: ChannelId[], size = 128) {
  await page.goto('tests/contract.html');
  return page.evaluate(async ({ source, overrides, channels, size }) => {
    const runtime = await window.mixtureContract.loadRuntime();
    const gpu = await runtime.createGpu();
    try {
      const result = await gpu.render(source, { size: [size, size], channels, overrides });
      return { hash: result.plan.hash, channels: result.channels.map(channel => ({ channel: channel.channel, pixels: Array.from(channel.pixels), encoding: channel.encoding })) };
    } finally { await gpu.destroy(); }
  }, { source, overrides, channels, size });
}

for (const [material, parameter, value] of [
  ['glazed-ceramic', 'tilesX', '12'], ['leather', 'grainScale', '32'], ['wood', 'warpStrength', '0.04'],
] as const) {
  test(`${material}: metadata controls, parameter changes and four real channel previews`, async ({ page, context }, testInfo) => {
    const source = await readFile(new URL(`../public/samples/${material}.mix`, import.meta.url), 'utf8');
    const ref = await context.newPage();
    const expected = await reference(ref, source, { [parameter]: Number(value) }, ['baseColor', 'normal', 'roughness', 'height']);
    await ref.close();
    await ready(page, 128);
    await page.getByLabel('Material sample', { exact: true }).selectOption(material);
    await expect(page.getByLabel(parameter, { exact: true })).toBeVisible();
    const initialValue = await page.getByLabel(parameter, { exact: true }).inputValue();
    await initialize(page); await render(page);
    const before = digest(await pixels(page));
    await page.getByLabel(parameter, { exact: true }).fill(value);
    await expect(page.getByRole('status')).toHaveText('Render complete.');
    await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'false');
    await expect(page.locator('#source-text')).toHaveText(source.trim());
    const measurements = [];
    for (const channel of expected.channels) {
      await page.getByLabel('Preview channel', { exact: true }).selectOption(channel.channel);
      await expect(page.getByRole('status')).toHaveText('Render complete.');
      const actual = await pixels(page);
      expect(digest(actual)).toBe(digest(channel.pixels));
      await expect(page.locator('#result-info')).toContainText(`${channel.channel} · ${channel.encoding}`);
      measurements.push({ channel: channel.channel, encoding: channel.encoding, sha256: digest(actual) });
    }
    expect(before).not.toBe(measurements.find(item => item.channel === 'baseColor')!.sha256);
    await page.getByLabel('Preview channel', { exact: true }).selectOption('baseColor');
    await expect(page.getByRole('status')).toHaveText('Render complete.');
    await page.evaluate(() => window.scrollTo(0, 0));
    await testInfo.attach(`${material}-preview.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    await testInfo.attach(`${material}-preview.json`, { body: JSON.stringify({ material, parameter, sourceValue: initialValue, override: value, size: [128, 128], channels: measurements, initialBaseColorSha256: before, sourceSha256: createHash('sha256').update(source).digest('hex') }, null, 2), contentType: 'application/json' });
    await page.getByRole('button', { name: 'Reset parameters', exact: true }).click();
    await expect(page.getByLabel(parameter, { exact: true })).toHaveValue(initialValue);
    await expect(page.getByRole('status')).toHaveText('Render complete.');
    expect(digest(await pixels(page))).toBe(before);
    if (material === 'wood') {
      await page.setViewportSize({ width: 390, height: 844 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await testInfo.attach('wood-mobile.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
    }
  });
}

test('color and enum controls preserve exact values and show Rust validation failures', async ({ page, context }) => {
  const source = await readFile(new URL('./fixtures/controls.mix', import.meta.url), 'utf8');
  await ready(page, 128);
  await page.locator('#file').setInputFiles({ name: 'controls.mix', mimeType: 'application/json', buffer: Buffer.from(source) });
  await expect(page.getByLabel('blendMode', { exact: true })).toHaveValue('screen');
  await expect(page.getByLabel('tint Red', { exact: true })).toHaveValue('0.72');
  await page.getByLabel('blendMode', { exact: true }).selectOption('multiply');
  await page.getByLabel('tint Red', { exact: true }).fill('0.25');
  await initialize(page); await render(page);
  const ref = await context.newPage();
  const expected = await reference(ref, source, { blendMode: 'multiply', tint: [0.25, 0.78, 0.73, 1] }, ['baseColor']);
  await ref.close();
  expect(digest(await pixels(page))).toBe(digest(expected.channels[0].pixels));
  const prior = await pixels(page);
  await page.getByLabel('tint Alpha', { exact: true }).fill('2');
  await expect(page.getByRole('alert')).toContainText('MIX_');
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'true');
  await expect(page.getByRole('button', { name: 'Render', exact: true })).toBeDisabled();
  expect(await pixels(page)).toEqual(prior);
  await page.getByLabel('tint Alpha', { exact: true }).fill('1');
  await expect(page.getByRole('status')).toHaveText('Render complete.');
  await expect(page.getByRole('alert')).toBeHidden();
});

// The real platform mapping completes; delaying its returned promise controls
// consumer completion order without fabricating SDK results or GPU pixels.
async function mapBarrier(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const control = { hold: false, held: false, maps: 0, release: () => {} };
    Object.defineProperty(window, 'mapControl', { value: control });
    const prototype = (globalThis as unknown as { GPUBuffer: { prototype: { mapAsync(...args: unknown[]): Promise<void> } } }).GPUBuffer.prototype;
    const original = prototype.mapAsync;
    prototype.mapAsync = function (...args) {
      control.maps++;
      const mapped = original.apply(this, args);
      if (!control.hold) return mapped;
      control.hold = false;
      return mapped.then(() => new Promise<void>(resolve => { control.held = true; control.release = () => { control.held = false; resolve(); }; }));
    };
  });
}
const mapState = (page: Page) => page.evaluate(() => (window as unknown as { mapControl: { held: boolean; maps: number } }).mapControl);
const holdMap = (page: Page) => page.evaluate(() => { (window as unknown as { mapControl: { hold: boolean } }).mapControl.hold = true; });
const releaseMap = (page: Page) => page.evaluate(() => { (window as unknown as { mapControl: { release(): void } }).mapControl.release(); });

test('rapid edits replace queued work, invalid overrides suppress old completion, and disposal waits', async ({ page }, testInfo) => {
  await mapBarrier(page); await ready(page); await initialize(page); await render(page);
  const original = await pixels(page);
  await holdMap(page);
  await page.getByLabel('frequency', { exact: true }).fill('4');
  await expect.poll(async () => (await mapState(page)).held).toBe(true);
  await page.getByLabel('frequency', { exact: true }).fill('5');
  await page.getByLabel('frequency', { exact: true }).fill('6');
  await expect(page.getByRole('status')).toHaveText('Rendering… Latest changes queued.');
  expect(await pixels(page)).toEqual(original);
  await releaseMap(page);
  await expect(page.getByRole('status')).toHaveText('Render complete.');
  expect((await mapState(page)).maps).toBe(3); // Initial, held 4, latest 6. No 5.
  const newest = await pixels(page);
  expect(newest).not.toEqual(original);
  await holdMap(page);
  await page.getByLabel('frequency', { exact: true }).fill('7');
  await expect.poll(async () => (await mapState(page)).held).toBe(true);
  await page.getByLabel('frequency', { exact: true }).fill('8.5');
  await expect(page.getByRole('alert')).toContainText('MIX_');
  await releaseMap(page);
  // Dispose waits for the delivered old result and prevents it from painting.
  await page.getByRole('button', { name: 'Dispose GPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  expect(await pixels(page)).toEqual(newest);
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'true');
  expect((await mapState(page)).maps).toBe(4);
  await testInfo.attach('freshness.json', { body: JSON.stringify({ maps: 4, intermediateRequestsDropped: true, invalidOverridePreservedPreview: true, originalSha256: digest(original), latestSha256: digest(newest) }), contentType: 'application/json' });
});

test('an invalid new file clears old bindings and cannot receive an earlier render', async ({ page }) => {
  await mapBarrier(page); await ready(page); await initialize(page); await render(page);
  const prior = await pixels(page);
  await holdMap(page); await page.getByLabel('frequency', { exact: true }).fill('4');
  await expect.poll(async () => (await mapState(page)).held).toBe(true);
  await page.locator('#file').setInputFiles({ name: 'invalid.mix', mimeType: 'application/json', buffer: Buffer.from(checker.replace('"version": 1', '"version": 1, "version": 1')) });
  await expect(page.getByRole('alert')).toContainText('MIX_');
  await expect(page.getByLabel('frequency', { exact: true })).toHaveCount(0);
  await releaseMap(page);
  await page.getByRole('button', { name: 'Dispose GPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  expect(await pixels(page)).toEqual(prior);
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'true');
});

test('unsupported WebGPU leaves metadata controls usable and reports a structured error', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  await ready(page);
  await page.getByLabel('frequency', { exact: true }).fill('4');
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect(page.getByRole('alert')).toBeVisible();
  await expect(page.locator('#details')).toContainText('MIX_BROWSER_WEBGPU_UNAVAILABLE');
  await expect(page.getByLabel('frequency', { exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Render', exact: true })).toBeDisabled();
});

test('pagehide during initialization waits for and destroys the late device', async ({ page }) => {
  await page.addInitScript(() => {
    const control = { held: false, release: () => {}, destroys: 0 };
    Object.defineProperty(window, 'acquisitionControl', { value: control });
    const platform = globalThis as unknown as {
      GPUAdapter: { prototype: { requestDevice(...args: unknown[]): Promise<unknown> } };
      GPUDevice: { prototype: { destroy(): void } };
    };
    const request = platform.GPUAdapter.prototype.requestDevice;
    platform.GPUAdapter.prototype.requestDevice = async function (...args) {
      const device = await request.apply(this, args);
      await new Promise<void>(resolve => { control.held = true; control.release = () => { control.held = false; resolve(); }; });
      return device;
    };
    const destroy = platform.GPUDevice.prototype.destroy;
    platform.GPUDevice.prototype.destroy = function () { control.destroys++; destroy.call(this); };
  });
  await ready(page);
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as unknown as { acquisitionControl: { held: boolean } }).acquisitionControl.held)).toBe(true);
  await page.evaluate(() => {
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
    window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true }));
  });
  await expect(page.getByRole('button', { name: 'Initialize WebGPU', exact: true })).toBeDisabled();
  await page.evaluate(() => (window as unknown as { acquisitionControl: { release(): void } }).acquisitionControl.release());
  await expect(page.getByRole('status')).toHaveText('GPU disposed. Initialize WebGPU to render again.');
  await expect(page.getByRole('button', { name: 'Initialize WebGPU', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Render', exact: true })).toBeDisabled();
  expect(await page.evaluate(() => (window as unknown as { acquisitionControl: { destroys: number } }).acquisitionControl.destroys)).toBe(1);
});

test('a latest real GPU failure retains the previous preview with stale status', async ({ page }) => {
  await page.addInitScript(() => {
    const prototype = (globalThis as unknown as { GPUAdapter: { prototype: { requestDevice(...args: unknown[]): Promise<{ destroy(): void; lost: Promise<unknown> }> } } }).GPUAdapter.prototype;
    const original = prototype.requestDevice;
    prototype.requestDevice = async function (...args) {
      const device = await original.apply(this, args);
      Object.defineProperty(window, 'loseDevice', { configurable: true, value: async () => {
        device.destroy(); await device.lost; await new Promise(resolve => setTimeout(resolve, 0));
      } });
      return device;
    };
  });
  await ready(page); await initialize(page); await render(page);
  const previous = await pixels(page);
  await page.evaluate(() => (window as unknown as { loseDevice(): Promise<void> }).loseDevice());
  await page.getByLabel('frequency', { exact: true }).fill('4');
  await expect(page.getByRole('alert')).toContainText('MIX_GPU_DEVICE_LOST');
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'true');
  expect(await pixels(page)).toEqual(previous);
  await page.getByRole('button', { name: 'Dispose GPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  await initialize(page); await render(page);
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'false');
});

test('a late file read cannot replace the newer file or its parameter bindings', async ({ page }) => {
  await page.addInitScript(() => {
    const control = { held: false, release: () => {} };
    Object.defineProperty(window, 'fileControl', { value: control });
    const original = File.prototype.arrayBuffer;
    File.prototype.arrayBuffer = async function () {
      const bytes = await original.call(this);
      if (this.name === 'slow.mix') await new Promise<void>(resolve => {
        control.held = true; control.release = () => { control.held = false; resolve(); };
      });
      return bytes;
    };
  });
  await ready(page);
  await page.locator('#file').setInputFiles({ name: 'slow.mix', mimeType: 'application/json', buffer: Buffer.from(checker) });
  await expect.poll(() => page.evaluate(() => (window as unknown as { fileControl: { held: boolean } }).fileControl.held)).toBe(true);
  const newer = await readFile(new URL('./fixtures/controls.mix', import.meta.url), 'utf8');
  await page.locator('#file').setInputFiles({ name: 'newer.mix', mimeType: 'application/json', buffer: Buffer.from(newer) });
  await expect(page.getByLabel('tint Red', { exact: true })).toHaveValue('0.72');
  await page.evaluate(async () => {
    (window as unknown as { fileControl: { release(): void } }).fileControl.release();
    await new Promise(requestAnimationFrame);
  });
  await expect(page.locator('#source-name')).toContainText('newer.mix');
  await expect(page.getByLabel('frequency', { exact: true })).toHaveCount(0);
  await expect(page.getByLabel('tint Red', { exact: true })).toHaveValue('0.72');
});
