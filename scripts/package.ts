import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';
import { unsignedPackageInvocation } from './unsigned-package.js';

if (process.argv.length > 2) {
  throw new Error(
    'Unsigned packaging accepts no overrides; signing/publishing are disabled.',
  );
}
const root = resolve(__dirname, '../../..');
const invocation = unsignedPackageInvocation(root, process.env);
const result = spawnSync(
  process.execPath,
  [require.resolve('electron-builder/out/cli/cli.js'), ...invocation.args],
  {
    cwd: root,
    env: invocation.env,
    stdio: 'inherit',
  },
);
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
