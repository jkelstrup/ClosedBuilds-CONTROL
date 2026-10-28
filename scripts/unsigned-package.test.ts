import { resolve } from 'node:path';
import { describe, expect, expectTypeOf, it } from 'vitest';
import type { Configuration } from 'electron-builder';
import config from '../electron-builder.unsigned.json';
import { unsignedPackageInvocation } from './unsigned-package.js';

describe('unsigned packaging boundary', () => {
  it('matches the installed builder configuration types', () => {
    expectTypeOf(config).toExtend<Configuration>();
  });

  it('selects only the independent config, host directory target and never-publish policy', () => {
    const invocation = unsignedPackageInvocation('.', {});
    expect(invocation.args).toEqual([
      '--config',
      resolve('electron-builder.unsigned.json'),
      '--dir',
      '--publish',
      'never',
    ]);
    expect(config.extends).toBeNull();
    expect(config.publish).toBeNull();
    expect(config.afterSign).toBeNull();
    expect(config.mac.identity).toBeNull();
    expect(config.mac.notarize).toBe(false);
    expect(config.win.signtoolOptions.sign).toBeNull();
    expect(config.win).not.toHaveProperty('sign');
    expect(config.win.signAndEditExecutable).toBe(false);
    expect(config.forceCodeSigning).toBe(false);
    expect(config.extraMetadata.cbcUnsignedVerification).toBe(true);
    expect(config.files).toContain('app/**/*');
    expect(config.files).not.toContain('**/*');
    expect(config.files).not.toContain('dev-app-update.yml');
    expect(config.asarUnpack).toContain('**/*.node');
  });

  it('removes signing/publishing credentials without changing the parent environment', () => {
    const environment = {
      PATH: '/example',
      CSC_LINK: 'secret',
      WIN_CSC_LINK: 'secret',
      APPLE_ID: 'secret',
      GH_TOKEN: 'secret',
      GITHUB_TOKEN: 'secret',
      BT_TOKEN: 'secret',
      CSC_IDENTITY_AUTO_DISCOVERY: 'true',
    };
    expect(unsignedPackageInvocation('.', environment).env).toEqual({
      PATH: '/example',
      CSC_IDENTITY_AUTO_DISCOVERY: 'false',
    });
    expect(environment.CSC_LINK).toBe('secret');
  });
});
