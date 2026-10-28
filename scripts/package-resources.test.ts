import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { createPackage, uncache } from '@electron/asar';
import { expect, it } from 'vitest';
import { verifyPackageResources } from './package-resources.js';

it.each([
  {
    file: 'package.json',
    body: '{"version":"0.1.0"}',
    error: 'Not an unsigned verification package',
  },
  {
    file: '.github/workflows/leaked.yml',
    body: 'name: unexpected',
    error: 'Development files leaked into the package',
  },
  {
    file: 'dev-app-update.yml',
    body: 'provider: github',
    error: 'Development update feed leaked into package',
  },
  {
    file: 'node_modules/electron-updater/package.json',
    body: '{"name":"electron-updater"}',
    error: 'Disabled application updater leaked into package',
  },
  {
    file: 'node_modules/ip/package.json',
    body: '{"name":"ip"}',
    error: 'Retired ip dependency leaked into package',
  },
])('rejects unsafe artifact contents: $file', async ({ file, body, error }) => {
  const root = await mkdtemp(join(tmpdir(), 'cbc-package-inspection-'));
  const source = join(root, 'fixture');
  const archive = join(root, 'app.asar');
  try {
    await mkdir(dirname(join(source, file)), { recursive: true });
    await writeFile(join(source, file), body);
    await createPackage(source, archive);
    await expect(verifyPackageResources(root, archive)).rejects.toThrow(error);
  } finally {
    uncache(archive);
    await rm(root, { recursive: true, force: true });
  }
});
