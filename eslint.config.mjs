import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'test-results/**',
      'playwright-report/**',
      'app/generated/**',
    ],
  },
  {
    files: [
      'scripts/**/*.ts',
      'src/renderer/**/*.ts',
      'src/machine/**/*.ts',
      'tests/toolchain/**/*.ts',
      'tests/e2e/**/*.ts',
      'tests/desktop/**/*.ts',
      'playwright.config.ts',
      'playwright.desktop.config.ts',
      'vitest.config.mts',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: [
          './tsconfig.json',
          './tsconfig.e2e.json',
          './tsconfig.renderer.json',
        ],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
