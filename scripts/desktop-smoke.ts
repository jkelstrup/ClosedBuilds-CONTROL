import { accessSync, constants } from 'node:fs';
import { dirname, join } from 'node:path';
import { findUnsignedArchive } from './package-resources.js';

export function requireDesktopSmokeOptIn(
  env: NodeJS.ProcessEnv,
  platform: NodeJS.Platform,
): void {
  if (env['CBC_DESKTOP_SMOKE'] !== '1') {
    throw new Error(
      'Desktop smoke checks start machine-control services. Disconnect controllers, use a trusted isolated network, then explicitly set CBC_DESKTOP_SMOKE=1.',
    );
  }
  if (!['darwin', 'linux', 'win32'].includes(platform)) {
    throw new Error(`Desktop startup smoke checks do not support ${platform}`);
  }
  if (
    platform === 'win32' &&
    (env['GITHUB_ACTIONS'] !== 'true' ||
      env['RUNNER_ENVIRONMENT'] !== 'github-hosted')
  ) {
    throw new Error(
      'Windows startup modifies login settings; desktop smoke checks require a disposable GitHub-hosted runner.',
    );
  }
}

export function findPackagedExecutable(
  output: string,
  platform: NodeJS.Platform,
): string {
  const resources = dirname(findUnsignedArchive(output));
  let executable: string;
  switch (platform) {
    case 'darwin':
      executable = join(resources, '../MacOS/CBC');
      break;
    case 'win32':
      executable = join(resources, '../CBC.exe');
      break;
    case 'linux':
      executable = join(resources, '../openbuildscontrol');
      break;
    default:
      throw new Error(`Unsupported package platform: ${platform}`);
  }
  accessSync(executable, constants.X_OK);
  return executable;
}
