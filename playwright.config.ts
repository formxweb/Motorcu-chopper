import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 90_000,
  expect: { timeout: 15_000 },
  workers: 1,
  fullyParallel: false,
  retries: 0,
  reporter: [['list'], ['json', { outputFile: 'out/e2e-sonuc.json' }]],
  outputDir: 'out/test-results',
  use: {
    baseURL: process.env.APP_URL || 'http://localhost:3000',
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    screenshot: 'only-on-failure',
    trace: 'off',
    viewport: { width: 1366, height: 900 },
  },
});
