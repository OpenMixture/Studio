import type { NodeContract, RuntimeModule } from '@openmixture/runtime';

import { parseDocument, jsonText, type MaterialDocument } from './document.ts';
import type { GraphEdge } from './document.ts';
export type { GraphEdge } from './document.ts';

export interface GraphNode {
  id: string; type: string; version: string; contract: NodeContract;
  parameters: Array<{ id: string; value: string; origin: 'source' | 'default' }>;
}
export interface SourceGraph {
  nodes: GraphNode[]; edges: GraphEdge[];
  bindings: Array<{ id: string; nodeId: string; parameterId: string }>;
}

/** Rust must accept the exact bytes before JavaScript can inspect the source. */
export function readSourceGraph(runtime: RuntimeModule, bytes: Uint8Array): SourceGraph {
  const validation = runtime.validate(bytes);
  if (!validation.ok) throw Object.assign(new Error('Source is invalid.'), { diagnostics: validation.diagnostics });
  return projectGraph(parseDocument(bytes), runtime.getNodeCatalog());
}

/** Display authored drafts, including invalid candidates; never certifies their semantics. */
export function projectGraph(doc: MaterialDocument, catalog: NodeContract[]): SourceGraph {
  return {
    nodes: doc.nodes.map(node => {
      const contract = catalog.find(item => item.typeId === node.type && item.version === Number(jsonText(node.version)));
      if (!contract) throw new Error(`No public contract for ${node.type} ${jsonText(node.version)}.`);
      const authored = node.parameters ?? {};
      return { id: node.id, type: node.type, version: jsonText(node.version), contract,
        parameters: contract.parameters.map(parameter => ({ id: parameter.id,
          value: Object.hasOwn(authored, parameter.id) ? jsonText(authored[parameter.id]) : jsonText(parameter.default),
          origin: Object.hasOwn(authored, parameter.id) ? 'source' as const : 'default' as const })) };
    }),
    edges: doc.edges ?? [], bindings: doc.exposedParameters ?? [],
  };
}

export interface Point { x: number; y: number; }
export interface GraphLayout {
  version: 1; sourceSha256: string; positions: Record<string, Point>;
  viewport: { x: number; y: number; zoom: number };
}
export const NODE_WIDTH = 220;
export function nodeHeight(node: GraphNode): number {
  return 70 + Math.max(node.contract.inputs.length, node.contract.outputs.length, 1) * 22;
}
/** A layout algorithm only: Rust has already established material validity. */
export function defaultLayout(graph: SourceGraph, sourceSha256: string): GraphLayout {
  const levels = new Map(graph.nodes.map(node => [node.id, 0]));
  const incoming = new Map(graph.nodes.map(node => [node.id, 0]));
  const outgoing = new Map(graph.nodes.map(node => [node.id, [] as string[]]));
  for (const edge of graph.edges) {
    incoming.set(edge.to.nodeId, (incoming.get(edge.to.nodeId) ?? 0) + 1);
    outgoing.get(edge.from.nodeId)?.push(edge.to.nodeId);
  }
  const queue = graph.nodes.filter(node => incoming.get(node.id) === 0).map(node => node.id);
  for (let cursor = 0; cursor < queue.length; cursor++) {
    const id = queue[cursor];
    for (const target of outgoing.get(id) ?? []) {
      levels.set(target, Math.max(levels.get(target) ?? 0, (levels.get(id) ?? 0) + 1));
      incoming.set(target, (incoming.get(target) ?? 1) - 1);
      if (incoming.get(target) === 0) queue.push(target);
    }
  }
  const rows = new Map<number, number>();
  const positions: Record<string, Point> = Object.create(null);
  for (const node of graph.nodes) {
    const level = levels.get(node.id) ?? 0;
    positions[node.id] = { x: level * 290, y: rows.get(level) ?? 0 };
    rows.set(level, positions[node.id].y + nodeHeight(node) + 40);
  }
  return { version: 1, sourceSha256, positions, viewport: { x: 36, y: 36, zoom: 1 } };
}
/** Validate product layout only; never interpret this as material validation. */
export function parseLayout(text: string, graph: SourceGraph, digest: string): GraphLayout {
  const value = JSON.parse(text) as GraphLayout;
  const coordinate = (n: unknown) => typeof n === 'number' && Number.isFinite(n) && Math.abs(n) <= 1_000_000;
  if (value?.version !== 1 || value.sourceSha256 !== digest || !value.positions || !value.viewport ||
      !coordinate(value.viewport.x) || !coordinate(value.viewport.y) || !Number.isFinite(value.viewport.zoom) ||
      value.viewport.zoom < .2 || value.viewport.zoom > 2 || Object.keys(value.positions).length !== graph.nodes.length) {
    throw new Error('Layout version, document identity or viewport does not match.');
  }
  const positions: Record<string, Point> = Object.create(null);
  for (const node of graph.nodes) {
    const point = Object.hasOwn(value.positions, node.id) ? value.positions[node.id] : undefined;
    if (!point || !coordinate(point.x) || !coordinate(point.y)) throw new Error('Layout node positions do not match.');
    positions[node.id] = { x: point.x, y: point.y };
  }
  return { version: 1, sourceSha256: digest, positions, viewport: { ...value.viewport } };
}
