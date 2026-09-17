import { defineConfig } from '@playwright/test';

const extraArgs = process.env.MIXTURE_BROWSER_ARGS
  ? JSON.parse(process.env.MIXTURE_BROWSER_ARGS) as string[]
  : [];
const port = Number(process.env.MIXTURE_TEST_PORT ?? 4173);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw Error('Invalid MIXTURE_TEST_PORT');

export default defineConfig({
  testDir: './tests',
  testMatch: '**/*.spec.ts',
  timeout: 90_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'test-results/browser.json' }]],
  use: {
    baseURL: `http://127.0.0.1:${port}/player/`,
    channel: 'chromium',
    headless: true,
    launchOptions: { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', ...extraArgs] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'node scripts/static-server.mjs',
    url: `http://127.0.0.1:${port}/player/`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
