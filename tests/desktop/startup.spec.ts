import { mkdtemp, mkdir, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { createServer } from 'node:net';
import { expect, test, type ElectronApplication } from '@playwright/test';
import manifest from '../../package.json';

async function availablePort(port = 0): Promise<number> {
  const server = createServer();
  return await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, () => {
      const address = server.address();
      server.close((error) => {
        if (error) reject(error);
        else if (address && typeof address === 'object') resolve(address.port);
        else reject(new Error('No TCP address assigned'));
      });
    });
  });
}

test('desktop startup serves generated assets with no controller connection', async ({
  playwright,
  request,
}, testInfo) => {
  // HTTPS is fixed in the legacy app. Fail before launch rather than collide
  // with another instance (the disposable profile does not isolate its ports).
  await availablePort(3001);
  const port = await availablePort();
  const profile = await mkdtemp(join(tmpdir(), 'cbc-desktop-smoke-'));
  await mkdir(join(profile, 'upload'));
  const executable = process.env['CBC_PACKAGED_EXECUTABLE'];
  const env = Object.fromEntries(
    Object.entries(process.env).filter(
      (entry): entry is [string, string] => typeof entry[1] === 'string',
    ),
  );
  delete env['ELECTRON_RUN_AS_NODE'];
  env['WEB_PORT'] = String(port);
  let application: ElectronApplication | undefined;
  try {
    application = await playwright._electron.launch({
      ...(executable ? { executablePath: resolve(executable) } : {}),
      cwd: process.cwd(),
      args: [
        ...(executable ? [] : ['.']),
        `--user-data-dir=${profile}`,
        '--host-resolver-rules=MAP * ~NOTFOUND, EXCLUDE localhost',
      ],
      env,
      timeout: 30000,
    });
    const runtime = await application.evaluate(({ app }) => ({
      packaged: app.isPackaged,
      profile: app.getPath('userData'),
      appPath: app.getAppPath(),
      electron: process.versions.electron,
    }));
    expect(runtime.packaged).toBe(Boolean(executable));
    expect(runtime.electron).toBe(manifest.devDependencies.electron);
    expect(await realpath(runtime.profile)).toBe(await realpath(profile));
    if (executable) expect(runtime.appPath).toContain('app.asar');
    const page = await application.firstWindow();
    await page.waitForURL(`http://localhost:${port}/`);
    await expect(page).toHaveTitle(
      new RegExp(`^CBC v${manifest.version.replaceAll('.', '\\.')}`),
    );
    await expect
      .poll(() => page.evaluate<unknown>('laststatus.comms.connectionStatus'))
      .toBe(0);
    await expect
      .poll(() => page.evaluate<unknown>('typeof window.CBCWindowTitle'))
      .toBe('function');
    for (const path of [
      '/generated/renderer.js',
      '/generated/preview-worker.js',
      '/lib/threejs/three.min.js',
      '/lib/ace/src-noconflict/mode-cncpro.js',
      '/img/CBC.svg',
      '/jog/',
    ]) {
      const response = await request.get(`http://localhost:${port}${path}`);
      expect(response.status(), path).toBe(200);
      expect((await response.body()).length, path).toBeGreaterThan(0);
    }
    const toolpath = await page.evaluate(async () => {
      const worker = new Worker('/generated/preview-worker.js');
      try {
        return await new Promise<unknown>((resolve, reject) => {
          worker.onerror = (event) => reject(new Error(event.message));
          worker.onmessage = (event: MessageEvent<unknown>) => {
            if (typeof event.data === 'string')
              resolve(JSON.parse(event.data) as unknown);
          };
          worker.postMessage({ data: 'G21\nG90\nG0 X0 Y0 Z0\nG1 X3 Y4 F600' });
        });
      } finally {
        worker.terminate();
      }
    });
    expect(toolpath).toMatchObject({ inch: false, totalDist: 5 });
    await expect(page.locator('#splash')).toBeHidden({ timeout: 10000 });
    await page.screenshot({ path: testInfo.outputPath('desktop.png') });
  } finally {
    try {
      if (application) {
        const child = application.process();
        const killTimer = setTimeout(() => child.kill('SIGKILL'), 5000);
        try {
          await application.close();
          await availablePort(3001);
          await availablePort(port);
        } finally {
          clearTimeout(killTimer);
          if (child.exitCode === null && child.signalCode === null) {
            child.kill('SIGKILL');
            await new Promise<void>((resolve) =>
              child.once('close', () => resolve()),
            );
          }
        }
      }
    } finally {
      await rm(profile, { recursive: true, force: true });
    }
  }
});
