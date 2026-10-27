import js from '@eslint/js';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'test-results/**',
      'playwright-report/**',
    ],
  },
  {
    files: [
      'scripts/**/*.ts',
      'tests/toolchain/**/*.ts',
      'tests/e2e/**/*.ts',
      'playwright.config.ts',
      'vitest.config.mts',
    ],
    extends: [
      js.configs.recommended,
      ...tseslint.configs.recommendedTypeChecked,
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.json', './tsconfig.e2e.json'],
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
);
