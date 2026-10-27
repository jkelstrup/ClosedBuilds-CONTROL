import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { startDevSession } from './dev-session.js';
import { watchBrowserAssets } from './browser-build.js';

const root = resolve(__dirname, '../../..');
async function main() {
  const electronPath: unknown = createRequire(__filename)('electron');
  assert(typeof electronPath === 'string');
  const browserBuild = await watchBrowserAssets(root);
  let session: ReturnType<typeof startDevSession>;
  try {
    session = startDevSession(
      root,
      () =>
        spawn(electronPath, ['.', ...process.argv.slice(2)], {
          cwd: root,
          env: { ...process.env, CONTROL_DEV_RELOAD: '1' },
          stdio: ['inherit', 'inherit', 'inherit', 'ipc'],
        }),
      (message) => console.log(`[dev] ${message}`),
      (code) => {
        process.exitCode = code;
        void browserBuild.dispose();
      },
    );
  } catch (error) {
    await browserBuild.dispose();
    throw error;
  }

  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.once(signal, () => {
      void session.stop().then(() => {
        process.exitCode = 0;
        return browserBuild.dispose();
      });
    });
  }

  console.log(
    '[dev] Building browser sources; watching app/ and main-process sources. Ctrl+C stops Electron.',
  );
}

void main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
