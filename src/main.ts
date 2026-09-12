import { loadRuntime } from '@openmixture/runtime';
import './style.css';

type Runtime = Awaited<ReturnType<typeof loadRuntime>>;
type Gpu = Awaited<ReturnType<Runtime['createGpu']>>;

function element<T extends HTMLElement>(id: string): T {
  const result = document.getElementById(id);
  if (!result) throw new Error(`Missing element: ${id}`);
  return result as T;
}

const sample = element<HTMLButtonElement>('sample');
const file = element<HTMLInputElement>('file');
const initialize = element<HTMLButtonElement>('initialize');
const validate = element<HTMLButtonElement>('validate');
const render = element<HTMLButtonElement>('render');
const dispose = element<HTMLButtonElement>('dispose');
const width = element<HTMLInputElement>('width');
const height = element<HTMLInputElement>('height');
const status = element('status');
const error = element('error');
const details = element('details');
const preview = element<HTMLCanvasElement>('preview');
const previewState = element('preview-state');

let runtime: Runtime | undefined;
let gpu: Gpu | undefined;
let source: Uint8Array | undefined;
let sourceName = 'checker.mix';
let busy = false;
let hasPreview = false;

function describe(value: unknown): string {
  // SDK reports contain exact u64 bigint values; stringify them without rounding.
  return JSON.stringify(value, (_key, entry: unknown) =>
    typeof entry === 'bigint' ? entry.toString() : entry, 2);
}

function updateControls(): void {
  for (const control of [sample, file, width, height]) control.disabled = busy;
  initialize.disabled = busy || Boolean(gpu);
  validate.disabled = busy || !source;
  render.disabled = busy || !source || !gpu;
  dispose.disabled = busy || !gpu;
}

function markStale(): void {
  if (hasPreview) previewState.textContent = 'Previous render · source or size changed';
}

function showError(failure: unknown): void {
  error.hidden = false;
  if (failure instanceof Error) {
    error.textContent = failure.message;
    details.textContent = describe({ ...failure, name: failure.name, message: failure.message });
  } else {
    error.textContent = 'The operation failed. See diagnostics below.';
    details.textContent = describe(failure);
  }
  status.textContent = 'Operation failed.';
  if (hasPreview) previewState.textContent = 'Previous render · latest operation failed';
}

async function operation(message: string, action: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  error.hidden = true;
  status.textContent = message;
  updateControls();
  try {
    await action();
  } catch (failure) {
    showError(failure);
  } finally {
    busy = false;
    updateControls();
  }
}

async function ensureRuntime(): Promise<Runtime> {
  runtime ??= await loadRuntime();
  return runtime;
}

function replaceSource(bytes: Uint8Array, name: string): void {
  // Keep the original UTF-8 bytes for Rust. Display decoding is never render input.
  source = bytes;
  sourceName = name;
  element('source-name').textContent = `${name} · ${bytes.byteLength.toLocaleString()} bytes`;
  element('source-text').textContent = new TextDecoder().decode(bytes);
  markStale();
}

async function loadSample(): Promise<void> {
  const response = await fetch(`${import.meta.env.BASE_URL}samples/checker.mix`);
  if (!response.ok) throw new Error(`Could not load checker.mix (HTTP ${response.status}).`);
  replaceSource(new Uint8Array(await response.arrayBuffer()), 'checker.mix');
  status.textContent = gpu ? 'Checker loaded. Ready to render.' : 'Checker loaded. Initialize WebGPU to render.';
}

sample.addEventListener('click', () => void operation('Loading sample…', loadSample));
file.addEventListener('change', () => {
  const selected = file.files?.[0];
  if (!selected) return;
  void operation('Reading source…', async () => {
    replaceSource(new Uint8Array(await selected.arrayBuffer()), selected.name);
    status.textContent = 'Source loaded. Validate or render to check it.';
    file.value = '';
  });
});
for (const input of [width, height]) input.addEventListener('input', markStale);

validate.addEventListener('click', () => void operation('Loading runtime and validating source…', async () => {
  const module = await ensureRuntime();
  const result = module.validate(source!, { size: [width.valueAsNumber, height.valueAsNumber], channels: ['baseColor'] });
  details.textContent = describe({ build: module.getBuildInfo(), validation: result });
  if (result.ok) {
    status.textContent = 'Source is valid. Validation does not acquire a GPU.';
  } else {
    status.textContent = 'Source is invalid.';
    error.hidden = false;
    error.textContent = result.diagnostics.map((item) => `${item.code}: ${item.message}`).join('\n');
  }
}));

initialize.addEventListener('click', () => void operation('Initializing WebGPU…', async () => {
  const module = await ensureRuntime();
  gpu = await module.createGpu();
  details.textContent = describe({ build: module.getBuildInfo(), context: gpu.context });
  status.textContent = 'WebGPU ready. Render when ready.';
}));

render.addEventListener('click', () => void operation('Rendering…', async () => {
  const result = await gpu!.render(source!, { size: [width.valueAsNumber, height.valueAsNumber], channels: ['baseColor'] });
  const channel = result.channels.find((item) => item.channel === 'baseColor');
  if (!channel) throw new Error('The runtime returned no requested baseColor output.');
  const [renderWidth, renderHeight] = channel.size;
  if (channel.pixels.byteLength !== renderWidth * renderHeight * 4) {
    throw new Error('The runtime returned an unexpected RGBA8 output length.');
  }
  const context = preview.getContext('2d');
  if (!context) throw new Error('This browser could not create the preview canvas.');
  preview.width = renderWidth;
  preview.height = renderHeight;
  // Canvas receives a display copy of the returned JS-owned bytes, with no color transform.
  const displayPixels = new Uint8ClampedArray(channel.pixels);
  context.putImageData(new ImageData(displayPixels, renderWidth, renderHeight), 0, 0);
  preview.hidden = false;
  element('placeholder').hidden = true;
  hasPreview = true;
  previewState.textContent = sourceName;
  element('result-info').textContent = `${renderWidth} × ${renderHeight} · ${channel.channel} · ${channel.encoding} · ${channel.pixels.byteLength.toLocaleString()} bytes`;
  details.textContent = describe({ build: runtime!.getBuildInfo(), plan: result.plan, report: result.report });
  status.textContent = 'Render complete.';
}));

dispose.addEventListener('click', () => void operation('Disposing GPU…', async () => {
  await gpu!.destroy();
  gpu = undefined;
  status.textContent = 'GPU disposed. The rendered preview remains available.';
}));

// Browser termination cannot await asynchronous cleanup; explicit Dispose is the tested path.
window.addEventListener('pagehide', () => {
  const hiddenGpu = gpu;
  gpu = undefined;
  updateControls();
  if (hiddenGpu) {
    status.textContent = 'GPU disposed. Initialize WebGPU to render again.';
    void hiddenGpu.destroy().catch(showError);
  }
});
void operation('Loading checker.mix…', loadSample);
