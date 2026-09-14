import type { RenderedChannel } from '@openmixture/runtime';

export function drawPreview(canvas: HTMLCanvasElement, channel: RenderedChannel): void {
  const [width, height] = channel.size;
  if (channel.pixels.byteLength !== width * height * 4) throw new Error('The runtime returned an unexpected RGBA8 output length.');
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser could not create the preview canvas.');
  canvas.width = width; canvas.height = height;
  // Display-only byte visualization. Color is already sRGB; scalar/normal data
  // is shown directly, without a second transfer, normalization or pixel mutation.
  context.putImageData(new ImageData(new Uint8ClampedArray(channel.pixels), width, height), 0, 0);
  canvas.setAttribute('aria-label', `Rendered ${channel.channel} channel`);
  canvas.hidden = false;
}
