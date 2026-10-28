import { mkdtempSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { findUnsignedArchive } from './package-resources.js';

const directories: string[] = [];
afterEach(() => {
  for (const directory of directories.splice(0))
    rmSync(directory, { recursive: true, force: true });
});

function fixture() {
  const root = mkdtempSync(join(tmpdir(), 'cbc-package-discovery-'));
  directories.push(root);
  return root;
}

function archive(root: string, layout: string) {
  const file = join(root, layout, 'app.asar');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, 'fixture');
  return file;
}

describe('unsigned archive discovery', () => {
  it.each([
    'mac-arm64/CBC.app/Contents/Resources',
    'mac/CBC.app/Contents/Resources',
    'linux-unpacked/resources',
    'win-unpacked/resources',
  ])('finds the sole archive in %s', (layout) => {
    const root = fixture();
    const expected = archive(root, layout);
    expect(findUnsignedArchive(root)).toBe(expected);
  });

  it('rejects missing output and empty output instead of skipping verification', () => {
    const root = fixture();
    expect(() => findUnsignedArchive(join(root, 'missing'))).toThrow();
    expect(() => findUnsignedArchive(root)).toThrow('exactly one');
  });

  it('rejects ambiguous output rather than verifying an arbitrary stale package', () => {
    const root = fixture();
    archive(root, 'mac/CBC.app/Contents/Resources');
    archive(root, 'mac-arm64/CBC.app/Contents/Resources');
    expect(() => findUnsignedArchive(root)).toThrow('explicit archive path');
  });
});
