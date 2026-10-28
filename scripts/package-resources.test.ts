import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import {
  createPackage,
  createPackageWithOptions,
  uncache,
} from '@electron/asar';
import { expect, it } from 'vitest';
import { verifyPackageResources } from './package-resources.js';
import config from '../electron-builder.unsigned.json';

it('verifies nested runtime, Interface and unpacked native resources', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cbc-package-inspection-'));
  const source = join(root, 'fixture');
  const archive = join(root, 'app.asar');
  const files = [
    ...config.files.filter((file) => !file.includes('*')),
    'app/index.html',
    'app/jog/index.html',
    'app/upload.html',
    'app/generated/renderer.js',
    'app/generated/preview-worker.js',
    'app/lib/threejs/three.min.js',
    'app/lib/ace/src-noconflict/mode-cncpro.js',
    'app/icon.png',
    'app/favicon.ico',
    'app/img/CBC.svg',
    'app/wizards/interface/PROBE/example.gcode',
    'app/wizards/interface/PROFILESGRBL/example.gcode',
    'app/wizards/interface/PROFILESHAL/example.gcode',
    'node_modules/@serialport/bindings-cpp/prebuilds/test/node.napi.node',
  ];
  try {
    for (const file of files) {
      const body =
        file === 'package.json'
          ? JSON.stringify({ version: '0.1.0', cbcUnsignedVerification: true })
          : `fixture bytes for ${file}`;
      for (const directory of [root, source]) {
        const target = join(directory, file);
        await mkdir(dirname(target), { recursive: true });
        await writeFile(target, body);
      }
    }
    await createPackageWithOptions(source, archive, {
      unpack: '{**/*.node,esptool*}',
    });
    await expect(
      verifyPackageResources(root, archive),
    ).resolves.toBeUndefined();
  } finally {
    uncache(archive);
    await rm(root, { recursive: true, force: true });
  }
});

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
