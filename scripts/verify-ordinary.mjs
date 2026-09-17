// Installed desktop browser, fresh profile, and CDP transport only: no GPU overrides.
import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { execFileSync, spawn } from 'node:child_process';
import { resolve, join } from 'node:path';
import { platform, release, arch } from 'node:os';
import { createHash } from 'node:crypto';
import { serveStatic } from './static-server.mjs';
import { decodePng } from '../tests/helpers/png.ts';

const [browserName, destination] = process.argv.slice(2);
const executable = { chrome: 'C:/Program Files/Google/Chrome/Application/chrome.exe', edge: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe' }[browserName] ?? browserName;
if (platform() !== 'win32' || !executable || !destination) throw Error('Usage on Windows: node scripts/verify-ordinary.mjs <chrome|edge|installed-browser.exe> <new-output>');
const git = (...args) => execFileSync('git', args, { encoding: 'utf8' }).trim();
assert.equal(git('status', '--porcelain'), '', 'Commit before qualification');
const out = resolve(destination), profile = join(out, 'profile');
await mkdir(out); await mkdir(profile);
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const provenance = JSON.parse(await readFile('vendor/runtime-build.json', 'utf8'));
assert.equal(sha(await readFile('vendor/openmixture-runtime-0.1.0-alpha.0.tgz')), provenance.sha256);
const args = [`--user-data-dir=${profile}`, '--remote-debugging-port=0', 'about:blank'];
const receipt = { schemaVersion: 1, ok: false, startedAt: new Date().toISOString(), productRevision: git('rev-parse', 'HEAD'), clean: true,
  archiveSha256: provenance.sha256, lockSha256: sha(await readFile('package-lock.json')), expectedBuild: provenance,
  os: platform(), osRelease: release(), arch: arch(), node: process.version, executable: resolve(executable), executableSha256: sha(await readFile(executable)), args, steps: [], syntheticDiagnostics: [] };
const save = () => writeFile(join(out, 'receipt.json'), JSON.stringify(receipt, null, 2) + '\n');
const done = async name => { receipt.steps.push(name); await save(); console.log(name); };
const server = await serveStatic(0), base = `http://127.0.0.1:${server.address().port}/player/`; let browser, child;
receipt.baseUrl = base;
try {
  child = spawn(resolve(executable), args, { windowsHide: true, stdio: 'ignore' });
  let launchError; child.once('error', error => { launchError = error; });
  let port;
  for (let attempt = 0; attempt < 100; attempt++) {
    if (launchError) throw launchError;
    try { port = Number((await readFile(join(profile, 'DevToolsActivePort'), 'utf8')).split('\n')[0]); break; } catch { await new Promise(r => setTimeout(r, 200)); }
  }
  assert.ok(port > 0, 'Installed browser did not expose CDP');
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  receipt.browser = browser.version();
  const cdp = await browser.newBrowserCDPSession();
  const system = await cdp.send('SystemInfo.getInfo');
  receipt.browserSystemInfo = system;
  receipt.observedCommandLine = execFileSync('powershell.exe', ['-NoProfile', '-Command', `(Get-CimInstance Win32_Process -Filter "ProcessId = ${child.pid}").CommandLine`], { encoding: 'utf8' }).trim();
  // Accept only our three arguments; Chromium may append its empty flags markers.
  const normalize = text => text.replaceAll('"', '').replace(' --flag-switches-begin --flag-switches-end', '').trim();
  const expectedCommand = [resolve(executable), ...args].join(' ');
  assert.equal(normalize(receipt.observedCommandLine), normalize(expectedCommand));
  assert.equal(normalize(system.commandLine), normalize(expectedCommand));
  await done('Installed browser command line has only fresh-profile/CDP/about:blank arguments');
  const context = browser.contexts()[0], page = await context.newPage(), errors = [], assets = [];
  page.on('dialog', d => d.accept()); page.on('pageerror', e => errors.push(e.message));
  page.on('response', r => assets.push({ url: r.url(), status: r.status(), type: r.headers()['content-type'] }));
  const download = async (p, selector, filename) => {
    const pending = p.waitForEvent('download'); await p.locator(selector).click();
    const bytes = await readFile(await (await pending).path()); await writeFile(join(out, filename), bytes); return bytes;
  };
  const identity = value => {
    for (const key of ['runtimeVersion', 'apiSchemaVersion', 'engineVersion', 'engineRevision', 'engineDirty', 'buildId']) assert.deepEqual(value[key], provenance[key], `Wrong runtime ${key}`);
  };
  const initialize = async p => {
    await p.locator('#width').fill('128'); await p.locator('#height').fill('128');
    await p.locator('#initialize').click(); await expect(p.locator('#status')).toContainText('WebGPU ready', { timeout: 30000 });
    const detail = JSON.parse(await p.locator('#details').textContent()); identity(detail.build); return detail;
  };
  const rendered = p => expect(p.locator('#status')).toHaveText('Render complete.', { timeout: 30000 });
  await page.goto(`${base}studio.html`);
  await expect(page.locator('#editor-status')).toContainText('unchanged');
  assert.equal((await page.request.get(`${base}tests/contract.html`)).status(), 404);
  assert.deepEqual(await download(page, '#save-material', 'original.mix'), await readFile('public/samples/checker.mix'));
  await page.locator('#new-material').click(); await expect(page.locator('#source-name')).toContainText('untitled.mix');
  await page.getByLabel('Edit cellsX', { exact: true }).fill('-');
  await expect(page.locator('#save-material')).toBeDisabled(); await expect(page.locator('#editor-diagnostics')).not.toBeEmpty();
  await page.locator('#undo').click(); await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('8');
  await page.locator('#redo').click(); await expect(page.getByLabel('Edit cellsX', { exact: true })).toHaveValue('-');
  await page.getByLabel('Edit cellsX', { exact: true }).fill('4');
  await expect(page.locator('#editor-status')).toContainText('Valid material draft');
  await page.locator('#disconnect-edge').click(); await expect(page.locator('#save-material')).toBeDisabled();
  await page.locator('#connect-edge').click(); await expect(page.locator('#save-material')).toBeEnabled();
  await done('New/edit/invalid-draft diagnostics/undo/redo/repair/disconnect/reconnect');
  receipt.studioContext = await initialize(page); await page.locator('#render').click(); await rendered(page);
  const source = await download(page, '#save-material', 'saved.mix');
  receipt.savedSha256 = sha(source); assert.equal(JSON.parse(source).nodes[0].parameters.cellsX, 4);
  const outputs = {};
  for (const channel of ['baseColor', 'normal', 'roughness', 'height']) {
    await page.locator('#channels').selectOption(channel); await rendered(page);
    const png = decodePng(await download(page, '#download', `studio-${channel}.png`));
    assert.deepEqual([png.width, png.height, png.gamma, png.srgb], [128, 128, channel === 'baseColor' ? 45455 : 100000, channel === 'baseColor' ? 0 : undefined]);
    outputs[channel] = sha(png.pixels);
    if (channel === 'baseColor') {
      // Independent checker sentinel, authored 4 x 8, including alpha.
      for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
        const v = ((Math.floor(x / 32) + Math.floor(y / 16)) % 2) * 255;
        assert.deepEqual([...png.pixels.subarray((y * 128 + x) * 4, (y * 128 + x) * 4 + 4)], [v, v, v, 255]);
      }
    }
  }
  receipt.pixelSha256 = outputs;
  await page.screenshot({ path: join(out, 'studio.png'), fullPage: true });
  await page.locator('#dispose').click(); await expect(page.locator('#status')).toContainText('GPU disposed');
  await expect(page.locator('#preview')).toBeVisible();
  await page.locator('#file').setInputFiles({ name: 'saved.mix', mimeType: 'application/json', buffer: source });
  await expect(page.locator('#source-name')).toContainText('saved.mix');
  assert.deepEqual(await download(page, '#save-material', 'reopened.mix'), source);
  await done('Studio initialize/render/four PNG encodings/exact checker/dispose/save/reopen exact bytes');
  const player = await context.newPage(); player.on('pageerror', e => errors.push(e.message));
  await player.goto(base); await expect(player.locator('#status')).toContainText('Checker loaded');
  await player.locator('#file').setInputFiles({ name: 'saved.mix', mimeType: 'application/json', buffer: source });
  await expect(player.locator('#source-name')).toContainText('saved.mix');
  receipt.playerContext = await initialize(player); await player.locator('#render').click(); await rendered(player);
  assert.equal(await player.locator('#source-text').textContent(), source.toString());
  for (const channel of Object.keys(outputs)) {
    await player.locator('#channels').selectOption(channel); await rendered(player);
    assert.equal(sha(decodePng(await download(player, '#download', `player-${channel}.png`)).pixels), outputs[channel]);
  }
  await player.locator('#dispose').click(); await expect(player.locator('#status')).toContainText('GPU disposed');
  await player.screenshot({ path: join(out, 'player.png'), fullPage: true });
  await done('Independent Player opens exact saved bytes; four exported channels match; explicit disposal');
  // Separate injected probe, never counted as a naturally unsupported host or a render.
  const unavailable = await context.newPage();
  await unavailable.addInitScript(() => { Object.defineProperty(navigator, 'gpu', { configurable: true, get: () => undefined }); });
  await unavailable.goto(`${base}studio.html`);
  await expect(unavailable.locator('.graph-node')).toHaveCount(2);
  await unavailable.locator('#initialize').click(); await expect(unavailable.locator('#error')).toBeVisible();
  const diagnostic = await unavailable.locator('#error').textContent();
  assert.ok(diagnostic.trim().length > 0);
  await unavailable.getByLabel('Edit cellsX', { exact: true }).fill('6');
  await expect(unavailable.locator('#save-material')).toBeEnabled();
  receipt.syntheticDiagnostics.push({ injection: 'navigator.gpu unavailable', diagnostic, graphAndEditingUsable: true });
  await unavailable.screenshot({ path: join(out, 'unsupported.png'), fullPage: true });
  assert.deepEqual(errors, []); receipt.assets = assets;
  assert.ok(assets.some(a => a.url.endsWith('.wasm') && a.status === 200 && a.type === 'application/wasm'));
  receipt.ok = true; await done('Separate unsupported-GPU diagnostic probe keeps graph/editing usable');
} catch (error) { receipt.failure = error.stack; throw error; }
finally {
  receipt.completedAt = new Date().toISOString(); await save();
  if (browser) { try { const cdp = await browser.newBrowserCDPSession(); await cdp.send('Browser.close'); } catch {} }
  else child?.kill();
  await new Promise(r => server.close(r));
}
