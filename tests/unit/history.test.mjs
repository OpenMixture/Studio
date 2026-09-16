import { test } from 'node:test';
import assert from 'node:assert/strict';
import { History } from '../../src/history.ts';
test('history bounds commands, coalesces gestures, branches and returns saved states', () => {
  const history = new History(0, (a, b) => a === b, 3);
  history.record(1, 'field'); history.record(2, 'field');
  assert.equal(history.undo(), 0); assert.equal(history.redo(), 2);
  history.record(3); history.record(4); history.record(5);
  assert.equal(history.undo(), 4); assert.equal(history.undo(), 3); assert.equal(history.undo(), 2);
  assert.equal(history.undo(), undefined); history.record(6); assert.equal(history.redo(), undefined);
  history.boundary(); history.record(7, 'field'); history.boundary(); history.record(8, 'field');
  assert.equal(history.undo(), 7); assert.equal(history.undo(), 6);
});
