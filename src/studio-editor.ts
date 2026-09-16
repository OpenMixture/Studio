import type { Diagnostic, RuntimeModule, ValidationResult } from '@openmixture/runtime';
import { EditableDocument, jsonText, NumberToken, parseDocument } from './document.ts';
import { projectGraph } from './source-graph';
import type { graphView } from './graph-view';

import { History } from './history';

type GraphView = ReturnType<typeof graphView>;
export function studioEditor(root: HTMLElement, graph: GraphView, hooks: {
  invalidate(): void; changed(bytes: Uint8Array | undefined, result: ValidationResult): void;
  create(bytes: Uint8Array): void;
}) {
  const get = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  const selection = get<HTMLSelectElement>('edit-node-selection');
  const types = get<HTMLSelectElement>('node-type'), form = get('node-parameters');
  const fromNode = get<HTMLSelectElement>('edge-from-node'), fromPort = get<HTMLSelectElement>('edge-from-port');
  const toNode = get<HTMLSelectElement>('edge-to-node'), toPort = get<HTMLSelectElement>('edge-to-port');
  const diagnostics = get('editor-diagnostics'), status = get('editor-status');
  let model: EditableDocument | undefined, selected = '', pending = new Map<string, string[]>();
  let errors = new Map<string, Diagnostic>(), touched = false;
  let latest: ValidationResult | undefined;
  const key = (id: string, parameter: string) => JSON.stringify([id, parameter]);
  let newUnsaved = false;
  const dirty = () => Boolean(newUnsaved || model?.unsaved || errors.size);
  type Snapshot = { document: string; pending: [string, string[]][]; errors: [string, Diagnostic][]; layout: string; selected: string };
  let history: History<Snapshot> | undefined;
  let filename = 'material.mix';
  const urls = new Set<string>();
  const capture = (): Snapshot => ({ document: jsonText(model!.doc), pending: [...pending], errors: [...errors], layout: graph.snapshot(), selected });
  const equal = (a: Snapshot, b: Snapshot) => a.document === b.document && JSON.stringify(a.pending) === JSON.stringify(b.pending) && JSON.stringify(a.errors) === JSON.stringify(b.errors) && a.layout === b.layout;
  function historyControls() {
    get<HTMLButtonElement>('undo').disabled = !history?.canUndo;
    get<HTMLButtonElement>('redo').disabled = !history?.canRedo;
    get<HTMLButtonElement>('save-material').disabled = !model || !latest?.ok;
  }
  function record(group?: string) { if (model) history?.record(capture(), group); historyControls(); }
  function restore(state: Snapshot | undefined) {
    if (!state || !model) return;
    const current = capture();
    if (current.document === state.document && JSON.stringify(current.pending) === JSON.stringify(state.pending) && JSON.stringify(current.errors) === JSON.stringify(state.errors)) {
      graph.restore(state.layout); graph.select(state.selected); historyControls(); return;
    }
    hooks.invalidate(); model.doc = parseDocument(new TextEncoder().encode(state.document)); model.dirty = true;
    pending = new Map(state.pending); errors = new Map(state.errors); selected = state.selected;
    touched = dirty(); publish(); graph.restore(state.layout); renderParameters(); renderConnections(); historyControls();
  }
  graph.onChange(() => record());
  root.addEventListener('focusout', () => history?.boundary());
  get('undo').addEventListener('click', () => restore(history?.undo()));
  get('redo').addEventListener('click', () => restore(history?.redo()));
  window.addEventListener('keydown', event => {
    if (!(event.ctrlKey || event.metaKey) || event.altKey || event.key.toLowerCase() !== 'z') return;
    // Text fields keep their native text editing shortcuts; toolbar undo includes drafts.
    if ((event.target as HTMLElement).matches('input, textarea, select')) return;
    event.preventDefault(); restore(event.shiftKey ? history?.redo() : history?.undo());
  });
  get('save-material').addEventListener('click', () => {
    if (!model) return;
    history?.boundary();
    try {
      if (errors.size) throw Error('Repair incomplete fields before saving.');
      const bytes = model.bytes(), validation = model.runtime.validate(bytes);
      if (!validation.ok) { showDiagnostics(validation); throw Error('Repair the material before saving.'); }
      const url = URL.createObjectURL(new Blob([new Uint8Array(bytes)], { type: 'application/json' })); urls.add(url);
      const a = document.createElement('a'); a.href = url; a.download = filename;
      try { a.click(); } finally { window.setTimeout(() => { URL.revokeObjectURL(url); urls.delete(url); }, 1000); }
      model.checkpoint(bytes); newUnsaved = false; touched = dirty(); showDiagnostics(validation); graph.draftMode(touched, bytes);
      get('save-status').textContent = 'Material download started. This is the saved checkpoint; browser disk completion cannot be verified.';
    } catch (error) { get('save-status').textContent = `Material save failed; draft retained. ${String(error)}`; }
  });
  window.addEventListener('pagehide', () => { for (const url of urls) URL.revokeObjectURL(url); urls.clear(); });
  function clear() {
    model = undefined; newUnsaved = false; history = undefined; get('binding-list').replaceChildren(); get('save-status').textContent = ''; selected = ''; pending.clear(); errors.clear(); touched = false; latest = undefined;
    form.replaceChildren(); diagnostics.replaceChildren(); types.replaceChildren();
    for (const select of [selection, fromNode, fromPort, toNode, toPort]) select.replaceChildren();
    for (const control of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select')) control.disabled = true;
    status.textContent = 'Open a valid material to edit its graph.';
  }
  function showDiagnostics(result: ValidationResult) {
    latest = result; historyControls(); diagnostics.replaceChildren(); graph.diagnostics(result.diagnostics);
    status.textContent = result.ok ? (touched ? 'Valid material draft · unsaved. Preview overrides have been reset.' : 'Material source unchanged.') : 'Invalid draft · repair the fields or connections, or discard edits. Preview and PNG export are blocked.';
    for (const item of result.diagnostics) {
      const row = document.createElement('li');
      row.textContent = `${item.code}: ${[item.nodeId, item.portId, item.parameterId].filter(Boolean).join(' / ')} ${item.message}`;
      if (item.nodeId && model?.doc.nodes.some(n => n.id === item.nodeId)) {
        const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Select node';
        button.addEventListener('click', () => { graph.select(item.nodeId!); }); row.append(button);
      }
      diagnostics.append(row);
    }
    for (const input of form.querySelectorAll<HTMLInputElement | HTMLSelectElement>('[data-parameter]')) {
      input.setAttribute('aria-invalid', String(result.diagnostics.some(d => d.nodeId === selected && (!d.parameterId || d.parameterId === input.dataset.parameter))));
    }
  }
  function publish(preferred = selected) {
    if (!model) return;
    try {
      graph.update(projectGraph(model.doc, model.catalog), preferred);
      const bytes = errors.size ? undefined : model.bytes();
      graph.draftMode(touched, bytes);
      const result: ValidationResult = errors.size ? { ok: false, diagnostics: [...errors.values()] } : model.validate();
      showDiagnostics(result); edgeActions(); hooks.changed(bytes, result);
    } catch (error) {
      const result: ValidationResult = { ok: false, diagnostics: [{ code: 'EDITOR_TRANSPORT_FAILED', stage: 'editor', severity: 'error', message: String(error) }] };
      showDiagnostics(result); hooks.changed(undefined, result);
    }
  }
  function transact(action: () => string | void, structural = false, group?: string) {
    if (!model) return;
    hooks.invalidate(); touched = true;
    try { const next = action(); touched = dirty(); publish(next ?? selected); if (structural) { renderParameters(); renderConnections(); } renderBindings(); record(group); }
    catch (error) { showDiagnostics({ ok: false, diagnostics: [{ code: 'EDITOR_COMMAND_FAILED', stage: 'editor', severity: 'error', message: String(error) }] }); }
  }
  function edgeActions() {
    get<HTMLButtonElement>('connect-edge').disabled = !fromNode.value || !fromPort.value || !toNode.value || !toPort.value;
    get<HTMLButtonElement>('disconnect-edge').disabled = !model?.doc.edges?.some(edge => edge.to.nodeId === toNode.value && edge.to.portId === toPort.value);
  }
  function portOptions(nodeSelect: HTMLSelectElement, ports: HTMLSelectElement, direction: 'inputs' | 'outputs') {
    const previous = ports.value; ports.replaceChildren();
    const node = model?.doc.nodes.find(n => n.id === nodeSelect.value);
    const contract = model?.catalog.find(c => c.typeId === node?.type);
    for (const port of contract?.[direction] ?? []) ports.add(new Option(`${port.id} · ${port.kind}`, port.id));
    if ([...ports.options].some(option => option.value === previous)) ports.value = previous;
    ports.disabled = !ports.options.length; edgeActions();
  }
  function renderConnections() {
    selection.replaceChildren();
    for (const node of model?.doc.nodes ?? []) selection.add(new Option(node.id, node.id));
    selection.value = selected;
    for (const select of [fromNode, toNode]) {
      const previous = select.value; select.replaceChildren();
      for (const node of model?.doc.nodes ?? []) select.add(new Option(node.id, node.id));
      if ([...select.options].some(option => option.value === previous)) select.value = previous;
      select.disabled = !select.options.length;
    }
    portOptions(fromNode, fromPort, 'outputs'); portOptions(toNode, toPort, 'inputs');
  }
  function renderParameters() {
    form.replaceChildren(); renderBindings();
    get<HTMLButtonElement>('remove-node').disabled = !model?.doc.nodes.some(node => node.id === selected);
    const node = model?.doc.nodes.find(n => n.id === selected);
    get('editor-selection').textContent = node ? `Edit ${node.id}` : 'Select a node';
    if (!node || !model) return;
    const contract = model.catalog.find(c => c.typeId === node.type)!;
    for (const parameter of contract.parameters) {
      const group = document.createElement('fieldset'); group.className = 'parameter';
      const legend = document.createElement('legend'); legend.textContent = parameter.id; group.append(legend);
      const value = node.parameters && Object.hasOwn(node.parameters, parameter.id) ? node.parameters[parameter.id] : parameter.default;
      const id = selected, fieldKey = key(id, parameter.id), kind = parameter.kind;
      const inputChanged = (tokens: string[]) => {
        transact(() => {
          pending.set(fieldKey, tokens);
          try {
            const parsed = kind.type === 'enum' ? tokens[0] : kind.type === 'color' ? tokens.map(text => new NumberToken(text)) : new NumberToken(tokens[0]);
            errors.delete(fieldKey); model!.parameter(id, parameter.id, parsed);
          } catch (error) {
            errors.set(fieldKey, { code: 'EDITOR_NUMBER_INCOMPLETE', stage: 'editor', severity: 'error', nodeId: id, parameterId: parameter.id, message: String(error) });
          }
        }, false, fieldKey);
      };
      if (kind.type === 'enum') {
        const select = document.createElement('select'); select.setAttribute('aria-label', `Edit ${parameter.id}`); select.dataset.parameter = parameter.id;
        for (const choice of kind.values) select.add(new Option(choice, choice));
        select.value = pending.get(fieldKey)?.[0] ?? String(value);
        select.addEventListener('change', () => inputChanged([select.value])); group.append(select);
      } else {
        const values = pending.get(fieldKey) ?? (kind.type === 'color' ? (value as unknown[]).map(jsonText) : [value === null ? '' : jsonText(value)]);
        const inputs: HTMLInputElement[] = [];
        for (let index = 0; index < (kind.type === 'color' ? 4 : 1); index++) {
          const label = document.createElement('label'), input = document.createElement('input');
          const component = kind.type === 'color' ? ['Red', 'Green', 'Blue', 'Alpha'][index] : '';
          label.textContent = kind.type === 'color' ? component : `${kind.type} · ${kind.min} to ${kind.max}`;
          input.type = 'text'; input.inputMode = 'decimal'; input.value = values[index]; input.dataset.parameter = parameter.id;
          input.setAttribute('aria-label', `Edit ${parameter.id}${component ? ` ${component}` : ''}`);
          input.addEventListener('input', () => inputChanged(inputs.map(item => item.value)));
          inputs.push(input); label.append(input); group.append(label);
        }
      }
      const reset = document.createElement('button'); reset.type = 'button'; reset.textContent = 'Use default'; reset.setAttribute('aria-label', `Use default ${parameter.id}`);
      reset.addEventListener('click', () => { transact(() => { pending.delete(fieldKey); errors.delete(fieldKey); model!.resetParameter(id, parameter.id); }); renderParameters(); });
      group.append(reset); form.append(group);
    }
    if (!contract.parameters.length) form.textContent = 'This node has no parameters.';
    if (latest) showDiagnostics(latest);
  }
  function renderBindings() {
    const parameters = get<HTMLSelectElement>('binding-parameter'), list = get('binding-list');
    const previous = parameters.value; parameters.replaceChildren(); list.replaceChildren();
    const node = model?.doc.nodes.find(n => n.id === selected);
    for (const p of model?.catalog.find(c => c.typeId === node?.type)?.parameters ?? []) parameters.add(new Option(p.id, p.id));
    if ([...parameters.options].some(o => o.value === previous)) parameters.value = previous;
    get<HTMLButtonElement>('add-binding').disabled = !parameters.value;
    for (const [index, binding] of (model?.doc.exposedParameters ?? []).entries()) {
      const row = document.createElement('li'); row.textContent = `${binding.id} → ${binding.nodeId}.${binding.parameterId} `;
      const button = document.createElement('button'); button.type = 'button'; button.textContent = 'Remove'; button.setAttribute('aria-label', `Remove binding ${binding.id}`);
      button.addEventListener('click', () => transact(() => model!.unbind(index))); row.append(button); list.append(row);
    }
  }
  get('add-binding').addEventListener('click', () => transact(() => model!.bind(get<HTMLInputElement>('binding-id').value, selected, get<HTMLSelectElement>('binding-parameter').value)));
  selection.addEventListener('change', () => graph.select(selection.value));
  get('add-node').addEventListener('click', () => transact(() => model!.add(types.value), true));
  get('remove-node').addEventListener('click', () => transact(() => {
    const id = selected; model!.remove(id);
    for (const field of pending.keys()) if (JSON.parse(field)[0] === id) { pending.delete(field); errors.delete(field); }
  }, true));
  fromNode.addEventListener('change', () => portOptions(fromNode, fromPort, 'outputs'));
  toNode.addEventListener('change', () => portOptions(toNode, toPort, 'inputs'));
  fromPort.addEventListener('change', edgeActions); toPort.addEventListener('change', edgeActions);
  get('connect-edge').addEventListener('click', () => {
    if (!fromNode.value || !fromPort.value || !toNode.value || !toPort.value) return;
    transact(() => model!.connect({ nodeId: fromNode.value, portId: fromPort.value }, { nodeId: toNode.value, portId: toPort.value }));
  });
  get('disconnect-edge').addEventListener('click', () => {
    if (toNode.value && toPort.value) transact(() => model!.disconnect({ nodeId: toNode.value, portId: toPort.value }));
  });
  get('discard-edits').addEventListener('click', () => {
    if (!model || (touched && !window.confirm('Discard material edits and return to the last saved material?'))) return;
    transact(() => { model!.restoreSaved(); pending.clear(); errors.clear(); }, true);
  });
  get('new-material').addEventListener('click', () => {
    if (!model) return;
    const output = model.catalog.find(c => c.typeId === 'material-output');
    const checker = model.catalog.find(c => c.typeId === 'checker');
    try { if (output && checker) hooks.create(new TextEncoder().encode(JSON.stringify({ version: 1, nodes: [{ id: 'checker', type: checker.typeId, version: checker.version }, { id: 'out', type: output.typeId, version: output.version }], edges: [{ from: { nodeId: 'checker', portId: 'color' }, to: { nodeId: 'out', portId: 'baseColor' } }] }))); }
    catch (error) { get('save-status').textContent = `New material failed; current work retained. ${String(error)}`; }
  });
  clear();
  return {
    clear, dirty,
    bytes() {
      if (!model) return undefined;
      if (errors.size || !model.validate().ok) throw Error('Repair the material draft first.');
      return model.bytes();
    },
    select(id: string) { selected = id; selection.value = id; renderParameters(); },
    load(runtime: RuntimeModule, bytes: Uint8Array, name = 'material.mix', fresh = false) {
      clear();
      try {
        model = new EditableDocument(runtime, bytes); filename = name; newUnsaved = fresh; touched = dirty();
        for (const control of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select')) control.disabled = false;
        for (const node of model.catalog) types.add(new Option(`${node.label} · ${node.typeId}`, node.typeId));
        selected = model.doc.nodes[0]?.id ?? ''; renderParameters(); renderConnections(); history = new History(capture(), equal); showDiagnostics(model.validate());
      } catch (error) { clear(); status.textContent = `Editing unavailable: ${String(error)}`; }
    },
  };
}
