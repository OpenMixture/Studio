import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig(({ mode }) => ({
  // Exercise package-relative WASM loading under an actual non-root deployment.
  base: '/player/',
  build: {
    target: 'es2022',
    assetsInlineLimit: 0,
    rolldownOptions: {
      input: mode === 'browser-test'
        ? { player: resolve('index.html'), contract: resolve('tests/contract.html') }
        : resolve('index.html'),
    },
  },
}));
