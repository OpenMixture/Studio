import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { platform, release, arch } from 'node:os';
import type {} from './harness';

const provenance = JSON.parse(await readFile(new URL('../vendor/runtime-build.json', import.meta.url), 'utf8'));
const expectedBuild = Object.fromEntries(['runtimeVersion', 'apiSchemaVersion', 'engineVersion', 'engineRevision', 'engineDirty', 'buildId']
  .map((key) => [key, provenance[key]]));

const checker = await readFile(new URL('../public/samples/checker.mix', import.meta.url), 'utf8');

// Exact independent black/white sentinels for the unchanged 8-by-8 checker at 65-by-3.
// Odd width exercises the renderer's padded GPU staging rows, returned tightly packed.
const row = '00000000011111111000000001111111100000000111111110000000011111111';
const expectedChecker = [...row + row + [...row].map((value) => value === '0' ? '1' : '0').join('')]
  .flatMap((value) => value === '0' ? [0, 0, 0, 255] : [255, 255, 255, 255]);

async function harness(page: import('@playwright/test').Page): Promise<void> {
  await page.goto('tests/contract.html');
  await page.waitForFunction(() => Boolean(window.mixtureContract));
}

test('package import has no WASM effects; CPU contract does not touch WebGPU', async ({ page }) => {
  const wasmRequests: string[] = [];
  page.on('request', (request) => { if (request.url().includes('.wasm')) wasmRequests.push(request.url()); });
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'gpu', {
      configurable: true,
      get() { throw new Error('CPU-only contract attempted to access navigator.gpu'); },
    });
  });
  await harness(page);
  expect(wasmRequests).toEqual([]);
  const result = await page.evaluate(async (source) => {
    const module = await window.mixtureContract.loadRuntime();
    const valid = module.validate(source, { size: [65, 3] });
    const inspected = module.inspect(source, { size: [65, 3] });
    const duplicateKey = module.validate(source.replace('"version": 1', '"version": 1, "version": 1'));
    const floatVersion = module.validate(source.replace('"version": 1', '"version": 1.0'));
    const invalidUtf8 = (() => {
      try { return module.validate(new Uint8Array([0xff])); }
      catch (failure) { return { code: (failure as { code: string }).code }; }
    })();
    const invalidRequest = (() => {
      try { return module.inspect(source, { size: [65.5, 3] }); }
      catch (failure) { return { code: (failure as { code: string }).code }; }
    })();
    const fractionalOverride = (() => {
      try { return module.inspect(source, { overrides: { frequency: 8.5 } }); }
      catch (failure) { return { code: (failure as { code: string }).code }; }
    })();
    const overridden = module.inspect(source, { overrides: { frequency: 4 }, size: [65, 3] });
    return {
      valid: valid.ok,
      hash: inspected.plan.hash,
      validatedHash: valid.ok ? valid.plan.hash : null,
      catalogSize: module.getNodeCatalog().length,
      build: module.getBuildInfo(),
      duplicateKey, floatVersion, invalidUtf8, invalidRequest, fractionalOverride,
      overriddenHash: overridden.plan.hash,
      estimateTypes: Object.fromEntries(Object.entries(inspected.plan.estimates).map(([key, value]) => [key, typeof value])),
    };
  }, checker);
  expect(result.valid).toBe(true);
  expect(result.catalogSize).toBe(11);
  expect(result.hash).toBe(result.validatedHash);
  expect(result.overriddenHash).not.toBe(result.hash);
  expect(result.duplicateKey.ok).toBe(false);
  expect(result.floatVersion.ok).toBe(false);
  expect(result.invalidUtf8).toMatchObject({ ok: false, diagnostics: [{ code: 'MIX_PARSE_INVALID_UTF8' }] });
  expect(result.invalidRequest).toHaveProperty('code', 'MIX_BROWSER_INVALID_ARGUMENT');
  expect(result.fractionalOverride).toHaveProperty('code');
  expect(result.estimateTypes).toEqual({
    textureBytes: 'bigint', uniformBytes: 'bigint', paddedBytesPerRow: 'number',
    readbackBufferBytes: 'bigint', readbackBytes: 'bigint', cumulativeReadbackBytes: 'bigint',
    cumulativeBytes: 'bigint', peakBytes: 'bigint',
  });
  expect(result.build).toEqual(expectedBuild);
  expect(wasmRequests.length).toBeGreaterThan(0);
});

test('missing WASM produces a structured loader failure', async ({ page }) => {
  await page.route('**/missing-runtime.wasm', (route) => route.fulfill({ status: 404, body: 'Missing runtime' }));
  await harness(page);
  const failure = await page.evaluate(async () => {
    try {
      await window.mixtureContract.loadRuntime({ wasm: new URL('missing-runtime.wasm', location.href) });
      return null;
    } catch (error) {
      const failure = error as { name: string; code: string; operation: string; browserFailure?: unknown };
      return { name: failure.name, code: failure.code, operation: failure.operation, browserFailure: failure.browserFailure };
    }
  });
  expect(failure).toMatchObject({ name: 'MixtureRuntimeError', code: 'MIX_BROWSER_WASM_LOAD_FAILED', operation: 'loadRuntime' });
  expect(failure?.browserFailure).toBeTruthy();
});

test('explicit packaged WASM URL and supplied bytes load without a loader refetch', async ({ page }) => {
  const wasmUrls: string[] = [];
  page.on('request', (request) => { if (request.url().includes('.wasm')) wasmUrls.push(request.url()); });
  await harness(page);
  await page.evaluate(() => window.mixtureContract.loadRuntime().then((module) => module.getBuildInfo()));
  const packagedUrl = wasmUrls[0];
  expect(packagedUrl).toBeTruthy();
  expect(new URL(packagedUrl).pathname).toMatch(/^\/player\/assets\/.+\.wasm$/);

  await page.reload();
  await page.waitForFunction(() => Boolean(window.mixtureContract));
  const explicit = await page.evaluate(async (url) => {
    const module = await window.mixtureContract.loadRuntime({ wasm: new URL(url) });
    return module.getBuildInfo();
  }, packagedUrl);
  expect(explicit.runtimeVersion).toBe('0.1.0-alpha.0');

  await page.reload();
  await page.waitForFunction(() => Boolean(window.mixtureContract));
  const before = wasmUrls.length;
  const byteLoad = await page.evaluate(async ({ url, source }) => {
    const response = await fetch(url);
    const bytes = new Uint8Array(await response.arrayBuffer());
    // A loader fetch after bytes are supplied is a contract failure.
    globalThis.fetch = async () => { throw new Error('Unexpected loader fetch with supplied bytes'); };
    const module = await window.mixtureContract.loadRuntime({ wasm: bytes });
    return module.validate(source).ok;
  }, { url: packagedUrl, source: checker });
  expect(byteLoad).toBe(true);
  expect(wasmUrls.length - before).toBe(1);
});

test('real WebGPU renders owned odd-size pixels and obeys busy/destruction rules', async ({ page, browser }, testInfo) => {
  await harness(page);
  const result = await page.evaluate(async (source) => {
    const module = await window.mixtureContract.loadRuntime();
    // No skip or fabricated result when WebGPU acquisition fails.
    const gpu = await module.createGpu();
    const acquiredContext = gpu.context;
    const errorCode = async (operation: () => unknown): Promise<string | null> => {
      try { await operation(); return null; }
      catch (failure) { return (failure as { code: string }).code; }
    };
    try {
      const callerBytes = new TextEncoder().encode(source);
      const firstPending = gpu.render(callerBytes, { size: [65, 3], channels: ['baseColor'] });
      callerBytes.fill(0); // Accepted input is captured before the asynchronous render yields.
      const first = await firstPending;
      const firstPixels = first.channels[0].pixels;
      const snapshot = Array.from(firstPixels);
      const pending = gpu.render(source, { size: [9, 5], overrides: { frequency: 4 } });
      const busy = await errorCode(() => gpu.render(source));
      const second = await pending;
      second.channels[0].pixels[0] = 123;
      const retainedAfterRender = Array.from(firstPixels);
      const last = gpu.render(source, { size: [65, 3] });
      const closing = gpu.destroy();
      const destroyed = await errorCode(() => gpu.render(source));
      const lastResult = await last;
      await Promise.all([closing, gpu.destroy()]);
      const afterDestroy = await errorCode(() => gpu.render(source));
      const plain = (value: unknown) => JSON.parse(JSON.stringify(value, (_key, item: unknown) => typeof item === 'bigint' ? item.toString() : item));
      return {
        pixels: snapshot,
        retainedAfterRender,
        retainedAfterDestroy: Array.from(firstPixels),
        lastPixels: Array.from(lastResult.channels[0].pixels),
        byteType: firstPixels instanceof Uint8Array,
        size: first.channels[0].size,
        encoding: first.channels[0].encoding,
        busy, destroyed, afterDestroy,
        cpuAfterDestroy: module.validate(source).ok,
        evidence: plain({ build: module.getBuildInfo(), context: acquiredContext, plan: first.plan, report: first.report, browser: navigator.userAgent }),
      };
    } finally {
      await gpu.destroy();
    }
  }, checker);
  expect(result.byteType).toBe(true);
  expect(result.size).toEqual([65, 3]);
  expect(result.encoding).toBe('rgba8-srgb');
  expect(result.pixels).toEqual(expectedChecker);
  expect(result.retainedAfterRender).toEqual(expectedChecker);
  expect(result.retainedAfterDestroy).toEqual(expectedChecker);
  expect(result.lastPixels).toEqual(expectedChecker);
  expect(result.busy).toBe('MIX_BROWSER_RUNTIME_BUSY');
  expect(result.destroyed).toBe('MIX_BROWSER_RUNTIME_DESTROYED');
  expect(result.afterDestroy).toBe('MIX_BROWSER_RUNTIME_DESTROYED');
  expect(result.cpuAfterDestroy).toBe(true);
  await testInfo.attach('runtime-context.json', { body: JSON.stringify({ ...result.evidence, environment: { browserVersion: browser.version(), os: platform(), osRelease: release(), architecture: arch(), node: process.version, launchArgs: testInfo.project.use.launchOptions?.args, channel: testInfo.project.use.channel, baseUrl: testInfo.project.use.baseURL } }, null, 2), contentType: 'application/json' });
});

test('Player loads user bytes, reports invalid input, renders and keeps preview after disposal', async ({ page }) => {
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Checker loaded. Initialize WebGPU to render.');
  await page.getByRole('button', { name: 'Validate source', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Source is valid. Validation does not acquire a GPU.');
  await page.locator('#file').setInputFiles({ name: 'duplicate.mix', mimeType: 'application/json', buffer: Buffer.from(checker.replace('"version": 1', '"version": 1, "version": 1')) });
  await page.getByRole('button', { name: 'Validate source', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Source is invalid.');
  await expect(page.getByRole('alert')).toBeVisible();
  await page.locator('#file').setInputFiles({ name: 'my-checker.mix', mimeType: 'application/json', buffer: Buffer.from(checker) });
  await page.getByLabel('Width', { exact: true }).fill('65');
  await page.getByLabel('Height', { exact: true }).fill('3');
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('WebGPU ready. Render when ready.');
  await page.getByRole('button', { name: 'Render', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Render complete.');
  const canvasPixels = () => page.locator('canvas').evaluate((canvas: HTMLCanvasElement) => Array.from(canvas.getContext('2d')!.getImageData(0, 0, canvas.width, canvas.height).data));
  expect(await canvasPixels()).toEqual(expectedChecker);
  await expect(page.locator('#preview-state')).toHaveText('my-checker.mix');
  await page.getByRole('button', { name: 'Dispose GPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  await expect(page.getByRole('button', { name: 'Render', exact: true })).toBeDisabled();
  expect(await canvasPixels()).toEqual(expectedChecker);
});


test('pagehide releases the old GPU and allows a new explicit initialization', async ({ page }) => {
  await page.addInitScript(() => {
    const lifecycle = { destroyCalls: 0 };
    Object.defineProperty(window, 'pageLifecycle', { value: lifecycle });
    const devicePrototype = (globalThis as unknown as { GPUDevice: { prototype: { destroy(): void } } }).GPUDevice.prototype;
    const originalDestroy = devicePrototype.destroy;
    devicePrototype.destroy = function () {
      lifecycle.destroyCalls += 1;
      return originalDestroy.call(this);
    };
  });
  const destroyCalls = () => page.evaluate(() => (window as unknown as { pageLifecycle: { destroyCalls: number } }).pageLifecycle.destroyCalls);
  await page.goto('./');
  await expect(page.getByRole('status')).toHaveText('Checker loaded. Initialize WebGPU to render.');
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('WebGPU ready. Render when ready.');
  // Deliver the same page lifecycle event used for a persisted history navigation.
  // The GPU and device.destroy are real; this does not claim browser bfcache admission.
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide', { persisted: true })));
  await expect(page.getByRole('button', { name: 'Initialize WebGPU', exact: true })).toBeEnabled();
  await expect(page.getByRole('button', { name: 'Render', exact: true })).toBeDisabled();
  await expect(page.getByRole('button', { name: 'Dispose GPU', exact: true })).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. Initialize WebGPU to render again.');
  await expect.poll(destroyCalls).toBe(1);
  await page.getByRole('button', { name: 'Initialize WebGPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('WebGPU ready. Render when ready.');
  await page.getByRole('button', { name: 'Render', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('Render complete.');
  await page.getByRole('button', { name: 'Dispose GPU', exact: true }).click();
  await expect(page.getByRole('status')).toHaveText('GPU disposed. The rendered preview remains available.');
  await expect.poll(destroyCalls).toBe(2);
});
