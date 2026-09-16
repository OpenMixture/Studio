import type { RuntimeModule } from '@openmixture/runtime';
import { defaultLayout, nodeHeight, NODE_WIDTH, parseLayout, readSourceGraph, type GraphLayout, type SourceGraph } from './source-graph';
import './graph.css';

export function graphView(root: HTMLElement) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const viewport = get('graph-viewport'), world = get('graph-world'), nodes = get('graph-nodes');
  const edges = root.querySelector<SVGSVGElement>('#graph-edges')!;
  const picker = get<HTMLSelectElement>('graph-selection'), inspector = get('graph-inspector');
  const status = get('graph-status'), layoutFile = get<HTMLInputElement>('layout-file');
  const sourceButton = get<HTMLButtonElement>('download-source');
  let graph: SourceGraph | undefined, layout: GraphLayout | undefined, bytes: Uint8Array | undefined;
  let selected = '', filename = '', dirty = false, generation = 0, layoutRead = 0;
  const buttons = new Map<string, HTMLButtonElement>();
  const urls = new Set<string>();
  let gesture: { pointer: number; id?: string; x: number; y: number; startX: number; startY: number } | undefined;

  function note(message?: string) {
    status.textContent = message ?? (dirty ? 'Layout changed · not saved. Material source is unchanged.' : 'Layout ready. Material source is read-only.');
  }
  function controls(enabled: boolean) {
    for (const control of root.querySelectorAll<HTMLButtonElement | HTMLInputElement | HTMLSelectElement>('button, input, select')) control.disabled = !enabled;
  }
  function download(data: Uint8Array | string, name: string) {
    const blob = typeof data === 'string' ? new Blob([data], { type: 'application/json' }) : new Blob([new Uint8Array(data)], { type: 'application/json' });
    const url = URL.createObjectURL(blob); urls.add(url);
    const a = document.createElement('a'); a.href = url; a.download = name; a.click();
    window.setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 1000);
  }
  function select(id: string) {
    selected = id; picker.value = id;
    for (const [key, button] of buttons) button.setAttribute('aria-pressed', String(key === id));
    const node = graph?.nodes.find(item => item.id === id);
    inspector.replaceChildren();
    if (!node) return;
    const heading = document.createElement('h3'); heading.textContent = node.id;
    const kind = document.createElement('p'); kind.textContent = `${node.contract.label} · ${node.type} v${node.version}`;
    const description = document.createElement('p'); description.textContent = node.contract.description;
    inspector.append(heading, kind, description);
    function section(title: string, lines: string[]) {
      const h = document.createElement('h4'); h.textContent = title;
      const list = document.createElement('ul');
      for (const line of lines.length ? lines : ['None']) { const li = document.createElement('li'); li.textContent = line; list.append(li); }
      inspector.append(h, list);
    }
    section('Parameters · authored values', node.parameters.map(p => `${p.id}: ${p.value} (${p.origin})`));
    section('Inputs', node.contract.inputs.map(p => {
      const connection = graph!.edges.find(edge => edge.to.nodeId === id && edge.to.portId === p.id);
      return `${p.id} · ${p.kind} · ${connection ? `${connection.from.nodeId}.${connection.from.portId}` : `default ${JSON.stringify(p.default?.value ?? null)}`}`;
    }));
    section('Outputs', node.contract.outputs.map(p => `${p.id} · ${p.kind}`));
    section('Public bindings', graph!.bindings.filter(binding => binding.nodeId === id).map(binding => `${binding.id} → ${binding.parameterId}`));
    section('Connections', graph!.edges.filter(edge => edge.from.nodeId === id || edge.to.nodeId === id)
      .map(edge => `${edge.from.nodeId}.${edge.from.portId} → ${edge.to.nodeId}.${edge.to.portId}`));
  }
  function draw() {
    if (!graph || !layout) return;
    const v = layout.viewport;
    world.style.transform = `translate(${v.x}px, ${v.y}px) scale(${v.zoom})`;
    get('graph-zoom').textContent = `${Math.round(v.zoom * 100)}%`;
    for (const node of graph.nodes) {
      const p = layout.positions[node.id], button = buttons.get(node.id)!;
      button.style.transform = `translate(${p.x}px, ${p.y}px)`;
    }
    edges.replaceChildren();
    const ns = 'http://www.w3.org/2000/svg';
    const definitions = document.createElementNS(ns, 'defs');
    const marker = document.createElementNS(ns, 'marker');
    for (const [key, value] of Object.entries({ id: 'graph-arrow', markerWidth: '8', markerHeight: '8', refX: '7', refY: '4', orient: 'auto' })) marker.setAttribute(key, value);
    const arrow = document.createElementNS(ns, 'path'); arrow.setAttribute('d', 'M0 0 L8 4 L0 8'); arrow.setAttribute('fill', '#587d70'); marker.append(arrow); definitions.append(marker); edges.append(definitions);
    const byId = new Map(graph.nodes.map(node => [node.id, node]));
    for (const edge of graph.edges) {
      const from = layout.positions[edge.from.nodeId], to = layout.positions[edge.to.nodeId];
      const a = byId.get(edge.from.nodeId)!, b = byId.get(edge.to.nodeId)!;
      const x1 = from.x + NODE_WIDTH, y1 = from.y + 70 + a.contract.outputs.findIndex(p => p.id === edge.from.portId) * 22;
      const x2 = to.x, y2 = to.y + 70 + b.contract.inputs.findIndex(p => p.id === edge.to.portId) * 22;
      const bend = Math.max(60, Math.abs(x2 - x1) / 2);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M${x1} ${y1} C${x1 + bend} ${y1},${x2 - bend} ${y2},${x2} ${y2}`);
      path.setAttribute('marker-end', 'url(#graph-arrow)'); path.classList.add('graph-edge');
      edges.append(path);
    }
  }
  function changed() { layoutRead++; dirty = true; draw(); note(); }
  function centerSelected() {
    if (!layout || !graph) return;
    const p = layout.positions[selected], node = graph.nodes.find(n => n.id === selected);
    if (!p || !node) return;
    layout.viewport.x = viewport.clientWidth / 2 - (p.x + NODE_WIDTH / 2) * layout.viewport.zoom;
    layout.viewport.y = viewport.clientHeight / 2 - (p.y + nodeHeight(node) / 2) * layout.viewport.zoom;
    changed();
  }
  function fit(mark = true) {
    if (!layout || !graph?.nodes.length) return;
    const points = graph.nodes.map(node => ({ ...layout!.positions[node.id], height: nodeHeight(node) }));
    const left = Math.min(...points.map(p => p.x)), top = Math.min(...points.map(p => p.y));
    const w = Math.max(...points.map(p => p.x + NODE_WIDTH)) - left;
    const h = Math.max(...points.map(p => p.y + p.height)) - top;
    const zoom = Math.max(.2, Math.min(1, (viewport.clientWidth - 60) / w, (viewport.clientHeight - 60) / h));
    layout.viewport = { zoom, x: (viewport.clientWidth - w * zoom) / 2 - left * zoom, y: (viewport.clientHeight - h * zoom) / 2 - top * zoom };
    if (mark) changed(); else draw();
  }
  function zoom(factor: number) {
    if (!layout) return;
    const v = layout.viewport, next = Math.max(.2, Math.min(2, v.zoom * factor));
    const cx = viewport.clientWidth / 2, cy = viewport.clientHeight / 2;
    v.x = cx - (cx - v.x) * next / v.zoom; v.y = cy - (cy - v.y) * next / v.zoom; v.zoom = next;
    changed();
  }
  picker.addEventListener('change', () => { select(picker.value); centerSelected(); });
  get('graph-center').addEventListener('click', centerSelected);
  get('graph-fit').addEventListener('click', () => fit());
  get('graph-zoom-in').addEventListener('click', () => zoom(1.2));
  get('graph-zoom-out').addEventListener('click', () => zoom(1 / 1.2));
  get('graph-reset').addEventListener('click', () => {
    if (!graph || !layout) return;
    layout = defaultLayout(graph, layout.sourceSha256); fit(false); changed();
  });
  viewport.addEventListener('pointerdown', event => {
    if (!layout || event.button !== 0) return;
    const button = (event.target as Element).closest<HTMLButtonElement>('.graph-node');
    const id = button?.dataset.nodeId;
    if (id) { select(id); button!.focus({ preventScroll: true }); } else viewport.focus({ preventScroll: true });
    const start = id ? layout.positions[id] : layout.viewport;
    gesture = { pointer: event.pointerId, id, x: event.clientX, y: event.clientY, startX: start.x, startY: start.y };
    viewport.setPointerCapture(event.pointerId); event.preventDefault();
  });
  viewport.addEventListener('pointermove', event => {
    if (!layout || !gesture || gesture.pointer !== event.pointerId) return;
    const target = gesture.id ? layout.positions[gesture.id] : layout.viewport;
    const divisor = gesture.id ? layout.viewport.zoom : 1;
    const clamp = (value: number) => Math.max(-1_000_000, Math.min(1_000_000, value));
    const x = clamp(gesture.startX + (event.clientX - gesture.x) / divisor);
    const y = clamp(gesture.startY + (event.clientY - gesture.y) / divisor);
    if (target.x !== x || target.y !== y) { target.x = x; target.y = y; changed(); }
  });
  for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) viewport.addEventListener(event, () => { gesture = undefined; });
  viewport.addEventListener('keydown', event => {
    if (!layout) return;
    const delta: Record<string, [number, number]> = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };
    if (event.key === '+' || event.key === '=') { zoom(1.2); event.preventDefault(); }
    else if (event.key === '-') { zoom(1 / 1.2); event.preventDefault(); }
    else if (event.key === 'Home') { fit(); event.preventDefault(); }
    else if (delta[event.key]) {
      const nodeId = (event.target as HTMLElement).closest<HTMLButtonElement>('.graph-node')?.dataset.nodeId;
      const target = nodeId ? layout.positions[nodeId] : layout.viewport;
      const step = event.shiftKey ? 50 : 10;
      target.x = Math.max(-1_000_000, Math.min(1_000_000, target.x + delta[event.key][0] * step));
      target.y = Math.max(-1_000_000, Math.min(1_000_000, target.y + delta[event.key][1] * step));
      changed(); event.preventDefault();
    }
  });
  sourceButton.addEventListener('click', () => { if (bytes) download(bytes, filename); });
  get('save-layout').addEventListener('click', () => {
    if (!layout) return;
    download(JSON.stringify(layout, null, 2), `${filename}.layout.json`); dirty = false; note('Layout download started. Material source is unchanged.');
  });
  layoutFile.addEventListener('change', () => {
    const file = layoutFile.files?.[0]; layoutFile.value = '';
    if (!file || !graph || !layout) return;
    const current = generation, read = ++layoutRead;
    void (async () => {
      if (file.size > 4 * 1024 * 1024) throw new Error('Layout exceeds 4 MiB.');
      const text = await file.text();
      if (current !== generation || read !== layoutRead || !graph || !layout) return;
      layout = parseLayout(text, graph, layout.sourceSha256); dirty = false; draw(); note('Layout loaded. Material source is unchanged.');
    })().catch(error => {
      if (current !== generation || read !== layoutRead || !graph || !layout) return;
      layout = defaultLayout(graph, layout.sourceSha256); fit(false); dirty = false;
      note(`Layout ignored; using default positions. ${error instanceof Error ? error.message : String(error)}`);
    });
  });
  window.addEventListener('beforeunload', event => { if (dirty) { event.preventDefault(); event.returnValue = ''; } });
  window.addEventListener('pagehide', () => { generation++; layoutRead++; for (const url of urls) URL.revokeObjectURL(url); urls.clear(); });
  function clear() {
    generation++; layoutRead++; graph = undefined; layout = undefined; bytes = undefined; dirty = false; gesture = undefined;
    nodes.replaceChildren(); edges.replaceChildren(); buttons.clear(); picker.replaceChildren(); inspector.replaceChildren();
    controls(false); get('graph-summary').textContent = 'No graph'; note('Open a valid material to inspect its source graph.');
  }
  clear();
  return {
    clear,
    confirmReplace: () => !dirty || window.confirm('Discard unsaved layout changes and open another material?'),
    async load(runtime: RuntimeModule, source: Uint8Array, name: string) {
      const current = ++generation;
      try {
        const projected = readSourceGraph(runtime, source);
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', new Uint8Array(source)))].map(n => n.toString(16).padStart(2, '0')).join('');
        if (current !== generation) return;
        graph = projected; bytes = source.slice(); filename = name; layout = defaultLayout(graph, digest);
        for (const node of graph.nodes) {
          const button = document.createElement('button'); button.type = 'button'; button.className = 'graph-node'; button.dataset.nodeId = node.id;
          button.style.height = `${nodeHeight(node)}px`; button.setAttribute('aria-label', `Node ${node.id}`);
          const title = document.createElement('strong'); title.textContent = node.id;
          const type = document.createElement('span'); type.className = 'node-type'; type.textContent = `${node.type} v${node.version}`;
          const ports = document.createElement('span'); ports.className = 'node-ports';
          for (const contracts of [node.contract.inputs, node.contract.outputs]) {
            const column = document.createElement('span');
            for (const port of contracts) { const line = document.createElement('span'); line.textContent = `${port.id} · ${port.kind}`; column.append(line); }
            ports.append(column);
          }
          button.append(title, type, ports);
          button.addEventListener('click', () => select(node.id));
          button.addEventListener('focus', () => select(node.id));
          nodes.append(button); buttons.set(node.id, button); picker.add(new Option(node.id, node.id));
        }
        get('graph-summary').textContent = `${graph.nodes.length} nodes · ${graph.edges.length} connections · source graph`;
        controls(true); select(graph.nodes[0]?.id ?? ''); fit(false); note();
      } catch (error) {
        if (current === generation) { clear(); note(`Graph unavailable: ${error instanceof Error ? error.message : String(error)}`); }
      }
    },
  };
}
