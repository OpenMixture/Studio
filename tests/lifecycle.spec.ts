import { test, expect, type Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import type {} from './harness';

const checker = await readFile(new URL('../public/samples/checker.mix', import.meta.url), 'utf8');

// Test-only platform observation. All original device, map, scope and destroy
// operations still execute in Chromium; no replacement pixels or SDK hooks.
interface Device {
  lost: Promise<{ reason: string; message: string }>;
  destroy(): void;
  pushErrorScope(filter: string): void;
  popErrorScope(): Promise<unknown>;
}
interface Probe {
  device?: Device;
  pushes: number;
  pops: number;
  maps: number;
  unmaps: number;
  readbackUnmaps: number;
  destroys: number;
  failMap: boolean;
  loseAtMap: boolean;
  losses: Array<{ reason: string; message: string }>;
  uncaptured: string[];
  unhandled: string[];
}
declare global { interface Window { gpuProbe: Probe; } }

async function observe(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: Probe = window.gpuProbe = {
      pushes: 0, pops: 0, maps: 0, unmaps: 0, readbackUnmaps: 0, destroys: 0,
      failMap: false, loseAtMap: false, losses: [], uncaptured: [], unhandled: [],
    };
    window.addEventListener('unhandledrejection', (event) => probe.unhandled.push(String(event.reason)));
    window.addEventListener('error', (event) => probe.unhandled.push(event.message));
    const platform = globalThis as unknown as {
      GPUAdapter: { prototype: { requestDevice(...args: unknown[]): Promise<Device & EventTarget> } };
      GPUDevice: { prototype: Device };
      GPUBuffer: { prototype: { mapAsync(mode: number, offset?: number, size?: number): Promise<void>; unmap(): void } };
    };
    const adapter = platform.GPUAdapter.prototype;
    const request = adapter.requestDevice;
    adapter.requestDevice = async function (...args) {
      const device = await request.apply(this, args);
      probe.device = device;
      void device.lost.then(({ reason, message }) => { probe.losses.push({ reason, message }); });
      device.addEventListener('uncapturederror', (event) => {
        probe.uncaptured.push(String((event as unknown as { error: unknown }).error));
      });
      return device;
    };
    const device = platform.GPUDevice.prototype;
    const push = device.pushErrorScope;
    const pop = device.popErrorScope;
    const destroy = device.destroy;
    device.pushErrorScope = function (filter) { probe.pushes++; return push.call(this, filter); };
    device.popErrorScope = function () { probe.pops++; return pop.call(this); };
    device.destroy = function () { probe.destroys++; return destroy.call(this); };
    const buffer = platform.GPUBuffer.prototype;
    const mappedBuffers = new WeakSet<object>();
    const map = buffer.mapAsync;
    const unmap = buffer.unmap;
    buffer.mapAsync = function (mode, offset, size) {
      probe.maps++;
      mappedBuffers.add(this);
      if (probe.loseAtMap) {
        probe.loseAtMap = false;
        probe.device!.destroy();
      }
      if (probe.failMap) {
        probe.failMap = false;
        // Real WebGPU validation: mapping offsets must be aligned to 8 bytes.
        return map.call(this, mode, 1, size);
      }
      return map.call(this, mode, offset, size);
    };
    buffer.unmap = function () {
      probe.unmaps++;
      if (mappedBuffers.delete(this)) probe.readbackUnmaps++;
      return unmap.call(this);
    };
  });
  await page.goto('tests/contract.html');
  await page.waitForFunction(() => Boolean(window.mixtureContract));
}

for (const duringMap of [false, true]) {
  test(`real device destruction ${duringMap ? 'during readback' : 'between renders'} settles with loss evidence`, async ({ page }, testInfo) => {
    await observe(page);
    const result = await page.evaluate(async ({ source, duringMap }) => {
      const runtime = await window.mixtureContract.loadRuntime();
      const gpu = await runtime.createGpu();
      const first = await gpu.render(source, { size: [65, 3] });
      const snapshot = Array.from(first.channels[0].pixels);
      const failure = async (action: () => Promise<unknown>) => {
        try { await action(); return null; }
        catch (error) {
          const value = error as { code: string; diagnostics: unknown[] };
          return { code: value.code, diagnostics: value.diagnostics };
        }
      };
      if (duringMap) window.gpuProbe.loseAtMap = true;
      else {
        window.gpuProbe.device!.destroy();
        await window.gpuProbe.device!.lost;
        // Let the independently registered wgpu loss callback run as well.
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
      const failed = await failure(() => gpu.render(source, { size: [65, 3] }));
      await window.gpuProbe.device!.lost;
      await new Promise((resolve) => setTimeout(resolve, 0));
      const afterLoss = await failure(() => gpu.render(source));
      await Promise.all([gpu.destroy(), gpu.destroy()]);
      const disposed = await failure(() => gpu.render(source));
      const retained = Array.from(first.channels[0].pixels);
      const recovered = await runtime.createGpu(); // Explicit new device, never automatic fallback.
      const fresh = await recovered.render(source, { size: [65, 3] });
      await recovered.destroy();
      const { device: _device, ...probe } = window.gpuProbe;
      const plain = JSON.parse(JSON.stringify({ failed, afterLoss, disposed, probe, context: gpu.context },
        (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value));
      return { ...plain, owned: retained.every((byte, i) => byte === snapshot[i]),
        recovered: Array.from(fresh.channels[0].pixels).every((byte, i) => byte === snapshot[i]) };
    }, { source: checker, duringMap });
    await testInfo.attach('device-loss.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
    expect(result.failed.code).toBe(duringMap ? 'MIX_READBACK_FAILED' : 'MIX_GPU_DEVICE_LOST');
    expect(result.afterLoss.code).toBe('MIX_GPU_DEVICE_LOST');
    expect(result.afterLoss.diagnostics[0].evidence.deviceLostReason).toBe('destroyed');
    expect(result.failed.diagnostics[0].evidence.allocationLiveBytes).toBe('0');
    expect(result.disposed.code).toBe('MIX_BROWSER_RUNTIME_DESTROYED');
    expect(result.probe.pushes).toBe(result.probe.pops);
    expect(result.probe.maps).toBe(result.probe.readbackUnmaps);
    expect(result.probe.uncaptured).toEqual([]);
    expect(result.probe.unhandled).toEqual([]);
    expect(result.owned).toBe(true);
    expect(result.recovered).toBe(true);
  });
}

test('real mapping validation failure cleans up scopes and permits a later render', async ({ page }, testInfo) => {
  await observe(page);
  const result = await page.evaluate(async (source) => {
    const runtime = await window.mixtureContract.loadRuntime();
    const gpu = await runtime.createGpu();
    window.gpuProbe.failMap = true;
    let failed: unknown = null;
    try { await gpu.render(source, { size: [65, 3] }); }
    catch (error) {
      const value = error as { code: string; diagnostics: unknown[] };
      failed = { code: value.code, diagnostics: value.diagnostics };
    }
    const good = await gpu.render(source, { size: [65, 3] });
    window.gpuProbe.failMap = true;
    const pending = gpu.render(source, { size: [65, 3] }).then(
      () => null, (error: { code: string }) => error.code);
    const closing = gpu.destroy();
    const pendingFailure = await pending;
    await Promise.all([closing, gpu.destroy()]);
    const { device: _device, ...probe } = window.gpuProbe;
    return JSON.parse(JSON.stringify({ failed, pendingFailure, probe, allocations: good.report.allocations, pixels: Array.from(good.channels[0].pixels) },
      (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value));
  }, checker);
  await testInfo.attach('map-failure.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.failed.code).toBe('MIX_READBACK_FAILED');
  expect(result.failed.diagnostics[0].stage).toBe('readback');
  expect(result.failed.diagnostics[0].evidence.allocationLiveBytes).toBe('0');
  expect(result.pendingFailure).toBe('MIX_READBACK_FAILED');
  expect(result.probe.maps).toBe(3);
  expect(result.probe.readbackUnmaps).toBe(3);
  expect(result.probe.pushes).toBe(result.probe.pops);
  expect(result.probe.uncaptured).toEqual([]);
    expect(result.probe.unhandled).toEqual([]);
  expect(result.pixels).toHaveLength(780);
  expect(result.pixels.slice(0, 4)).toEqual([0, 0, 0, 255]);
});

test('repeated independent modules and devices retain owned outputs with no live per-call allocations', async ({ page }, testInfo) => {
  await observe(page);
  const result = await page.evaluate(async (source) => {
    const reports: unknown[] = [];
    let retained: Uint8Array | undefined;
    let snapshot: number[] = [];
    for (let iteration = 0; iteration < 8; iteration++) {
      const runtime = await window.mixtureContract.loadRuntime();
      const gpu = await runtime.createGpu();
      for (let render = 0; render < 4; render++) {
        const result = await gpu.render(source, { size: [65, 3] });
        if (!retained) { retained = result.channels[0].pixels; snapshot = Array.from(retained); }
        reports.push({ iteration, render, allocations: result.report.allocations, cache: result.report.pipelineCache });
      }
      await Promise.all([gpu.destroy(), gpu.destroy()]);
    }
    const { device: _device, ...probe } = window.gpuProbe;
    return JSON.parse(JSON.stringify({ reports, probe, retained: Array.from(retained!), snapshot },
      (_key, value: unknown) => typeof value === 'bigint' ? value.toString() : value));
  }, checker);
  await testInfo.attach('repeated-lifecycle.json', { body: JSON.stringify(result, null, 2), contentType: 'application/json' });
  expect(result.reports).toHaveLength(32);
  for (const report of result.reports) {
    expect(report.allocations.liveBytes).toBe('0');
    expect(report.allocations.releasedBytes).toBe(report.allocations.cumulativeBytes);
    expect(report.cache.entries).toBe('1');
    expect(report.cache.misses).toBe(report.render === 0 ? 1 : 0);
  }
  expect(result.retained).toEqual(result.snapshot);
  expect(result.probe.destroys).toBe(8);
  expect(result.probe.maps).toBe(32);
  expect(result.probe.readbackUnmaps).toBe(32);
  expect(result.probe.pushes).toBe(result.probe.pops);
  expect(result.probe.uncaptured).toEqual([]);
    expect(result.probe.unhandled).toEqual([]);
});

test('unavailable WebGPU remains a structured failure while CPU validation works', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'gpu', { value: undefined }));
  await page.goto('tests/contract.html');
  const result = await page.evaluate(async (source) => {
    const runtime = await window.mixtureContract.loadRuntime();
    let code: unknown;
    try { await runtime.createGpu(); } catch (error) { code = (error as { code: string }).code; }
    return { code, valid: runtime.validate(source).ok };
  }, checker);
  expect(result).toEqual({ code: 'MIX_BROWSER_WEBGPU_UNAVAILABLE', valid: true });
});

for (const stage of ['adapter', 'device'] as const) {
  test(`injected ${stage} acquisition rejection preserves its structured stage`, async ({ page }) => {
    // Classification-only injection; real acquisition and execution are tested above.
    await page.addInitScript((stage) => {
      const platform = globalThis as unknown as {
        GPU: { prototype: { requestAdapter(): Promise<unknown> } };
        GPUAdapter: { prototype: { requestDevice(): Promise<unknown> } };
      };
      if (stage === 'adapter') platform.GPU.prototype.requestAdapter = async () => null;
      else platform.GPUAdapter.prototype.requestDevice = async () => { throw new Error('test device acquisition rejection'); };
    }, stage);
    await page.goto('tests/contract.html');
    const result = await page.evaluate(async () => {
      const runtime = await window.mixtureContract.loadRuntime();
      try { await runtime.createGpu(); return null; }
      catch (error) {
        const value = error as { code: string; diagnostics: Array<{ stage: string }> };
        return { code: value.code, stage: value.diagnostics[0].stage };
      }
    });
    expect(result).toEqual(stage === 'adapter'
      ? { code: 'MIX_GPU_ADAPTER_UNAVAILABLE', stage: 'gpuAdapter' }
      : { code: 'MIX_GPU_DEVICE_REQUEST_FAILED', stage: 'gpuDevice' });
  });
}
