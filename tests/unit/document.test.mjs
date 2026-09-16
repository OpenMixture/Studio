import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { loadRuntime } from '@openmixture/runtime';
import { EditableDocument, NumberToken, parseDocument, jsonText } from '../../src/document.ts';

const runtime = await loadRuntime({ wasm: new Uint8Array(await readFile('node_modules/@openmixture/runtime/wasm/mixture_wasm_bg.wasm')) });
const checker = new Uint8Array(await readFile('public/samples/checker.mix'));
const wood = new Uint8Array(await readFile('public/samples/wood.mix'));

test('editable import uses actual Rust rejection for raw duplicate keys and invalid UTF-8', () => {
  for (const source of [new TextEncoder().encode('{"version":1,"version":1}'), new Uint8Array([255])]) assert.throws(() => new EditableDocument(runtime, source));
});
test('authored transport preserves numeric tokens and unrelated fields; unchanged/reset bytes are exact', () => {
  const input = new TextEncoder().encode(new TextDecoder().decode(wood).replace('0.018', '0.0180000000000000001'));
  const model = new EditableDocument(runtime, input);
  assert.deepEqual(model.bytes(), input);
  const before = parseDocument(input);
  model.parameter('grain', 'seed', new NumberToken('271828'));
  const after = parseDocument(model.bytes());
  before.nodes.find(node => node.id === 'grain').parameters.seed = new NumberToken('271828');
  assert.equal(jsonText(before), jsonText(after));
  assert.ok(new TextDecoder().decode(model.bytes()).includes('0.0180000000000000001'));
  assert.equal(model.validate().ok, true);
  model.reset(); assert.deepEqual(model.bytes(), input); assert.equal(model.dirty, false);
});
test('node removal atomically removes incident edges and public bindings', () => {
  const model = new EditableDocument(runtime, checker);
  model.remove('checker');
  assert.deepEqual(model.doc.edges, []); assert.deepEqual(model.doc.exposedParameters, []);
  assert.deepEqual(model.doc.nodes.map(n => n.id), ['out']); assert.equal(model.validate().ok, false);
  assert.deepEqual(model.original, checker);
});
test('new catalog nodes and connecting/replacing/disconnecting author standard source', () => {
  const model = new EditableDocument(runtime, checker);
  const id = model.add('checker');
  model.connect({ nodeId: id, portId: 'color' }, { nodeId: 'out', portId: 'baseColor' });
  assert.equal(model.doc.edges.length, 1); assert.equal(model.validate().ok, true);
  model.disconnect({ nodeId: 'out', portId: 'baseColor' });
  assert.equal(model.doc.edges.length, 0); assert.equal(model.validate().ok, false);
});
test('Rust diagnoses cycles, incompatible ports, missing endpoints, duplicates and invalid values in authored candidates', () => {
  const cases = [
    model => model.connect({ nodeId: 'height', portId: 'value' }, { nodeId: 'stretch', portId: 'in' }),
    model => model.connect({ nodeId: 'normal', portId: 'normal' }, { nodeId: 'out', portId: 'baseColor' }),
    model => model.connect({ nodeId: 'missing', portId: 'value' }, { nodeId: 'out', portId: 'roughness' }),
    model => { model.doc.nodes.push(model.doc.nodes[0]); model.dirty = true; },
    model => model.parameter('grain', 'octaves', new NumberToken('-1')),
  ];
  for (const edit of cases) {
    const model = new EditableDocument(runtime, wood); edit(model);
    const result = model.validate(); assert.equal(result.ok, false); assert.ok(result.diagnostics.length);
    model.reset(); assert.equal(model.validate().ok, true);
  }
});
test('transport retains extension fields and prototype-shaped JSON keys without prototype pollution', () => {
  // Transport is independently lossless even for fields the installed Rust contract may reject.
  const bytes = new TextEncoder().encode('{"nodes":[],"extra":{"__proto__":{"polluted":true},"value":9007199254740993,"label":"\\u4e2d"}}');
  const doc = parseDocument(bytes);
  assert.equal(Object.hasOwn(doc.extra, '__proto__'), true);
  assert.equal({}.polluted, undefined);
  assert.equal(jsonText(parseDocument(new TextEncoder().encode(jsonText(doc)))), jsonText(doc));
  assert.ok(jsonText(doc).includes('9007199254740993'));
});
test('saved checkpoint and public binding commands preserve authored lexemes and use Rust diagnostics', () => {
  const model = new EditableDocument(runtime, wood);
  model.parameter('grain', 'seed', new NumberToken('271828'));
  const saved = model.bytes(); model.checkpoint(saved); assert.equal(model.unsaved, false);
  model.bind('authoredOctaves', 'grain', 'octaves'); assert.equal(model.validate().ok, true);
  model.bind('authoredOctaves', 'grain', 'octaves'); assert.equal(model.validate().ok, false);
  model.unbind(model.doc.exposedParameters.length - 1); assert.equal(model.validate().ok, true);
  model.restoreSaved(); assert.deepEqual(model.bytes(), saved); assert.equal(model.unsaved, false);
  model.reset(); assert.deepEqual(model.bytes(), wood); assert.equal(model.unsaved, true);
});
