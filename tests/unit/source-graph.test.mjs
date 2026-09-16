import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readSourceGraph, defaultLayout, parseLayout } from '../../src/source-graph.ts';
const bytes = text => new TextEncoder().encode(text);
const catalog = [{ typeId: 'example', version: 1, inputs: [], outputs: [], parameters: [{ id: 'number', default: 3 }] }];
// These tests cover transport/layout, not engine semantics. Browser tests use real Rust validation.
test('Rust rejection happens before projection and receives original bytes', () => {
  const input = bytes('{"version":1,"version":2}');
  const diagnostics = [{ code: 'rejected-original' }];
  const runtime = { validate(value) { assert.equal(value, input); return { ok: false, diagnostics }; }, getNodeCatalog() { throw Error('must not query'); } };
  assert.throws(() => readSourceGraph(runtime, input), error => error.diagnostics === diagnostics);
});
test('source projection keeps numeric lexemes, defaults and disconnected nodes without source mutation', () => {
  const input = bytes('{"nodes":[{"id":"__proto__","type":"example","version":1,"parameters":{"number":9007199254740993}},{"id":"other","type":"example","version":1}]}');
  const before = input.slice();
  const graph = readSourceGraph({ validate() { return { ok: true }; }, getNodeCatalog() { return catalog; } }, input);
  assert.deepEqual(graph.nodes.map(n => n.parameters[0]), [{ id: 'number', value: '9007199254740993', origin: 'source' }, { id: 'number', value: '3', origin: 'default' }]);
  assert.deepEqual(input, before);
  const layout = defaultLayout(graph, 'abc');
  assert.ok(Object.hasOwn(layout.positions, '__proto__'));
  assert.deepEqual(parseLayout(JSON.stringify(layout), graph, 'abc'), layout);
  assert.throws(() => parseLayout(JSON.stringify(layout), graph, 'different'));
  delete layout.positions.other;
  assert.throws(() => parseLayout(JSON.stringify(layout), graph, 'abc'));
});
test('layout rejects malformed coordinates, wrong identities and viewport ranges', () => {
  const graph = { nodes: [{ id: 'node', contract: { inputs: [], outputs: [] } }], edges: [] };
  for (const mutate of [l => l.viewport.zoom = 0, l => l.positions.node.x = Infinity, l => l.version = 2, l => l.positions.extra = { x: 0, y: 0 }]) {
    const layout = defaultLayout(graph, 'digest'); mutate(layout);
    assert.throws(() => parseLayout(JSON.stringify(layout), graph, 'digest'));
  }
});
