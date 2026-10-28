import { defineConfig } from '@playwright/test';
import { requireDesktopSmokeOptIn } from './scripts/desktop-smoke.js';

requireDesktopSmokeOptIn(process.env, process.platform);

export default defineConfig({
  testDir: './tests/desktop',
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  timeout: 60000,
  outputDir: 'test-results/desktop',
});
