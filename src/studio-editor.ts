import type { Diagnostic, RuntimeModule, ValidationResult } from '@openmixture/runtime';
import { EditableDocument, jsonText, NumberToken } from './document.ts';
import { projectGraph } from './source-graph';
import type { graphView } from './graph-view';

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
  const dirty = () => touched;
  function clear() {
    model = undefined; selected = ''; pending.clear(); errors.clear(); touched = false; latest = undefined;
    form.replaceChildren(); diagnostics.replaceChildren(); types.replaceChildren();
    for (const select of [selection, fromNode, fromPort, toNode, toPort]) select.replaceChildren();
    for (const control of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select')) control.disabled = true;
    status.textContent = 'Open a valid material to edit its graph.';
  }
  function showDiagnostics(result: ValidationResult) {
    latest = result; diagnostics.replaceChildren(); graph.diagnostics(result.diagnostics);
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
      graph.draftMode(touched);
      const bytes = errors.size ? undefined : model.bytes();
      const result: ValidationResult = errors.size ? { ok: false, diagnostics: [...errors.values()] } : model.validate();
      showDiagnostics(result); edgeActions(); hooks.changed(bytes, result);
    } catch (error) {
      const result: ValidationResult = { ok: false, diagnostics: [{ code: 'EDITOR_TRANSPORT_FAILED', stage: 'editor', severity: 'error', message: String(error) }] };
      showDiagnostics(result); hooks.changed(undefined, result);
    }
  }
  function transact(action: () => string | void, structural = false) {
    if (!model) return;
    hooks.invalidate(); touched = true;
    try { const next = action(); publish(next ?? selected); if (structural) { renderParameters(); renderConnections(); } }
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
    form.replaceChildren();
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
        pending.set(fieldKey, tokens);
        transact(() => {
          try {
            const parsed = kind.type === 'enum' ? tokens[0] : kind.type === 'color' ? tokens.map(text => new NumberToken(text)) : new NumberToken(tokens[0]);
            errors.delete(fieldKey); model!.parameter(id, parameter.id, parsed);
          } catch (error) {
            errors.set(fieldKey, { code: 'EDITOR_NUMBER_INCOMPLETE', stage: 'editor', severity: 'error', nodeId: id, parameterId: parameter.id, message: String(error) });
          }
        });
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
      reset.addEventListener('click', () => { pending.delete(fieldKey); errors.delete(fieldKey); transact(() => model!.resetParameter(id, parameter.id)); renderParameters(); });
      group.append(reset); form.append(group);
    }
    if (!contract.parameters.length) form.textContent = 'This node has no parameters.';
    if (latest) showDiagnostics(latest);
  }
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
    if (!model || (touched && !window.confirm('Discard all material edits and return to the original source?'))) return;
    hooks.invalidate(); model.reset(); pending.clear(); errors.clear(); touched = false; publish(); renderParameters(); renderConnections();
  });
  get('new-material').addEventListener('click', () => {
    if (!model) return;
    const output = model.catalog.find(c => c.typeId === 'material-output');
    const checker = model.catalog.find(c => c.typeId === 'checker');
    if (output && checker) hooks.create(new TextEncoder().encode(JSON.stringify({ version: 1, nodes: [{ id: 'checker', type: checker.typeId, version: checker.version }, { id: 'out', type: output.typeId, version: output.version }], edges: [{ from: { nodeId: 'checker', portId: 'color' }, to: { nodeId: 'out', portId: 'baseColor' } }] })));
  });
  clear();
  return {
    clear, dirty,
    select(id: string) { selected = id; selection.value = id; renderParameters(); },
    load(runtime: RuntimeModule, bytes: Uint8Array) {
      clear();
      try {
        model = new EditableDocument(runtime, bytes);
        for (const control of root.querySelectorAll<HTMLButtonElement | HTMLSelectElement>('button, select')) control.disabled = false;
        for (const node of model.catalog) types.add(new Option(`${node.label} · ${node.typeId}`, node.typeId));
        selected = model.doc.nodes[0]?.id ?? ''; renderParameters(); renderConnections(); showDiagnostics(model.validate());
      } catch (error) { clear(); status.textContent = `Editing unavailable: ${String(error)}`; }
    },
  };
}
