import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, test } from 'vitest';

test('Windows-style Git checkout preserves LF in formatting-checked files', () => {
  const directory = mkdtempSync(join(tmpdir(), 'cbc-checkout-'));
  const paths = [
    'scripts/verify-install.ts',
    'package.json',
    '.github/workflows/check.yml',
  ];
  const git = (...args: string[]) =>
    execFileSync('git', ['-c', 'core.autocrlf=true', ...args], {
      cwd: directory,
      encoding: 'utf8',
    });
  try {
    git('init', '--quiet');
    if (existsSync('.gitattributes')) {
      writeFileSync(
        join(directory, '.gitattributes'),
        readFileSync('.gitattributes'),
      );
      git('add', '.gitattributes');
    }
    for (const path of paths) {
      const target = join(directory, path);
      mkdirSync(dirname(target), { recursive: true });
      writeFileSync(target, readFileSync(path));
      git('add', path);
      rmSync(target);
    }
    git('checkout-index', '--all', '--force');
    for (const path of paths) {
      expect(readFileSync(join(directory, path), 'utf8'), path).not.toContain(
        '\r\n',
      );
    }
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});
