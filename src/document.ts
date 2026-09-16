import type { Diagnostic, NodeContract, RuntimeModule, ValidationResult } from '@openmixture/runtime';

/** JSON transport token, not a material number interpreter. */
export class NumberToken {
  readonly text: string;
  constructor(text: string) {
    if (!/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?$/.test(text)) throw new Error('Enter a complete JSON number.');
    this.text = text;
  }
}
export interface AuthoredNode {
  id: string; type: string; version: NumberToken | number; parameters?: Record<string, unknown>;
  [key: string]: unknown;
}
export interface GraphEdge { from: { nodeId: string; portId: string }; to: { nodeId: string; portId: string }; [key: string]: unknown; }
export interface MaterialDocument {
  nodes: AuthoredNode[]; edges?: GraphEdge[];
  exposedParameters?: Array<{ id: string; nodeId: string; parameterId: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

/** Call only after Rust accepted the original bytes, or for product-authored transport. */
export function parseDocument(bytes: Uint8Array): MaterialDocument {
  return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes), (_key: string, value: unknown, context?: { source?: string }) => {
    if (typeof value !== 'number') return value;
    if (context?.source === undefined) throw new Error('This browser cannot preserve source numeric tokens.');
    return new NumberToken(context.source);
  }) as MaterialDocument;
}
/** Serialize JSON values only, preserving original numeric tokens and all untouched fields. */
export function jsonText(value: unknown): string {
  if (value instanceof NumberToken) return value.text;
  if (Array.isArray(value)) return `[${value.map(jsonText).join(', ')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).map(([key, item]) => `${JSON.stringify(key)}: ${jsonText(item)}`).join(', ')}}`;
  }
  if (value === null || typeof value === 'string' || typeof value === 'boolean' || (typeof value === 'number' && Number.isFinite(value))) return JSON.stringify(value);
  throw new Error('Unsupported JSON transport value.');
}
export function documentBytes(doc: MaterialDocument): Uint8Array { return new TextEncoder().encode(jsonText(doc)); }
export function validateBytes(runtime: RuntimeModule, bytes: Uint8Array): ValidationResult {
  try { return runtime.validate(bytes); }
  catch (error) {
    const value = error as { diagnostics?: Diagnostic[]; message?: string };
    return { ok: false, diagnostics: value.diagnostics?.length ? value.diagnostics : [{ code: 'EDITOR_VALIDATION_FAILED', stage: 'validation', severity: 'error', message: value.message ?? String(error) }] };
  }
}

/** Product commands mutate document structure; all semantic decisions stay in Rust. */
export class EditableDocument {
  readonly original: Uint8Array;
  readonly catalog: NodeContract[];
  readonly runtime: RuntimeModule;
  doc: MaterialDocument;
  dirty = false;
  private saved: Uint8Array;
  constructor(runtime: RuntimeModule, bytes: Uint8Array) {
    const validation = validateBytes(runtime, bytes);
    if (!validation.ok) throw Object.assign(new Error('Source is invalid.'), { diagnostics: validation.diagnostics });
    this.saved = bytes.slice();
    this.runtime = runtime; this.original = bytes.slice(); this.catalog = runtime.getNodeCatalog();
    this.doc = parseDocument(bytes);
    // Check the transport boundary before enabling edits; this does not replace Rust validation.
    const encoded = documentBytes(this.doc);
    if (jsonText(parseDocument(encoded)) !== jsonText(this.doc)) throw new Error('Source cannot round-trip through editor transport.');
  }
  bytes(): Uint8Array {
    const text = jsonText(this.doc);
    if (text === jsonText(parseDocument(this.saved))) return this.saved.slice();
    if (text === jsonText(parseDocument(this.original))) return this.original.slice();
    return documentBytes(this.doc);
  }
  get unsaved(): boolean { return jsonText(this.doc) !== jsonText(parseDocument(this.saved)); }
  checkpoint(bytes: Uint8Array): void { this.saved = bytes.slice(); }
  restoreSaved(): void { this.doc = parseDocument(this.saved); this.dirty = false; }
  bind(id: string, nodeId: string, parameterId: string): void {
    (this.doc.exposedParameters ??= []).push({ id, nodeId, parameterId }); this.dirty = true;
  }
  unbind(index: number): void { this.doc.exposedParameters?.splice(index, 1); this.dirty = true; }
  validate(): ValidationResult { return validateBytes(this.runtime, this.bytes()); }
  reset(): void { this.doc = parseDocument(this.original); this.dirty = false; }
  node(id: string): AuthoredNode {
    const node = this.doc.nodes.find(n => n.id === id);
    if (!node) throw new Error('Select an existing node.');
    return node;
  }
  add(type: string): string {
    const contract = this.catalog.find(node => node.typeId === type);
    if (!contract) throw new Error('Select a node type from the runtime catalog.');
    let suffix = 1;
    while (this.doc.nodes.some(node => node.id === `${type}-${suffix}`)) suffix++;
    const id = `${type}-${suffix}`;
    this.doc.nodes.push({ id, type, version: contract.version }); this.dirty = true; return id;
  }
  remove(id: string): void {
    this.doc.nodes = this.doc.nodes.filter(node => node.id !== id);
    if (this.doc.edges) this.doc.edges = this.doc.edges.filter(edge => edge.from.nodeId !== id && edge.to.nodeId !== id);
    if (this.doc.exposedParameters) this.doc.exposedParameters = this.doc.exposedParameters.filter(binding => binding.nodeId !== id);
    this.dirty = true;
  }
  connect(from: GraphEdge['from'], to: GraphEdge['to']): void {
    this.doc.edges = [...(this.doc.edges ?? []).filter(edge => edge.to.nodeId !== to.nodeId || edge.to.portId !== to.portId), { from: { ...from }, to: { ...to } }];
    this.dirty = true;
  }
  disconnect(to: GraphEdge['to']): void {
    this.doc.edges = (this.doc.edges ?? []).filter(edge => edge.to.nodeId !== to.nodeId || edge.to.portId !== to.portId);
    this.dirty = true;
  }
  parameter(id: string, parameterId: string, value: unknown): void {
    const node = this.node(id);
    node.parameters ??= Object.create(null) as Record<string, unknown>;
    Object.defineProperty(node.parameters, parameterId, { value, enumerable: true, configurable: true, writable: true });
    this.dirty = true;
  }
  resetParameter(id: string, parameterId: string): void {
    const node = this.node(id); if (node.parameters) delete node.parameters[parameterId]; this.dirty = true;
  }
}
