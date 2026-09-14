import type { ExposedParameter, Inspection, ParameterValue } from '@openmixture/runtime';

export function parameterControls(container: HTMLElement, changed: (id: string, value: ParameterValue) => void) {
  const effective = new Map<string, HTMLElement>();
  return {
    clear(message: string) { container.replaceChildren(); effective.clear(); container.textContent = message; },
    build(bindings: ExposedParameter[]) {
      container.replaceChildren(); effective.clear();
      if (!bindings.length) { container.textContent = 'This material has no exposed parameters.'; return; }
      for (const binding of bindings) {
        const group = document.createElement('fieldset'); group.className = 'parameter';
        const legend = document.createElement('legend'); legend.textContent = binding.id; group.append(legend);
        const kind = binding.contract.kind;
        const value = binding.effectiveValue;
        const addNumber = (label: string, initial: number, onInput: () => void) => {
          const wrapper = document.createElement('label'); wrapper.textContent = kind.type === 'color' ? label : '';
          const input = document.createElement('input'); input.type = 'number'; input.step = 'any'; input.value = String(initial);
          input.setAttribute('aria-label', kind.type === 'color' ? `${binding.id} ${label}` : binding.id);
          if (kind.type === 'integer' || kind.type === 'float') {
            input.min = String(kind.min); input.max = String(kind.max); input.step = kind.type === 'integer' ? '1' : 'any';
          }
          input.addEventListener('input', onInput); wrapper.append(input); group.append(wrapper); return input;
        };
        if (kind.type === 'enum') {
          const select = document.createElement('select'); select.setAttribute('aria-label', binding.id);
          for (const choice of kind.values) { const option = new Option(choice, choice); select.add(option); }
          select.value = String(value); select.addEventListener('change', () => changed(binding.id, select.value)); group.append(select);
        } else if (kind.type === 'color') {
          const values = value as [number, number, number, number];
          const inputs: HTMLInputElement[] = [];
          for (const [i, label] of ['Red', 'Green', 'Blue', 'Alpha'].entries()) {
            inputs.push(addNumber(label, values[i], () => changed(binding.id,
              inputs.map(input => input.valueAsNumber) as [number, number, number, number])));
          }
          group.classList.add('color-parameter');
        } else {
          const input = addNumber('Value', value as number, () => changed(binding.id, input.valueAsNumber));
        }
        const info = document.createElement('p'); info.className = 'muted effective-value'; group.append(info);
        effective.set(binding.id, info); container.append(group);
      }
    },
    validity(inspection?: Inspection) {
      for (const info of effective.values()) info.textContent = 'Value not validated';
      if (inspection) for (const binding of inspection.exposedParameters) {
        const info = effective.get(binding.id);
        if (info) info.textContent = `Effective: ${Array.isArray(binding.effectiveValue) ? binding.effectiveValue.join(', ') : binding.effectiveValue}`;
      }
    },
  };
}
