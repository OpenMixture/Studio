import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import type { ChannelId } from '@openmixture/runtime';
import type {} from './harness';
import { decodePng } from './helpers/png';

const sample = (name: string) => readFile(new URL(`../public/samples/${name}.mix`, import.meta.url));
const sha = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
async function ready(page: Page) {
  await page.goto('studio.html');
  await expect(page.locator('#graph-summary')).toHaveText('2 nodes · 1 connections · source graph');
}
async function download(page: Page, id: string) {
  const pending = page.waitForEvent('download'); await page.locator(id).click();
  const file = await pending;
  return { name: file.suggestedFilename(), bytes: await readFile((await file.path())!) };
}

test('source graphs for all samples work without GPU acquisition and show catalog details', async ({ page }) => {
  await page.addInitScript(() => { const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu; if (gpu) gpu.requestAdapter = async () => { throw Error('Graph must not acquire a GPU'); }; });
  await ready(page);
  for (const name of ['checker', 'glazed-ceramic', 'leather', 'wood']) {
    if (name !== 'checker') await page.locator('#samples').selectOption(name);
    const document = JSON.parse((await sample(name)).toString());
    await expect(page.locator('.graph-node')).toHaveCount(document.nodes.length);
    await expect(page.locator('.graph-edge')).toHaveCount(document.edges.length);
    for (const node of document.nodes) await expect(page.locator('.graph-node').filter({ has: page.locator('strong', { hasText: new RegExp(`^${node.id}$`) }) })).toHaveCount(1);
    await page.locator('#graph-selection').selectOption(document.nodes[0].id);
    await expect(page.locator('#graph-inspector')).toContainText(document.nodes[0].type);
    expect((await download(page, '#download-source')).bytes.equals(await sample(name))).toBe(true);
    // Mark the layout downloaded before switching files.
    await download(page, '#save-layout');
  }
  await expect(page.locator('#status')).toContainText('Source is valid');
  await page.locator('#initialize').click();
  await expect(page.locator('#error')).toBeVisible();
  await expect(page.locator('.graph-node')).toHaveCount(9);
});

test('projection keeps disconnected nodes and numeric source tokens; invalid bytes clear the graph', async ({ page }) => {
  await ready(page);
  const doc = JSON.parse((await sample('checker')).toString());
  doc.nodes.push({ id: 'unused', type: 'checker', version: 1 });
  doc.nodes[0].parameters = { cellsX: 8 };
  const input = Buffer.from(JSON.stringify(doc));
  await page.locator('#file').setInputFiles({ name: 'disconnected.mix', mimeType: 'application/json', buffer: input });
  await expect(page.locator('.graph-node')).toHaveCount(3);
  expect((await download(page, '#download-source')).bytes.equals(input)).toBe(true);
  const wood = (await sample('wood')).toString().replace('0.018', '0.0180000000000000001');
  await page.locator('#file').setInputFiles({ name: 'tokens.mix', mimeType: 'application/json', buffer: Buffer.from(wood) });
  await expect(page.locator('.graph-node')).toHaveCount(9);
  await page.locator('#graph-selection').selectOption('warp');
  await expect(page.locator('#graph-inspector')).toContainText('0.0180000000000000001 (source)');
  await download(page, '#save-layout');
  for (const invalid of [Buffer.from('{"version":1,"version":1}'), Buffer.from([0xff, 0xfe]), Buffer.from('{"version":9007199254740993}')]) {
    await page.locator('#file').setInputFiles({ name: 'invalid.mix', mimeType: 'application/json', buffer: invalid });
    await expect(page.locator('#error')).toBeVisible();
    await expect(page.locator('.graph-node')).toHaveCount(0);
    await expect(page.locator('#download-source')).toBeDisabled();
  }
});

test('keyboard, dragging, sidecar round trips and layout failures preserve material bytes', async ({ page }, info) => {
  await ready(page);
  const node = page.getByRole('button', { name: 'Node checker', exact: true });
  await node.focus(); const before = await node.getAttribute('style'); await page.keyboard.press('ArrowRight');
  expect(await node.getAttribute('style')).not.toBe(before);
  await expect(page.locator('#graph-status')).toContainText('not saved');
  const box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 40, box.y + 15); await page.mouse.down(); await page.mouse.move(box.x + 85, box.y + 55); await page.mouse.up();
  await page.locator('#graph-viewport').focus(); await page.keyboard.press('ArrowDown'); await page.keyboard.press('+');
  const stored = await download(page, '#save-layout');
  const layout = JSON.parse(stored.bytes.toString());
  expect(layout.sourceSha256).toBe(sha(await sample('checker')));
  await page.locator('#graph-reset').click();
  await page.locator('#layout-file').setInputFiles({ name: stored.name, mimeType: 'application/json', buffer: stored.bytes });
  await expect(page.locator('#graph-status')).toContainText('Layout loaded');
  expect(JSON.parse((await download(page, '#save-layout')).bytes.toString())).toEqual(layout);
  expect((await download(page, '#download-source')).bytes.equals(await sample('checker'))).toBe(true);
  await page.locator('#layout-file').setInputFiles({ name: 'wrong.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ ...layout, sourceSha256: 'wrong' })) });
  await expect(page.locator('#graph-status')).toContainText('Layout ignored; using default positions');
  await expect(page.locator('.graph-node')).toHaveCount(2);
  await page.locator('#layout-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#graph-status')).toContainText('Layout ignored');
  expect((await download(page, '#download-source')).bytes.equals(await sample('checker'))).toBe(true);
  await page.locator('#graph-reset').click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.locator('#samples').selectOption('wood');
  await expect(page.locator('#samples')).toHaveValue('checker');
  await expect(page.locator('.graph-node')).toHaveCount(2);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await info.attach('studio-narrow.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('late source and layout reads cannot replace a newer graph or layout', async ({ page }) => {
  await ready(page);
  await page.evaluate(() => {
    const read = File.prototype.arrayBuffer, text = File.prototype.text;
    File.prototype.arrayBuffer = async function() { if (this.name === 'slow.mix') await new Promise(resolve => setTimeout(resolve, 700)); return read.call(this); };
    File.prototype.text = async function() { if (this.name === 'slow.json') await new Promise(resolve => setTimeout(resolve, 700)); return text.call(this); };
  });
  await page.locator('#file').setInputFiles({ name: 'slow.mix', mimeType: 'application/json', buffer: await sample('wood') });
  await page.locator('#samples').selectOption('leather');
  await expect(page.locator('#source-name')).toContainText('leather.mix');
  const count = JSON.parse((await sample('leather')).toString()).nodes.length;
  await expect(page.locator('.graph-node')).toHaveCount(count);
  await page.waitForTimeout(850);
  await expect(page.locator('#source-name')).toContainText('leather.mix');
  const layout = await download(page, '#save-layout');
  await page.locator('#layout-file').setInputFiles({ name: 'slow.json', mimeType: 'application/json', buffer: layout.bytes });
  await page.locator('#graph-reset').click();
  await page.waitForTimeout(850);
  await expect(page.locator('#graph-status')).toContainText('not saved');
});

for (const name of ['glazed-ceramic', 'leather', 'wood']) {
  test(`Studio ${name} preview and PNG match independent installed runtime`, async ({ page, context }, info) => {
    const source = await sample(name), referencePage = await context.newPage();
    await referencePage.goto('tests/contract.html');
    const channels: ChannelId[] = ['baseColor', 'normal', 'roughness', 'height'];
    const reference = await referencePage.evaluate(async ({ source, channels }) => {
      const runtime = await window.mixtureContract.loadRuntime(), gpu = await runtime.createGpu();
      try {
        const result = await gpu.render(new Uint8Array(source), { size: [128, 128], channels });
        return { context: gpu.context, outputs: result.channels.map(c => ({ id: c.channel, pixels: Array.from(c.pixels) })) };
      } finally { await gpu.destroy(); }
    }, { source: [...source], channels });
    await referencePage.close();
    await ready(page); await page.locator('#samples').selectOption(name);
    await expect(page.locator('#source-name')).toContainText(`${name}.mix`);
    await page.locator('#width').fill('128'); await page.locator('#height').fill('128');
    await page.locator('#initialize').click(); await expect(page.locator('#status')).toHaveText('WebGPU ready. Render when ready.');
    await page.locator('#render').click(); await expect(page.locator('#status')).toHaveText('Render complete.');
    const measurements = [];
    for (const channel of reference.outputs) {
      if (channel.id !== 'baseColor') { await page.locator('#channels').selectOption(channel.id); await expect(page.locator('#status')).toHaveText('Render complete.'); }
      const png = (await download(page, '#download')).bytes;
      const decoded = decodePng(png);
      const canvas = await page.locator('#preview').evaluate((element: HTMLCanvasElement) =>
        Array.from(element.getContext('2d')!.getImageData(0, 0, element.width, element.height).data));
      const expected = sha(new Uint8Array(channel.pixels));
      expect([decoded.width, decoded.height]).toEqual([128, 128]);
      expect(sha(decoded.pixels)).toBe(expected);
      expect(sha(new Uint8Array(canvas))).toBe(expected);
      measurements.push({ channel: channel.id, size: [decoded.width, decoded.height], referencePixelSha256: expected,
        canvasPixelSha256: sha(new Uint8Array(canvas)), pngPixelSha256: sha(decoded.pixels), pngSha256: sha(png) });
    }
    await page.locator('#dispose').click(); await expect(page.locator('#status')).toContainText('GPU disposed');
    await expect(page.locator('#preview')).toBeVisible();
    expect((await download(page, '#download-source')).bytes.equals(source)).toBe(true);
    await info.attach(`${name}-measurements.json`, { body: JSON.stringify({ sourceSha256: sha(source), measurements }), contentType: 'application/json' });
    await info.attach(`${name}-context.json`, { body: JSON.stringify(reference.context, (_k, v) => typeof v === 'bigint' ? v.toString() : v), contentType: 'application/json' });
    await info.attach(`${name}-studio.png`, { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
  });
}
