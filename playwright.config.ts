import { defineConfig } from '@playwright/test';

const extraArgs = process.env.MIXTURE_BROWSER_ARGS
  ? JSON.parse(process.env.MIXTURE_BROWSER_ARGS) as string[]
  : [];

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
    baseURL: 'http://127.0.0.1:4173/player/',
    channel: 'chromium',
    headless: true,
    launchOptions: { args: ['--enable-unsafe-webgpu', '--ignore-gpu-blocklist', ...extraArgs] },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    url: 'http://127.0.0.1:4173/player/',
    reuseExistingServer: false,
    timeout: 30_000,
  },
});
