import assert from 'node:assert/strict';
import { readFile, readdir, access } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { extractFile, listPackage, statFile } from '@electron/asar';

const requiredFiles = [
  'index.js',
  'grblStrings.js',
  'LICENSE',
  'CHANGELOG.txt',
  'privkey1.pem',
  'fullchain1.pem',
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
];

export async function verifyPackageResources(
  root: string,
  archive: string,
): Promise<void> {
  const entries = listPackage(archive, { isPack: false });
  assert(
    !entries.some((entry) =>
      /^\/(scripts|src|tests|docs|\.github|dist)(\/|$)/.test(entry),
    ),
    'Development files leaked into the package',
  );
  assert(
    !entries.includes('/dev-app-update.yml'),
    'Development update feed leaked into package',
  );
  const manifest: unknown = JSON.parse(
    extractFile(archive, 'package.json').toString(),
  );
  assert(
    manifest &&
      typeof manifest === 'object' &&
      'cbcUnsignedVerification' in manifest &&
      manifest.cbcUnsignedVerification === true,
    'Not an unsigned verification package',
  );
  const sourceManifest: unknown = JSON.parse(
    await readFile(join(root, 'package.json'), 'utf8'),
  );
  assert(
    sourceManifest &&
      typeof sourceManifest === 'object' &&
      'version' in sourceManifest,
  );
  assert(
    'version' in manifest && manifest.version === sourceManifest.version,
    'Package version is stale',
  );
  const rootResources = (await readdir(root)).filter(
    (name) =>
      /\.(bin|hex)$/.test(name) || /^esptool(?:-linux|-mac|\.exe)$/.test(name),
  );
  for (const file of [...requiredFiles, ...rootResources]) {
    assert(
      extractFile(archive, file).equals(await readFile(join(root, file))),
      `Missing or stale packaged resource: ${file}`,
    );
    if (file.endsWith('.bin') || file.startsWith('esptool')) {
      const entry = statFile(archive, file);
      assert(
        'unpacked' in entry && entry.unpacked,
        `Resource must be outside ASAR: ${file}`,
      );
      await access(`${archive}.unpacked/${file}`);
    }
  }
  for (const directory of ['PROBE', 'PROFILESGRBL', 'PROFILESHAL']) {
    for (const name of await readdir(
      join(root, 'app/wizards/interface', directory),
    )) {
      const file = `app/wizards/interface/${directory}/${name}`;
      assert(
        extractFile(archive, file).equals(await readFile(join(root, file))),
        `Missing or stale Interface resource: ${file}`,
      );
    }
  }
  assert(
    entries.some(
      (entry) => entry.endsWith('.node') && entry.includes('bindings-cpp'),
    ),
    'Native serial binding missing',
  );
  for (const entry of entries.filter((entry) => entry.endsWith('.node'))) {
    const stat = statFile(archive, entry.slice(1));
    assert(
      'unpacked' in stat && stat.unpacked,
      `Native binding not unpacked: ${entry}`,
    );
    await access(`${archive}.unpacked${entry}`);
  }
  await assert.rejects(access(join(dirname(archive), 'app-update.yml')), {
    code: 'ENOENT',
  });
}
