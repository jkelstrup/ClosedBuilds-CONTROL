import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/toolchain/**/*.test.ts', 'scripts/**/*.test.ts'],
    testTimeout: 30000,
  },
});
