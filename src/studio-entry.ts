import { startPreview } from './preview-session';
import { EditableDocument } from './document';
import { graphView } from './graph-view';
import { studioEditor } from './studio-editor';

startPreview(hooks => {
  const graphRoot = document.getElementById('graph-section');
  const editorRoot = document.getElementById('studio-editor');
  if (!graphRoot || !editorRoot) throw new Error('Missing Studio roots');
  let editor: ReturnType<typeof studioEditor> | undefined;
  const graph = graphView(graphRoot, {
    selected: id => editor?.select(id),
    materialDirty: () => editor?.dirty() ?? false,
    materialBytes: () => editor?.bytes(),
  });
  editor = studioEditor(editorRoot, graph, hooks);
  return {
    async prepare(module, bytes, name) {
      // Validate original bytes before projecting an editable document.
      new EditableDocument(module, bytes);
      return graph.prepare(module, bytes, name);
    },
    confirmReplace: () => graph.confirmReplace(),
    clear: () => editor!.clear(),
    load: (module, bytes, name, fresh) => editor!.load(module, bytes, name, fresh),
  };
});
