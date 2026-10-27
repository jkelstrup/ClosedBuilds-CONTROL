import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { startDevSession } from './dev-session.js';

const root = resolve(__dirname, '../../..');
const electronPath: unknown = createRequire(__filename)('electron');
assert(typeof electronPath === 'string');

const session = startDevSession(
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
  },
);

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.once(signal, () => {
    void session.stop().then(() => {
      process.exitCode = 0;
    });
  });
}

console.log(
  '[dev] Watching app/ and main-process sources. Ctrl+C stops Electron.',
);
