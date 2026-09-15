import { test } from 'node:test';
import assert from 'node:assert/strict';
import { encodePng, pngFilename } from '../../src/png.ts';
import { decodePng } from '../helpers/png.ts';

for (const encoding of ['rgba8-srgb', 'rgba8-linear']) {
  test(`PNG preserves every byte and alpha with ${encoding} metadata`, async () => {
    const pixels = Uint8Array.from({ length: 65 * 3 * 4 }, (_, i) => i % 256);
    const expected = Buffer.from(pixels);
    const channel = { size: [65, 3], pixels, encoding, channel: 'baseColor' };
    const pending = encodePng(channel);
    pixels.fill(255);
    channel.encoding = 'changed'; // Encoding must own its accepted samples before yielding.
    const blob = await pending;
    assert.equal(blob.type, 'image/png');
    const decoded = decodePng(Buffer.from(await blob.arrayBuffer()));
    assert.deepEqual([decoded.width, decoded.height], [65, 3]);
    assert.deepEqual(decoded.pixels, expected);
    assert.equal(decoded.gamma, encoding === 'rgba8-srgb' ? 45455 : 100000);
    assert.equal(decoded.srgb, encoding === 'rgba8-srgb' ? 0 : undefined);
    assert.deepEqual(decoded.chunks, encoding === 'rgba8-srgb'
      ? ['IHDR', 'gAMA', 'sRGB', 'IDAT', 'IEND'] : ['IHDR', 'gAMA', 'IDAT', 'IEND']);
  });
}
test('PNG rejects malformed output and creates a bounded portable basename', async () => {
  for (const size of [[0, 1], [1.5, 1], [Infinity, 1], [2, 1]]) {
    await assert.rejects(encodePng({ size, pixels: new Uint8Array(4), encoding: 'rgba8-linear' }));
  }
  await assert.rejects(encodePng({ size: [1, 1], pixels: new Uint8Array(4), encoding: 'unknown' }));
  assert.equal(pngFilename('../../bad:name.mix', { channel: 'normal', size: [65, 3] }), 'bad-name-normal-65x3.png');
});
