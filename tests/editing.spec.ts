import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { ChannelId } from '@openmixture/runtime';
import type {} from './harness';
import { decodePng } from './helpers/png';

const sample = (name: string) => readFile(new URL(`../public/samples/${name}.mix`, import.meta.url));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function ready(page: Page, name = 'checker') {
  await page.goto('studio.html');
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('8');
  if (name !== 'checker') {
    await page.locator('#samples').selectOption(name);
    await expect(page.locator('#source-name')).toContainText(`${name}.mix`);
    await expect(page.locator('#editor-status')).toHaveText('Material source unchanged.');
  }
}
async function connect(page: Page, from: string, output: string, to: string, input: string) {
  await page.getByLabel('From node', { exact: true }).selectOption(from);
  await page.getByLabel('Output port', { exact: true }).selectOption(output);
  await page.getByLabel('To node', { exact: true }).selectOption(to);
  await page.getByLabel('Input port', { exact: true }).selectOption(input);
  await page.locator('#connect-edge').click();
}
async function gpu(page: Page) {
  await page.locator('#initialize').click(); await expect(page.locator('#status')).toHaveText('WebGPU ready. Render when ready.');
  await page.locator('#render').click(); await expect(page.locator('#status')).toHaveText('Render complete.');
}
async function download(page: Page, selector: string) {
  const pending = page.waitForEvent('download'); await page.locator(selector).click();
  return readFile((await (await pending).path())!);
}
const pixels = (page: Page) => page.locator('#preview').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));

test('delete and rebuild checker graph with atomic binding cleanup, no GPU required', async ({ page }) => {
  await page.addInitScript(() => { const n = navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }; if (n.gpu) n.gpu.requestAdapter = async () => { throw Error('No GPU for authoring'); }; });
  await ready(page);
  await page.locator('#remove-node').click();
  await expect(page.locator('.graph-node')).toHaveCount(1);
  await expect(page.locator('#editor-status')).toContainText('Invalid draft');
  const deleted = JSON.parse((await page.locator('#source-text').textContent())!);
  expect(deleted.edges).toEqual([]); expect(deleted.exposedParameters).toEqual([]);
  await page.locator('#node-type').selectOption('checker'); await page.locator('#add-node').click();
  await expect(page.locator('#edit-node-selection')).toHaveValue('checker-1');
  await connect(page, 'checker-1', 'color', 'out', 'baseColor');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  await page.locator('#disconnect-edge').click();
  await expect(page.locator('#editor-status')).toContainText('Invalid draft');
  await page.locator('#connect-edge').click();
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  expect((await download(page, '#download-source')).equals(await sample('checker'))).toBe(true);
  await expect(page.locator('#save-layout')).toBeEnabled();
});

test('integer, float, enum and color edits retain invalid field text and can be repaired', async ({ page }) => {
  await ready(page);
  await page.getByLabel('Edit cellsX', { exact: true }).fill('8.5');
  await expect(page.locator('#editor-diagnostics')).toContainText('MIX_');
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByLabel('Edit cellsX', { exact: true }).fill('-');
  await expect(page.locator('#editor-diagnostics')).toContainText('EDITOR_NUMBER_INCOMPLETE');
  await page.locator('#edit-node-selection').selectOption('out');
  await page.locator('#edit-node-selection').selectOption('checker');
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('-');
  await page.getByRole('button', { name: 'Use default cellsX', exact: true }).click();
  await page.getByLabel('Edit colorA Red', { exact: true }).fill('0.1234567890123456789');
  await expect(page.locator('#source-text')).toContainText('0.1234567890123456789');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  page.once('dialog', dialog => dialog.accept()); await page.locator('#samples').selectOption('wood');
  await expect(page.locator('#source-name')).toContainText('wood.mix');
  await page.locator('#edit-node-selection').selectOption('grain');
  await page.getByLabel('Edit basis', { exact: true }).selectOption('cellular');
  await page.getByLabel('Edit persistence', { exact: true }).fill('0.5');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  await expect(page.locator('#source-text')).toContainText('"basis": "cellular"');
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Rust cycle and type diagnostics identify nodes and invalid drafts remain repairable', async ({ page }) => {
  await ready(page, 'wood');
  await connect(page, 'height', 'value', 'stretch', 'in');
  await expect(page.locator('#editor-diagnostics')).toContainText('MIX_GRAPH_CYCLE');
  await expect(page.locator('.node-error')).not.toHaveCount(0);
  await connect(page, 'grain', 'value', 'stretch', 'in');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  await connect(page, 'normal', 'normal', 'out', 'baseColor');
  await expect(page.locator('#editor-diagnostics')).toContainText('MIX_');
  await expect(page.locator('#editor-status')).toContainText('Invalid draft');
  await connect(page, 'color', 'color', 'out', 'baseColor');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
});

test('material dirtiness protects replacement, discard restores bytes, and new material starts validated', async ({ page }) => {
  await ready(page); await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  page.once('dialog', dialog => dialog.dismiss()); await page.locator('#samples').selectOption('wood');
  await expect(page.locator('#samples')).toHaveValue('checker');
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('4');
  page.once('dialog', dialog => dialog.accept()); await page.locator('#discard-edits').click();
  await expect(page.locator('#editor-status')).toHaveText('Material source unchanged.');
  expect(Buffer.from((await page.locator('#source-text').textContent())!).equals(await sample('checker'))).toBe(true);
  await page.locator('#new-material').click();
  await expect(page.locator('#source-name')).toContainText('untitled.mix');
  await expect(page.locator('#editor-status')).toContainText('unsaved');
  await expect(page.locator('.graph-node')).toHaveCount(2);
});

interface Barrier { hold: boolean; held: boolean; maps: number; release(): void; }
declare global { interface Window { editMap: Barrier; } }
test('rapid authored edits replace pending work; incomplete and invalid drafts suppress old GPU completions', async ({ page }, info) => {
  await page.addInitScript(() => {
    const control: Barrier = window.editMap = { hold: false, held: false, maps: 0, release() {} };
    const proto = (globalThis as unknown as { GPUBuffer: { prototype: { mapAsync(...args: unknown[]): Promise<void> } } }).GPUBuffer.prototype;
    const original = proto.mapAsync;
    proto.mapAsync = function (...args) {
      control.maps++; const mapped = original.apply(this, args);
      if (!control.hold) return mapped;
      control.hold = false;
      return mapped.then(() => new Promise<void>(resolve => { control.held = true; control.release = () => { control.held = false; resolve(); }; }));
    };
  });
  await ready(page); await gpu(page); const before = await pixels(page);
  await page.evaluate(() => { window.editMap.hold = true; });
  await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  await expect.poll(() => page.evaluate(() => window.editMap.held)).toBe(true);
  await page.getByLabel('Edit cellsX', { exact: true }).fill('5');
  await page.getByLabel('Edit cellsX', { exact: true }).fill('6');
  await expect(page.locator('#status')).toContainText('Latest changes queued');
  await expect(page.locator('#download')).toBeDisabled(); expect(await pixels(page)).toEqual(before);
  await page.evaluate(() => window.editMap.release()); await expect(page.locator('#status')).toHaveText('Render complete.');
  expect(await page.evaluate(() => window.editMap.maps)).toBe(3);
  const latest = await pixels(page); expect(latest).not.toEqual(before);
  await page.evaluate(() => { window.editMap.hold = true; });
  await page.getByLabel('Edit cellsX', { exact: true }).fill('7');
  await expect.poll(() => page.evaluate(() => window.editMap.held)).toBe(true);
  await page.getByLabel('Edit cellsX', { exact: true }).fill('-');
  await expect(page.locator('#editor-status')).toContainText('Invalid draft');
  await page.evaluate(() => window.editMap.release());
  await page.locator('#dispose').click(); await expect(page.locator('#status')).toContainText('GPU disposed');
  expect(await pixels(page)).toEqual(latest); await expect(page.locator('#download')).toBeDisabled();
  await expect(page.locator('#preview-state')).toHaveAttribute('data-stale', 'true');
  await info.attach('authored-freshness.json', { body: JSON.stringify({ maps: await page.evaluate(() => window.editMap.maps), intermediateDropped: true, invalidDraftSuppressedOldResult: true }), contentType: 'application/json' });
});

test('real device loss blocks edited preview but leaves authoring usable', async ({ page }) => {
  await page.addInitScript(() => {
    const proto = (globalThis as unknown as { GPUAdapter: { prototype: { requestDevice(...args: unknown[]): Promise<{ destroy(): void; lost: Promise<unknown> }> } } }).GPUAdapter.prototype;
    const original = proto.requestDevice;
    proto.requestDevice = async function (...args) { const device = await original.apply(this, args); (window as unknown as { editDevice: typeof device }).editDevice = device; return device; };
  });
  await ready(page); await gpu(page);
  await page.evaluate(async () => { const device = (window as unknown as { editDevice: { destroy(): void; lost: Promise<unknown> } }).editDevice; device.destroy(); await device.lost; });
  await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  await expect(page.locator('#error')).toBeVisible(); await expect(page.locator('#download')).toBeDisabled();
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toBeEnabled();
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
});

for (const [name, node, parameter, value] of [
  ['glazed-ceramic', 'tiles', 'cellsX', '6'], ['leather', 'grain', 'seed', '42'], ['wood', 'warp', 'strengthX', '0.04'],
]) test(`${name}: authored parameters produce four exact independent runtime previews`, async ({ page, context }, info) => {
  await ready(page, name); await page.locator('#edit-node-selection').selectOption(node);
  await page.getByLabel(`Edit ${parameter}`, { exact: true }).fill(value);
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  const source = (await page.locator('#source-text').textContent())!;
  const referencePage = await context.newPage(); await referencePage.goto('tests/contract.html');
  const channels: ChannelId[] = ['baseColor', 'normal', 'roughness', 'height'];
  const reference = await referencePage.evaluate(async ({ source, channels }) => {
    const runtime = await window.mixtureContract.loadRuntime(), device = await runtime.createGpu();
    try { const result = await device.render(source, { size: [128, 128], channels }); return { context: device.context, outputs: result.channels.map(c => ({ id: c.channel, pixels: [...c.pixels] })) }; }
    finally { await device.destroy(); }
  }, { source, channels }); await referencePage.close();
  await page.locator('#width').fill('128'); await page.locator('#height').fill('128'); await gpu(page);
  const measurements = [];
  for (const channel of reference.outputs) {
    if (channel.id !== 'baseColor') { await page.locator('#channels').selectOption(channel.id); await expect(page.locator('#status')).toHaveText('Render complete.'); }
    const png = await download(page, '#download'), decoded = decodePng(png), expected = sha(new Uint8Array(channel.pixels));
    const canvas = sha(new Uint8Array(await pixels(page)));
    expect([decoded.width, decoded.height]).toEqual([128, 128]); expect(sha(decoded.pixels)).toBe(expected); expect(canvas).toBe(expected);
    measurements.push({ channel: channel.id, expected, canvas, pngPixels: sha(decoded.pixels), png: sha(png) });
  }
  expect((await download(page, '#download-source')).equals(await sample(name))).toBe(true);
  await page.locator('#dispose').click(); await expect(page.locator('#status')).toContainText('GPU disposed');
  await info.attach(`${name}-edited.mix`, { body: source, contentType: 'application/json' });
  await info.attach(`${name}-editing.json`, { body: JSON.stringify({ sourceSha256: sha(Buffer.from(source)), measurements, context: reference.context }, (_key, v) => typeof v === 'bigint' ? v.toString() : v), contentType: 'application/json' });
  await page.evaluate(() => window.scrollTo(0, 0));
  await info.attach(`${name}-editing.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});
