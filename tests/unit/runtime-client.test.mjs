import { test } from 'node:test';
import assert from 'node:assert/strict';
import { captureJob } from '../../src/runtime-client.ts';

test('queued jobs capture source bytes, dimensions, channels and nested parameter values', () => {
  const source = new Uint8Array([1, 2, 3]);
  const request = { size: [65, 3], channels: ['baseColor'], overrides: { tint: [0.2, 0.3, 0.4, 1] } };
  const job = captureJob(source, 'original.mix', request);
  source.fill(0); request.size[0] = 2048; request.channels[0] = 'height'; request.overrides.tint[0] = 1;
  assert.deepEqual(Array.from(job.source), [1, 2, 3]);
  assert.deepEqual(job.request, { size: [65, 3], channels: ['baseColor'], overrides: { tint: [0.2, 0.3, 0.4, 1] } });
  assert.equal(job.name, 'original.mix');
});
