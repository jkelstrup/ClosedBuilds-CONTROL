import { defineConfig } from '@playwright/test';

if (process.env['CBC_DESKTOP_SMOKE'] !== '1') {
  throw new Error(
    'Desktop smoke checks start machine-control services. Disconnect controllers, use a trusted isolated network, then explicitly set CBC_DESKTOP_SMOKE=1.',
  );
}
if (process.platform !== 'darwin') {
  throw new Error(
    'Desktop startup smoke checks are currently scoped to macOS; Windows startup can modify login settings.',
  );
}

export default defineConfig({
  testDir: './tests/desktop',
  workers: 1,
  forbidOnly: Boolean(process.env['CI']),
  retries: 0,
  timeout: 60000,
  outputDir: 'test-results/desktop',
});
