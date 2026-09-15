import assert from 'node:assert/strict';
import { inflateSync, crc32 } from 'node:zlib';

// Independent test decoder: Node's zlib verifies compression; inspect raw samples
// without a browser's color management, canvas alpha conversion or product helpers.
export function decodePng(bytes: Buffer) {
  assert.deepEqual(bytes.subarray(0, 8), Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  const chunks: Array<{ type: string; data: Buffer }> = [];
  let offset = 8;
  while (offset < bytes.length) {
    const length = bytes.readUInt32BE(offset);
    const type = bytes.toString('ascii', offset + 4, offset + 8);
    assert.ok(offset + length + 12 <= bytes.length);
    const data = bytes.subarray(offset + 8, offset + 8 + length);
    assert.equal(bytes.readUInt32BE(offset + 8 + length), crc32(bytes.subarray(offset + 4, offset + 8 + length)));
    chunks.push({ type, data });
    offset += length + 12;
  }
  assert.equal(chunks[0].type, 'IHDR');
  assert.equal(chunks.at(-1)?.type, 'IEND');
  const header = chunks[0].data;
  assert.equal(header.length, 13);
  assert.deepEqual([...header.subarray(8)], [8, 6, 0, 0, 0]);
  const width = header.readUInt32BE(0), height = header.readUInt32BE(4);
  const raw = inflateSync(Buffer.concat(chunks.filter(chunk => chunk.type === 'IDAT').map(chunk => chunk.data)));
  const stride = width * 4;
  assert.equal(raw.length, (stride + 1) * height);
  const pixels = Buffer.alloc(stride * height);
  for (let y = 0; y < height; y++) {
    assert.equal(raw[y * (stride + 1)], 0, 'Expected unfiltered export rows');
    raw.copy(pixels, y * stride, y * (stride + 1) + 1, (y + 1) * (stride + 1));
  }
  const gamma = chunks.find(chunk => chunk.type === 'gAMA')?.data.readUInt32BE(0);
  const srgb = chunks.find(chunk => chunk.type === 'sRGB')?.data[0];
  return { width, height, pixels, gamma, srgb, chunks: chunks.map(chunk => chunk.type) };
}
