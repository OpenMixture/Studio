import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LatestRenderer } from '../../src/latest.ts';

const flush = () => new Promise(resolve => setImmediate(resolve));
function fixture() {
  const calls = [], outputs = [], errors = [];
  const queue = new LatestRenderer(input => new Promise((resolve, reject) => {
    calls.push({ input, resolve, reject });
  }), { result: output => outputs.push(output), error: error => errors.push(error), state() {} });
  return { queue, calls, outputs, errors };
}

test('keeps only the newest pending request and ignores old/duplicate completions', async () => {
  const { queue, calls, outputs } = fixture();
  queue.submit('first'); await flush();
  for (let i = 0; i < 1000; i++) queue.submit(i);
  assert.equal(calls.length, 1); assert.equal(queue.queued, true);
  calls[0].resolve('old'); calls[0].resolve('duplicate'); await flush();
  assert.deepEqual(outputs, []); assert.equal(calls.length, 2); assert.equal(calls[1].input, 999);
  calls[1].resolve('newest'); await flush();
  assert.deepEqual(outputs, ['newest']); assert.equal(queue.busy, false); assert.equal(queue.queued, false);
});

test('invalid drafts discard pending work and suppress both old errors and pixels', async () => {
  for (const fails of [false, true]) {
    const { queue, calls, outputs, errors } = fixture();
    queue.submit('active'); await flush(); queue.submit('pending'); queue.invalidate();
    if (fails) calls[0].reject(new Error('old failure')); else calls[0].resolve('old pixels');
    await flush(); assert.equal(calls.length, 1); assert.deepEqual(outputs, []); assert.deepEqual(errors, []);
  }
});

test('latest failure is reported once and later valid requests can succeed', async () => {
  const { queue, calls, outputs, errors } = fixture();
  queue.submit('bad'); await flush(); calls[0].reject('latest failure'); await flush();
  assert.deepEqual(errors, ['latest failure']); queue.submit('good'); await flush();
  calls[1].resolve('pixels'); await flush(); assert.deepEqual(outputs, ['pixels']);
});

test('close drops queued work, waits for active failure, and rejects further submissions', async () => {
  const { queue, calls, outputs, errors } = fixture();
  queue.submit('active'); await flush(); queue.submit('pending');
  let settled = false; const closing = queue.close().then(() => { settled = true; });
  queue.submit('after close'); await flush(); assert.equal(settled, false);
  calls[0].reject('shutdown failure'); await closing; await queue.close();
  assert.equal(calls.length, 1); assert.deepEqual(outputs, []); assert.deepEqual(errors, []);
  assert.equal(queue.busy, false); assert.equal(queue.queued, false);
});

test('synchronous failures release active ownership', async () => {
  const errors = [];
  const queue = new LatestRenderer(() => { throw new Error('sync'); },
    { result() {}, error: error => errors.push(error.message), state() {} });
  queue.submit(1); await flush(); queue.submit(2); await flush();
  assert.deepEqual(errors, ['sync', 'sync']); assert.equal(queue.busy, false);
});
