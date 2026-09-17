import { defineConfig, type Plugin } from 'vite';
import { resolve } from 'node:path';
import { mkdirSync, writeFileSync } from 'node:fs';

// Inspect emitted chunks, including transitive and dynamic dependencies. Source
// entry separation alone does not guarantee that bundling preserves the boundary.
const entryBoundary: Plugin = {
  name: 'verify-product-entry-boundary',
  generateBundle(_options, bundle) {
    const inspect = (html: string) => {
      const entry = Object.values(bundle).find(chunk => chunk.type === 'chunk' && chunk.isEntry && chunk.facadeModuleId?.replaceAll('\\', '/').endsWith(`/${html}`));
      if (!entry) throw new Error(`Missing production entry: ${html}`);
      const seen = new Set<string>(), modules = new Set<string>();
      const visit = (name: string) => {
        if (seen.has(name)) return;
        seen.add(name);
        const chunk = bundle[name];
        if (!chunk || chunk.type !== 'chunk') throw new Error(`Unresolved chunk: ${name}`);
        for (const id of Object.keys(chunk.modules)) modules.add(id.replaceAll('\\', '/'));
        for (const dependency of [...chunk.imports, ...chunk.dynamicImports]) visit(dependency);
      };
      visit(entry.fileName);
      return { chunks: [...seen].sort(), modules: [...modules].map(id => id.replace(`${resolve('.').replaceAll('\\', '/')}/`, '')).sort() };
    };
    const player = inspect('index.html'), studio = inspect('studio.html');
    const editorModules = ['studio-entry.ts', 'studio-editor.ts', 'document.ts', 'graph-view.ts', 'source-graph.ts', 'history.ts'];
    for (const name of editorModules) {
      if (player.modules.includes(`src/${name}`)) throw new Error(`Player includes editor implementation: ${name}`);
      if (!studio.modules.includes(`src/${name}`)) throw new Error(`Studio is missing editor implementation: ${name}`);
    }
    mkdirSync('test-results', { recursive: true });
    writeFileSync('test-results/entry-bundles.json', JSON.stringify({ player, studio }, null, 2) + '\n');
  },
};

export default defineConfig(({ mode }) => {
  const input: Record<string, string> = { player: resolve('index.html'), studio: resolve('studio.html') };
  if (mode === 'browser-test') input.contract = resolve('tests/contract.html');
  return {
    plugins: [entryBoundary],
    // Exercise package-relative WASM loading under an actual non-root deployment.
    base: '/player/',
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
      rolldownOptions: { input },
    },
  };
});
