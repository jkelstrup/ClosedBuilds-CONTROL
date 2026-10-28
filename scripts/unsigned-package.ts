import { resolve } from 'node:path';

export function unsignedPackageInvocation(
  root: string,
  environment: NodeJS.ProcessEnv,
) {
  const env: NodeJS.ProcessEnv = {};
  for (const [key, value] of Object.entries(environment)) {
    if (
      !/^(CSC_|WIN_CSC_|APPLE_)/i.test(key) &&
      !['GH_TOKEN', 'GITHUB_TOKEN', 'BT_TOKEN'].includes(key.toUpperCase())
    ) {
      env[key] = value;
    }
  }
  env['CSC_IDENTITY_AUTO_DISCOVERY'] = 'false';
  return {
    args: [
      '--config',
      resolve(root, 'electron-builder.unsigned.json'),
      '--dir',
      '--publish',
      'never',
    ],
    env,
  };
}
