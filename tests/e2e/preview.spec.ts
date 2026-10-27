import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';

// Intercept an inert page and only the worker's two shipped assets. No app
// startup, sockets, controller polling, or external network requests are needed.
test('shipped preview worker loads Three.js and returns linear toolpath data', async ({
  context,
  page,
}) => {
  const origin = 'http://preview.test';
  const assets = new Map([
    [
      '/lib/3dview/workers/verylitegcodeviewer.js',
      'app/lib/3dview/workers/verylitegcodeviewer.js',
    ],
    ['/lib/threejs/three.min.js', 'app/lib/threejs/three.min.js'],
  ]);
  const loaded: string[] = [];
  const unexpected: string[] = [];
  await context.route('**/*', async (route) => {
    const url = new URL(route.request().url());
    if (url.origin === origin && url.pathname === '/') {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><title>Preview worker check</title>',
      });
      return;
    }
    const asset = url.origin === origin ? assets.get(url.pathname) : undefined;
    if (asset) {
      loaded.push(url.pathname);
      await route.fulfill({
        contentType: 'application/javascript',
        body: await readFile(resolve(asset)),
      });
      return;
    }
    unexpected.push(url.href);
    await route.abort();
  });
  await page.goto(origin);
  const result = await page.evaluate(async () => {
    const worker = new Worker('lib/3dview/workers/verylitegcodeviewer.js');
    try {
      return await new Promise<unknown>((resolve, reject) => {
        worker.onerror = (event) => reject(new Error(event.message));
        worker.onmessage = (event: MessageEvent<unknown>) => {
          if (typeof event.data === 'string') {
            try {
              resolve(JSON.parse(event.data) as unknown);
            } catch (error) {
              reject(error instanceof Error ? error : new Error(String(error)));
            }
          }
        };
        worker.postMessage({ data: 'G21\nG90\nG0 X0 Y0 Z0\nG1 X3 Y4 F600' });
      });
    } finally {
      worker.terminate();
    }
  });
  expect(result).toMatchObject({ inch: false, totalDist: 5 });
  expect(result).toHaveProperty(
    'linePoints',
    expect.arrayContaining([
      expect.objectContaining({ x: 3, y: 4, z: 0, g: 1 }),
    ]),
  );
  expect(loaded.sort()).toEqual([...assets.keys()].sort());
  expect(unexpected).toEqual([]);
});
