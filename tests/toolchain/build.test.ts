import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createRequire } from 'node:module';
import { afterEach, expect, test } from 'vitest';

const resolveFromRoot = createRequire(resolve('package.json'));
const compiler = resolveFromRoot.resolve('typescript/bin/tsc');
const directories: string[] = [];

afterEach(() => {
  for (const directory of directories.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function fixture(source: string) {
  const directory = mkdtempSync(join(tmpdir(), 'control-toolchain-'));
  directories.push(directory);
  // Match the legacy package's CommonJS runtime, regardless of temp directory.
  writeFileSync(join(directory, 'package.json'), '{"type":"commonjs"}');
  writeFileSync(join(directory, 'example.ts'), source);
  writeFileSync(
    join(directory, 'tsconfig.json'),
    JSON.stringify({
      extends: resolve('tsconfig.json'),
      compilerOptions: {
        rootDir: directory,
        outDir: join(directory, 'output'),
        types: [],
      },
      include: ['example.ts'],
    }),
  );
  return directory;
}

test('compiled TypeScript is callable from legacy CommonJS without app startup', () => {
  const directory = fixture('export const answer: number = 42;');
  execFileSync(process.execPath, [compiler, '-p', directory]);
  const output = join(directory, 'output/example.js');
  expect(readFileSync(output, 'utf8')).toContain('exports.answer');
  expect(
    execFileSync(
      process.execPath,
      ['-e', `console.log(require(${JSON.stringify(output)}).answer)`],
      {
        encoding: 'utf8',
      },
    ).trim(),
  ).toBe('42');
});

test.each([
  ['type mismatch', 'export const answer: number = "wrong";', 'TS2322'],
  ['nullability', 'export const answer: number = null;', 'TS2322'],
  [
    'unchecked array access',
    'export const answer: number = [42][0];',
    'TS2322',
  ],
  ['implicit any', 'export function answer(value) { return value; }', 'TS7006'],
])('%s fails without emitting runnable output', (_name, source, diagnostic) => {
  const directory = fixture(source);
  const result = spawnSync(process.execPath, [compiler, '-p', directory], {
    encoding: 'utf8',
  });
  expect(result.error).toBeUndefined();
  expect(result.status).not.toBe(0);
  expect(result.stdout).toContain(diagnostic);
  expect(() => readFileSync(join(directory, 'output/example.js'))).toThrow();
});
