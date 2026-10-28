import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { expect, it } from 'vitest';
import {
  findPackagedExecutable,
  requireDesktopSmokeOptIn,
} from './desktop-smoke.js';

it('requires explicit opt-in on every platform', () => {
  for (const platform of ['darwin', 'linux', 'win32'] as const) {
    expect(() => requireDesktopSmokeOptIn({}, platform)).toThrow(
      'explicitly set CBC_DESKTOP_SMOKE=1',
    );
  }
});

it('permits opted-in macOS/Linux checks but rejects unsupported hosts', () => {
  const env = { CBC_DESKTOP_SMOKE: '1' };
  requireDesktopSmokeOptIn(env, 'darwin');
  requireDesktopSmokeOptIn(env, 'linux');
  expect(() => requireDesktopSmokeOptIn(env, 'freebsd')).toThrow(
    'do not support freebsd',
  );
});

it('restricts Windows login-setting effects to disposable hosted runners', () => {
  for (const env of [
    { CBC_DESKTOP_SMOKE: '1' },
    { CBC_DESKTOP_SMOKE: '1', GITHUB_ACTIONS: 'true' },
    {
      CBC_DESKTOP_SMOKE: '1',
      GITHUB_ACTIONS: 'true',
      RUNNER_ENVIRONMENT: 'self-hosted',
    },
  ]) {
    expect(() => requireDesktopSmokeOptIn(env, 'win32')).toThrow(
      'disposable GitHub-hosted runner',
    );
  }
  requireDesktopSmokeOptIn(
    {
      CBC_DESKTOP_SMOKE: '1',
      GITHUB_ACTIONS: 'true',
      RUNNER_ENVIRONMENT: 'github-hosted',
    },
    'win32',
  );
});

it.each([
  [
    'darwin',
    'mac-arm64/CBC.app/Contents/Resources/app.asar',
    'mac-arm64/CBC.app/Contents/MacOS/CBC',
  ],
  ['win32', 'win-unpacked/resources/app.asar', 'win-unpacked/CBC.exe'],
  [
    'linux',
    'linux-unpacked/resources/app.asar',
    'linux-unpacked/openbuildscontrol',
  ],
] as const)(
  'discovers the %s executable and fails if it is missing',
  async (platform, archive, executable) => {
    const output = await mkdtemp(join(tmpdir(), 'cbc-desktop-package-'));
    try {
      await mkdir(dirname(join(output, archive)), { recursive: true });
      await writeFile(join(output, archive), 'archive fixture');
      expect(() => findPackagedExecutable(output, platform)).toThrow();
      await mkdir(dirname(join(output, executable)), { recursive: true });
      await writeFile(join(output, executable), 'executable fixture', {
        mode: 0o755,
      });
      expect(findPackagedExecutable(output, platform)).toBe(
        join(output, executable),
      );
      const second = join(output, 'extra/resources/app.asar');
      await mkdir(dirname(second), { recursive: true });
      await writeFile(second, 'ambiguous archive');
      expect(() => findPackagedExecutable(output, platform)).toThrow(
        'exactly one',
      );
    } finally {
      await rm(output, { recursive: true, force: true });
    }
  },
);
