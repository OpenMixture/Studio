import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => {
  const input: Record<string, string> = { player: resolve('index.html'), studio: resolve('studio.html') };
  if (mode === 'browser-test') input.contract = resolve('tests/contract.html');
  return {
    // Exercise package-relative WASM loading under an actual non-root deployment.
    base: '/player/',
    build: {
      target: 'es2022',
      assetsInlineLimit: 0,
      rolldownOptions: { input },
    },
  };
});
