import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, expect, it, vi } from 'vitest';
import { buildBrowserAssets, watchBrowserAssets } from './browser-build.js';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

it('builds and watches renderer and worker entries without starting the app', async () => {
  const root = await mkdtemp(join(tmpdir(), 'cbc-browser-build-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  const renderer = join(root, 'src/renderer/legacy-entry.ts');
  const worker = join(root, 'app/lib/3dview/workers/verylitegcodeviewer.js');
  await mkdir(join(root, 'src/renderer'), { recursive: true });
  await mkdir(join(root, 'app/lib/3dview/workers'), { recursive: true });
  await writeFile(renderer, 'window.marker = "renderer-before";');
  await writeFile(worker, 'self.postMessage("worker-before");');
  await buildBrowserAssets(root);
  const output = (entry: string) =>
    readFile(join(root, `app/generated/${entry}.js`), 'utf8');
  expect(await output('renderer')).toContain('renderer-before');
  expect(await output('preview-worker')).toContain('worker-before');
  const watcher = await watchBrowserAssets(root);
  cleanups.push(() => watcher.dispose());
  await writeFile(renderer, 'window.marker = "renderer-after";');
  await writeFile(worker, 'self.postMessage("worker-after");');
  await vi.waitFor(
    async () => {
      expect(await output('renderer')).toContain('renderer-after');
      expect(await output('preview-worker')).toContain('worker-after');
    },
    { timeout: 10000 },
  );
});
