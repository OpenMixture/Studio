import type { RenderedChannel } from '@openmixture/runtime';

function u32(value: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value);
  return bytes;
}

function chunk(type: string, data: Uint8Array<ArrayBuffer>): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(data.length + 12);
  bytes.set(u32(data.length));
  bytes.set(new TextEncoder().encode(type), 4);
  bytes.set(data, 8);
  let crc = 0xffffffff;
  for (const byte of bytes.subarray(4, -4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) crc = (crc >>> 1) ^ ((crc & 1) ? 0xedb88320 : 0);
  }
  bytes.set(u32((crc ^ 0xffffffff) >>> 0), bytes.length - 4);
  return bytes;
}

/** Preserve SDK samples, including unassociated alpha; never round-trip a canvas. */
export async function encodePng(channel: RenderedChannel): Promise<Blob> {
  const [width, height] = channel.size;
  if (![width, height].every(value => Number.isSafeInteger(value) && value > 0 && value <= 0x7fffffff)
      || !Number.isSafeInteger(width * height * 4) || channel.pixels.length !== width * height * 4) {
    throw new Error('Cannot export an invalid RGBA8 output.');
  }
  if (channel.encoding !== 'rgba8-srgb' && channel.encoding !== 'rgba8-linear') {
    throw new Error('Cannot export an unknown channel encoding.');
  }
  const header = new Uint8Array(13);
  header.set(u32(width)); header.set(u32(height), 4);
  header[8] = 8; header[9] = 6; // 8-bit RGBA, no interlace.
  // Copy synchronously before compression yields; caller mutations cannot alter the PNG.
  const rows = new Uint8Array((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    rows.set(channel.pixels.subarray(y * width * 4, (y + 1) * width * 4), y * (width * 4 + 1) + 1);
  }
  const metadata = channel.encoding === 'rgba8-srgb'
    ? [chunk('gAMA', u32(45455)), chunk('sRGB', new Uint8Array([0]))]
    : [chunk('gAMA', u32(100000))];
  const compressed = new Uint8Array(await new Response(
    new Blob([rows]).stream().pipeThrough(new CompressionStream('deflate')),
  ).arrayBuffer());
  return new Blob([new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', header),
    ...metadata, chunk('IDAT', compressed), chunk('IEND', new Uint8Array())], { type: 'image/png' });
}

export function pngFilename(sourceName: string, channel: RenderedChannel): string {
  const stem = sourceName.replace(/\.mix$/i, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'material';
  return `${stem}-${channel.channel}-${channel.size[0]}x${channel.size[1]}.png`;
}
