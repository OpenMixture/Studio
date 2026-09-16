import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const sample = (name = 'checker') => readFile(`public/samples/${name}.mix`);
async function ready(page: Page) { await page.goto('studio.html'); await expect(page.locator('#editor-status')).toContainText('unchanged'); }
async function download(page: Page, id = '#save-material') {
  const pending = page.waitForEvent('download'); await page.locator(id).click();
  const result = await pending; return readFile((await result.path())!);
}
const draft = (page: Page) => page.locator('#source-text').textContent();

test('history restores invalid buffers, atomic deletion, bindings and drag transactions', async ({ page }) => {
  await ready(page); const original = await draft(page);
  await page.getByLabel('Edit cellsX', { exact: true }).fill('-');
  await expect(page.locator('#save-material')).toBeDisabled();
  await page.locator('#undo').click(); await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('8');
  expect(await draft(page)).toBe(original);
  await page.locator('#redo').click(); await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('-');
  await page.locator('#undo').click();
  await page.locator('#binding-id').fill('rows'); await page.locator('#binding-parameter').selectOption('cellsY'); await page.locator('#add-binding').click();
  const bound = await draft(page); expect(bound).toContain('rows');
  await page.locator('#remove-node').click(); await expect(page.locator('#binding-list')).toBeEmpty();
  await page.locator('#undo').click(); expect(await draft(page)).toBe(bound);
  await expect(page.locator('.graph-edge')).toHaveCount(1); await expect(page.locator('#binding-list li')).toHaveCount(2);
  const node = page.getByRole('button', { name: 'Node checker', exact: true });
  await node.scrollIntoViewIfNeeded();
  const before = await node.getAttribute('style'), box = (await node.boundingBox())!;
  await page.mouse.move(box.x + 30, box.y + 20); await page.mouse.down();
  await page.mouse.move(box.x + 80, box.y + 45, { steps: 8 }); await page.mouse.up();
  const moved = await node.getAttribute('style'); expect(moved).not.toBe(before);
  await page.locator('#undo').click(); expect(await node.getAttribute('style')).toBe(before);
  await page.locator('#redo').click(); expect(await node.getAttribute('style')).toBe(moved);
});

test('unchanged save is exact; edited save excludes overrides and reopens with matching sidecar', async ({ page }, info) => {
  await ready(page); expect(await download(page)).toEqual(await sample());
  await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  await page.locator('#binding-id').fill('rows'); await page.locator('#binding-parameter').selectOption('cellsY'); await page.locator('#add-binding').click();
  await page.locator('#parameters input').first().fill('12');
  const saved = await download(page); const doc = JSON.parse(saved.toString());
  expect(doc.nodes[0].parameters.cellsX).toBe(4); expect(doc.exposedParameters).toHaveLength(2);
  await expect(page.locator('#editor-status')).toContainText('unchanged');
  await expect(page.locator('#graph-status')).toContainText('not saved');
  await page.getByRole('button', { name: 'Node checker', exact: true }).focus(); await page.keyboard.press('ArrowRight');
  const layout = await download(page, '#save-layout');
  expect(JSON.parse(layout.toString()).sourceSha256).toBe(createHash('sha256').update(saved).digest('hex'));
  await page.locator('#undo').click(); await expect(page.locator('#graph-status')).toContainText('not saved');
  await expect(page.locator('#parameters input').first()).toHaveValue('12');
  await expect(page.locator('#editor-status')).toContainText('unchanged');
  await page.locator('#redo').click(); await expect(page.locator('#graph-status')).toContainText('Layout matches its checkpoint');
  await expect(page.locator('#parameters input').first()).toHaveValue('12');
  await page.getByLabel('Edit cellsX', { exact: true }).fill('6');
  page.once('dialog', dialog => dialog.accept()); await page.locator('#discard-edits').click();
  await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('4');
  expect(await download(page)).toEqual(saved);
  await page.locator('#file').setInputFiles({ name: 'saved.mix', mimeType: 'application/json', buffer: saved });
  await expect(page.locator('#source-name')).toContainText('saved.mix'); await expect(page.locator('#undo')).toBeDisabled();
  await page.locator('#layout-file').setInputFiles({ name: 'saved.mix.layout.json', mimeType: 'application/json', buffer: layout });
  await expect(page.locator('#graph-status')).toContainText('Layout loaded');
  expect(await download(page)).toEqual(saved);
  await info.attach('saved.mix', { body: saved, contentType: 'application/json' });
  await info.attach('saved.mix.layout.json', { body: layout, contentType: 'application/json' });
  await info.attach('studio-save.png', { body: await page.screenshot({ fullPage: true }), contentType: 'image/png' });
});

test('failed open, layout and download retain recoverable material and history', async ({ page }) => {
  await ready(page); await page.getByLabel('Edit cellsX', { exact: true }).fill('4'); const edited = await draft(page);
  await page.locator('#file').setInputFiles({ name: 'broken.mix', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#status')).toContainText('Current material, layout and history retained'); expect(await draft(page)).toBe(edited);
  await page.evaluate(() => { URL.createObjectURL = () => { throw Error('Injected download failure'); }; });
  await page.locator('#save-material').click(); await expect(page.locator('#save-status')).toContainText('draft retained');
  await expect(page.locator('#editor-status')).toContainText('unsaved');
  await page.evaluate(() => {
    const encode = TextEncoder.prototype.encode;
    TextEncoder.prototype.encode = function (input) { TextEncoder.prototype.encode = encode; throw Error(`Injected template failure: ${input?.length}`); };
  });
  await page.locator('#new-material').click(); await expect(page.locator('#save-status')).toContainText('current work retained');
  expect(await draft(page)).toBe(edited);
  const node = page.getByRole('button', { name: 'Node checker', exact: true });
  await node.focus(); await page.keyboard.press('ArrowRight'); const position = await node.getAttribute('style');
  await page.locator('#layout-file').setInputFiles({ name: 'broken.json', mimeType: 'application/json', buffer: Buffer.from('{') });
  await expect(page.locator('#graph-status')).toContainText('current positions retained'); expect(await node.getAttribute('style')).toBe(position);
  await page.locator('#save-layout').click(); await expect(page.locator('#graph-status')).toContainText('layout retained');
  await page.locator('#undo').click(); await page.locator('#undo').click(); expect(await draft(page)).toBe((await sample()).toString());
});

test('duplicate bindings are Rust-invalid and undoable; typing is one gesture; new/open cancellation retains work', async ({ page }) => {
  await ready(page); const input = page.getByLabel('Edit cellsX', { exact: true });
  await input.fill('1'); await input.pressSequentially('2'); await input.blur();
  await page.locator('#undo').click(); await expect(input).toHaveValue('8');
  await page.locator('#redo').click(); await expect(input).toHaveValue('12');
  await page.locator('#binding-id').fill('frequency'); await page.locator('#add-binding').click();
  await expect(page.locator('#save-material')).toBeDisabled(); await expect(page.locator('#editor-diagnostics')).not.toBeEmpty();
  await page.locator('#undo').click(); await expect(page.locator('#save-material')).toBeEnabled();
  page.once('dialog', d => d.dismiss()); await page.locator('#new-material').click(); await expect(input).toHaveValue('12');
  page.once('dialog', d => d.dismiss()); await page.locator('#samples').selectOption('wood'); await expect(page.locator('#samples')).toHaveValue('checker');
  await page.evaluate(() => { const read = File.prototype.arrayBuffer; File.prototype.arrayBuffer = async function() { await new Promise(r => setTimeout(r, 600)); return read.call(this); }; });
  await page.locator('#file').setInputFiles({ name: 'slow.mix', mimeType: 'application/json', buffer: await sample('wood') });
  await input.fill('7'); await page.waitForTimeout(750); await expect(input).toHaveValue('7'); await expect(page.locator('.graph-node')).toHaveCount(2);
});

for (const name of ['glazed-ceramic', 'leather', 'wood']) {
  test(`${name}: save/reopen preserves every untouched value and numeric token`, async ({ page }, info) => {
    await ready(page);
    const original = (await sample(name)).toString();
    const bytes = Buffer.from(name === 'wood' ? original.replace('0.018', '0.0180000000000000001') : original);
    await page.locator('#file').setInputFiles({ name: `${name}.mix`, mimeType: 'application/json', buffer: bytes });
    await expect(page.locator('#source-name')).toContainText(`${name}.mix`);
    expect(await download(page)).toEqual(bytes);
    const first = JSON.parse(bytes.toString()).nodes[0];
    const bindings = JSON.parse(bytes.toString()).exposedParameters ?? [];
    const choices = await page.locator('#binding-parameter option').evaluateAll(options => options.map(o => (o as HTMLOptionElement).value));
    const parameter = choices.find(p => !bindings.some((b: { nodeId: string; parameterId: string }) => b.nodeId === first.id && b.parameterId === p))!;
    expect(parameter).toBeTruthy();
    await page.locator('#binding-parameter').selectOption(parameter);
    await page.locator('#binding-id').fill('savedParameter'); await page.locator('#add-binding').click();
    await expect(page.locator('#save-material')).toBeEnabled();
    const saved = await download(page), expected = JSON.parse(bytes.toString());
    (expected.exposedParameters ??= []).push({ id: 'savedParameter', nodeId: first.id, parameterId: parameter });
    expect(JSON.parse(saved.toString())).toEqual(expected);
    if (name === 'wood') expect(saved.toString()).toContain('0.0180000000000000001');
    page.once('dialog', dialog => dialog.accept());
    await page.locator('#file').setInputFiles({ name: `saved-${name}.mix`, mimeType: 'application/json', buffer: saved });
    await expect(page.locator('#source-name')).toContainText(`saved-${name}.mix`);
    expect(await download(page)).toEqual(saved);
    await page.getByRole('button', { name: 'Remove binding savedParameter', exact: true }).click();
    await page.locator('#undo').click(); expect(await download(page)).toEqual(saved);
    await info.attach(`saved-${name}.mix`, { body: saved, contentType: 'application/json' });
  });
}

test('undo during real readback drops the old completion and renders the restored source', async ({ page }, info) => {
  await page.addInitScript(() => {
    const control = { hold: false, held: false, maps: 0, release() {} };
    (window as unknown as { saveMap: typeof control }).saveMap = control;
    const proto = (globalThis as unknown as { GPUBuffer: { prototype: { mapAsync(...args: unknown[]): Promise<void> } } }).GPUBuffer.prototype;
    const original = proto.mapAsync;
    proto.mapAsync = function (...args) {
      control.maps++; const mapped = original.apply(this, args);
      if (!control.hold) return mapped;
      control.hold = false;
      return mapped.then(() => new Promise<void>(resolve => { control.held = true; control.release = () => { control.held = false; resolve(); }; }));
    };
  });
  await ready(page); await page.locator('#width').fill('65'); await page.locator('#height').fill('3');
  await page.locator('#initialize').click(); await expect(page.locator('#status')).toContainText('WebGPU ready');
  await page.locator('#render').click(); await expect(page.locator('#status')).toHaveText('Render complete.');
  const pixels = () => page.locator('#preview').evaluate(element => { const c = element as HTMLCanvasElement; return Array.from(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data); });
  const before = await pixels();
  await page.evaluate(() => { (window as unknown as { saveMap: { hold: boolean } }).saveMap.hold = true; });
  await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  await expect.poll(() => page.evaluate(() => (window as unknown as { saveMap: { held: boolean } }).saveMap.held)).toBe(true);
  await page.locator('#undo').click(); await expect(page.locator('#download')).toBeDisabled();
  await page.evaluate(() => (window as unknown as { saveMap: { release(): void } }).saveMap.release());
  await expect(page.locator('#status')).toHaveText('Render complete.'); expect(await pixels()).toEqual(before);
  const maps = await page.evaluate(() => (window as unknown as { saveMap: { maps: number } }).saveMap.maps);
  expect(maps).toBe(3);
  await info.attach('undo-freshness.json', { body: JSON.stringify({ maps, restoredPixelsMatch: true, staleExportBlocked: true }), contentType: 'application/json' });
});
