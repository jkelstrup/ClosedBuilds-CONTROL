import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  timeout: 15000,
  use: {
    browserName: 'chromium',
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
});
