import { defineConfig, devices } from '@playwright/test';

const ci = Boolean(process.env.CI);
const NEXT = 'http://127.0.0.1:4001';
const HUB = 'http://127.0.0.1:4002';

// Apps must be built first (`pnpm build`); the servers here only serve the output.
export default defineConfig({
  testDir: '.',
  outputDir: '../test-results',
  forbidOnly: ci,
  retries: ci ? 1 : 0,
  reporter: ci
    ? [['list'], ['html', { outputFolder: '../playwright-report', open: 'never' }]]
    : 'list',
  use: { ...devices['Desktop Chrome'], trace: 'retain-on-failure' },
  expect: { toHaveScreenshot: { animations: 'disabled', caret: 'hide' } },
  projects: [
    { name: 'next-example', testMatch: 'next-example.spec.ts', use: { baseURL: NEXT } },
    { name: 'hub', testMatch: 'hub.spec.ts', use: { baseURL: HUB } },
    { name: 'harness', testMatch: /(axe-harness|tokens-cascade)\.spec\.ts/ },
  ],
  webServer: [
    { command: 'pnpm --filter next-example start', url: NEXT, reuseExistingServer: !ci },
    { command: 'pnpm --filter hub preview', url: HUB, reuseExistingServer: !ci },
  ],
});
