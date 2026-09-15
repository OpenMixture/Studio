import type { ChannelId, GpuRuntime, ParameterValue, RenderedChannel, RenderResult, RuntimeModule } from '@openmixture/runtime';
import { LatestRenderer } from './latest';
import { captureJob, runtimeClient, type RenderJob } from './runtime-client';
import { parameterControls } from './controls';
import { drawPreview } from './preview';
import { fileBytes, sampleBytes } from './files';
import { encodePng, pngFilename } from './png';
import './style.css';

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}
const sample = element<HTMLButtonElement>('sample');
const samples = element<HTMLSelectElement>('samples');
const file = element<HTMLInputElement>('file');
const initialize = element<HTMLButtonElement>('initialize');
const validate = element<HTMLButtonElement>('validate');
const render = element<HTMLButtonElement>('render');
const dispose = element<HTMLButtonElement>('dispose');
const download = element<HTMLButtonElement>('download');
const exportStatus = element('export-status');
const downloadUrls = new Set<string>();
let exportable: { channel: RenderedChannel; name: string } | undefined;
let exporting = false;
const reset = element<HTMLButtonElement>('reset');
const width = element<HTMLInputElement>('width');
const height = element<HTMLInputElement>('height');
const channels = element<HTMLSelectElement>('channels');
const status = element('status');
const error = element('error');
const details = element('details');
const preview = element<HTMLCanvasElement>('preview');
const previewState = element('preview-state');
const ensureRuntime = runtimeClient();
let runtime: RuntimeModule | undefined;
let gpu: GpuRuntime | undefined;
let scheduler: LatestRenderer<RenderJob, RenderResult> | undefined;
let source: Uint8Array | undefined;
let sourceName = 'checker.mix';
let overrides: Record<string, ParameterValue> = Object.create(null);
let sourceGeneration = 0;
let gpuGeneration = 0;
let loading = false;
let initializing = false;
let acquisition: Promise<void> | undefined;
let closing = false;
let metadataReady = false;
let validRequest = false;
let hasPreview = false;

const controls = parameterControls(element('parameters'), (id, value) => {
  overrides[id] = value;
  edited();
});

function describe(value: unknown): string {
  return JSON.stringify(value, (_key, entry: unknown) => typeof entry === 'bigint' ? entry.toString() : entry, 2);
}

function updateControls(): void {
  download.disabled = !exportable || exporting;
  initialize.disabled = initializing || closing || Boolean(gpu);
  validate.disabled = loading || !source;
  render.disabled = !gpu || !validRequest || loading;
  dispose.disabled = closing || (!gpu && !initializing);
  reset.disabled = !metadataReady;
  channels.disabled = !metadataReady;
  if (scheduler?.busy && validRequest && !loading) {
    status.textContent = scheduler.queued ? 'Rendering… Latest changes queued.' : 'Rendering…';
  }
}

function markStale(reason = 'settings changed'): void {
  exportable = undefined;
  download.disabled = true;
  exportStatus.textContent = 'Render current settings to download a PNG.';
  if (hasPreview) {
    previewState.textContent = `Previous render · ${reason}`;
    previewState.dataset.stale = 'true';
  }
}

function showError(failure: unknown, message = 'Operation failed.'): void {
  const value = failure as { message?: string; code?: string; diagnostics?: Array<{ code: string; message: string; suggestion?: string }> } | null;
  error.hidden = false;
  error.textContent = value?.diagnostics?.length
    ? value.diagnostics.map(item => `${item.code}: ${item.message}${item.suggestion ? `\n${item.suggestion}` : ''}`).join('\n')
    : value?.message ?? 'The operation failed. See diagnostics below.';
  details.textContent = describe({ failure, code: value?.code, message: value?.message });
  status.textContent = message;
  markStale('latest operation failed');
}

function request() {
  return { size: [width.valueAsNumber, height.valueAsNumber] as [number, number],
    channels: [channels.value as ChannelId || 'baseColor'], overrides };
}

function validateCurrent(autoRender: boolean): boolean {
  if (!runtime || !source || loading) return false;
  validRequest = false;
  controls.validity();
  try {
    const result = runtime.validate(source, request());
    if (!result.ok) {
      showError(result, 'Source is invalid.');
      return false;
    }
    if (!metadataReady) {
      controls.build(result.exposedParameters);
      const selected = channels.value;
      channels.replaceChildren();
      for (const channel of result.materialChannels) {
        channels.add(new Option(`${channel.id}${channel.input.source === 'default' ? ' · default' : ''}`, channel.id));
      }
      channels.value = result.materialChannels.some(item => item.id === selected) ? selected : 'baseColor';
      metadataReady = true;
    }
    controls.validity(result);
    validRequest = true;
    error.hidden = true;
    details.textContent = describe({ build: runtime.getBuildInfo(), validation: result });
    status.textContent = 'Source is valid. Validation does not acquire a GPU.';
    if (autoRender && scheduler) scheduler.submit(captureJob(source, sourceName, request()));
    return true;
  } catch (failure) {
    showError(failure);
    return false;
  } finally { updateControls(); }
}

function edited(): void {
  scheduler?.invalidate();
  markStale();
  validateCurrent(true);
}

async function loadSource(read: () => Promise<Uint8Array>, name: string, initial = false): Promise<void> {
  const generation = ++sourceGeneration;
  scheduler?.invalidate();
  loading = true; source = undefined; metadataReady = false; validRequest = false;
  overrides = Object.create(null);
  controls.clear('Load a valid material to see its exposed parameters.');
  channels.replaceChildren(new Option('baseColor', 'baseColor'));
  sourceName = name;
  element('source-name').textContent = `Loading ${name}…`;
  element('source-text').textContent = '';
  error.hidden = true; status.textContent = 'Reading source…'; markStale('source changed'); updateControls();
  try {
    const [bytes, module] = await Promise.all([read(), ensureRuntime()]);
    if (generation !== sourceGeneration) return;
    source = bytes; runtime = module; loading = false;
    element('source-name').textContent = `${name} · ${bytes.byteLength.toLocaleString()} bytes`;
    // Display decoding never becomes render input; Rust receives the original bytes.
    element('source-text').textContent = new TextDecoder().decode(bytes);
    if (validateCurrent(true) && initial && !gpu) status.textContent = 'Checker loaded. Initialize WebGPU to render.';
  } catch (failure) {
    if (generation === sourceGeneration) showError(failure);
  } finally {
    if (generation === sourceGeneration) { loading = false; updateControls(); }
  }
}

function showResult(result: RenderResult, job: RenderJob): void {
  const channel = result.channels.find(item => item.channel === job.request.channels?.[0]);
  if (!channel) throw new Error('The runtime returned no requested output.');
  drawPreview(preview, channel);
  element('placeholder').hidden = true;
  hasPreview = true;
  exportable = { channel, name: job.name };
  exportStatus.textContent = 'Download this channel at its rendered dimensions.';
  previewState.textContent = job.name;
  previewState.dataset.stale = 'false';
  const [w, h] = channel.size;
  element('result-info').textContent = `${w} × ${h} · ${channel.channel} · ${channel.encoding} · ${channel.pixels.byteLength.toLocaleString()} bytes${channel.kind === 'color' ? '' : ' · data preview'}`;
  details.textContent = describe({ build: runtime!.getBuildInfo(), plan: result.plan, report: result.report });
  status.textContent = 'Render complete.';
}

download.addEventListener('click', () => {
  const captured = exportable;
  if (!captured || exporting) return;
  exporting = true; updateControls();
  exportStatus.textContent = 'Encoding PNG…';
  void encodePng(captured.channel).then(blob => {
    if (exportable !== captured) return;
    const url = URL.createObjectURL(blob);
    downloadUrls.add(url);
    const anchor = document.createElement('a');
    anchor.href = url; anchor.download = pngFilename(captured.name, captured.channel);
    document.body.append(anchor); anchor.click(); anchor.remove();
    // Keep the URL alive long enough for the browser to start consuming it.
    window.setTimeout(() => { URL.revokeObjectURL(url); downloadUrls.delete(url); }, 1000);
    exportStatus.textContent = `PNG download started: ${anchor.download}`;
  }).catch(failure => {
    if (exportable === captured) exportStatus.textContent = `PNG export failed: ${failure instanceof Error ? failure.message : String(failure)}`;
  }).finally(() => { exporting = false; updateControls(); });
});

initialize.addEventListener('click', () => {
  if (initializing || closing || gpu) return;
  const generation = ++gpuGeneration;
  initializing = true; error.hidden = true; status.textContent = 'Initializing WebGPU…'; updateControls();
  const pending = (async () => {
    const module = await ensureRuntime();
    if (generation !== gpuGeneration) return;
    const created = await module.createGpu();
    if (generation !== gpuGeneration) { await created.destroy(); return; }
    runtime = module; gpu = created;
    scheduler = new LatestRenderer(job => created.render(job.source, job.request), {
      result: showResult, error: showError, state: updateControls,
    });
    details.textContent = describe({ build: module.getBuildInfo(), context: created.context });
    status.textContent = 'WebGPU ready. Render when ready.';
  })().catch(failure => { if (generation === gpuGeneration) showError(failure); })
    .finally(() => {
      if (acquisition === pending) acquisition = undefined;
      if (generation === gpuGeneration) { initializing = false; updateControls(); }
    });
  acquisition = pending;
});

async function stopGpu(message: string): Promise<void> {
  if (closing) return;
  const generation = ++gpuGeneration;
  const previousScheduler = scheduler, previousGpu = gpu, previousAcquisition = acquisition;
  scheduler = undefined; gpu = undefined; initializing = false; closing = true;
  status.textContent = 'Disposing GPU…'; updateControls();
  try {
    await previousAcquisition;
    await previousScheduler?.close();
    await previousGpu?.destroy();
    if (generation === gpuGeneration) status.textContent = message;
  } catch (failure) { if (generation === gpuGeneration) showError(failure); }
  finally { if (generation === gpuGeneration) { closing = false; updateControls(); } }
}

dispose.addEventListener('click', () => void stopGpu('GPU disposed. The rendered preview remains available.'));
validate.addEventListener('click', () => validateCurrent(false));
render.addEventListener('click', () => { if (validateCurrent(false) && source) scheduler?.submit(captureJob(source, sourceName, request())); });
for (const input of [width, height]) input.addEventListener('input', edited);
channels.addEventListener('change', edited);
reset.addEventListener('click', () => { overrides = Object.create(null); metadataReady = false; edited(); });
sample.addEventListener('click', () => { samples.value = 'checker'; void loadSource(() => sampleBytes(import.meta.env.BASE_URL, 'checker'), 'checker.mix', true); });
samples.addEventListener('change', () => {
  const name = samples.value;
  if (!name) return;
  void loadSource(() => sampleBytes(import.meta.env.BASE_URL, name), `${name}.mix`);
});
file.addEventListener('change', () => {
  const selected = file.files?.[0];
  if (selected) { samples.value = ''; void loadSource(() => fileBytes(selected), selected.name); }
  file.value = '';
});
// Invalidate display ownership immediately; browser termination cannot await cleanup.
window.addEventListener('pagehide', () => {
  sourceGeneration++; loading = false;
  markStale('page closed');
  for (const url of downloadUrls) URL.revokeObjectURL(url);
  downloadUrls.clear();
  void stopGpu('GPU disposed. Initialize WebGPU to render again.');
});
void loadSource(() => sampleBytes(import.meta.env.BASE_URL, 'checker'), 'checker.mix', true);
