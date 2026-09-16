// Capture real Studio downloads; this is not an alternate source serializer.
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve, join } from 'node:path';
import { createHash } from 'node:crypto';
import { serveStatic } from './static-server.mjs';
const out = resolve(process.argv[2] ?? '');
if (!process.argv[2]) throw Error('Usage: node scripts/author-studio.mjs <new-directory>');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
if (git('status', '--porcelain')) throw Error('Commit before recording authoring provenance.');
await mkdir(out);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const server = await serveStatic(); let browser;
const manifest = { schemaVersion: 1, productRevision: git('rev-parse', 'HEAD'), archiveSha256: sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz')), cases: [] };
try {
 browser = await chromium.launch({ channel: 'chromium' }); const page = await browser.newPage();
 page.on('dialog', d => d.accept());
 await page.goto('http://127.0.0.1:4173/player/studio.html');
 await expect(page.locator('#editor-status')).toContainText('unchanged');
 const save = async (material, id, provenance) => {
  await expect(page.locator('#save-material')).toBeEnabled();
  const pending = page.waitForEvent('download'); await page.locator('#save-material').click();
  const bytes = await readFile(await (await pending).path());
  await mkdir(join(out, material), { recursive: true }); await writeFile(join(out, material, `${id}.mix`), bytes);
  manifest.cases.push({ material, id, sourceSha256: sha(bytes), ...provenance });
  if (id === 'authored') await page.screenshot({ path: join(out, material, 'authoring.png'), fullPage: true });
 };
 await page.locator('#new-material').click(); await expect(page.locator('#source-name')).toContainText('untitled.mix');
 await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
 await page.locator('#binding-id').fill('rows'); await page.locator('#binding-parameter').selectOption('cellsY'); await page.locator('#add-binding').click();
 await save('checker', 'authored', { actions: ['New checker material', 'checker.cellsX=4', 'Add rows -> checker.cellsY'] });
 for (const [material, edits] of [['glazed-ceramic', { tilesX: 16, tilesY: 16 }], ['leather', { detail: 1 }], ['wood', { grainRepeat: 16 }]]) {
  await page.locator('#samples').selectOption(material); await expect(page.locator('#source-name')).toContainText(`${material}.mix`);
  const original = await readFile(`public/samples/${material}.mix`), source = JSON.parse(original);
  await save(material, 'default', { sampleSha256: sha(original), actions: ['Open sample', 'Save unchanged'] });
  for (const [publicId, value] of Object.entries(edits)) {
   const binding = source.exposedParameters.find(b => b.id === publicId);
   await page.locator('#edit-node-selection').selectOption(binding.nodeId);
   await page.getByLabel(`Edit ${binding.parameterId}`, { exact: true }).fill(String(value));
  }
  // Prove authored public bindings travel through the saved material too.
  const nodeId = await page.locator('#edit-node-selection').inputValue();
  const options = await page.locator('#binding-parameter option').evaluateAll(items => items.map(o => o.value));
  const target = options.find(p => !source.exposedParameters.some(b => b.nodeId === nodeId && b.parameterId === p));
  if (!target) throw Error('No unbound parameter for authoring case');
  await page.locator('#binding-id').fill('studioParameter'); await page.locator('#binding-parameter').selectOption(target); await page.locator('#add-binding').click();
  await save(material, 'authored', { sampleSha256: sha(original), authoredFromPublicBindings: edits, addedBinding: { id: 'studioParameter', nodeId, parameterId: target } });
 }
 manifest.browser = browser.version(); await writeFile(join(out, 'authored.json'), JSON.stringify(manifest, null, 2)+'\n');
} finally { await browser?.close(); await new Promise(r => server.close(r)); }
