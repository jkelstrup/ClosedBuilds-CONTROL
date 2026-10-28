import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { EventEmitter } from 'node:events';
import { describe, expect, expectTypeOf, it, vi } from 'vitest';
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

  it.each([false, true])(
    'only enables the legacy updater outside verification packages (marker: %s)',
    (unsigned) => {
      const source = readFileSync('index.js', 'utf8');
      const setup = source.slice(
        source.indexOf('var updateIsDownloading = false;'),
        source.indexOf('  var uploadsDir ='),
      );
      const on = vi.fn();
      const requireModule = vi.fn((name: string) => {
        if (name === './package') return { cbcUnsignedVerification: unsigned };
        if (name === 'electron-updater' && !unsigned)
          return { autoUpdater: { on } };
        throw new Error(`Unexpected import: ${name}`);
      });
      // The next uploads conditional is excluded; no startup/import of index.js.
      runInNewContext(
        `var autoUpdater;\n${setup.slice(0, setup.lastIndexOf('if (isElectron())'))}`,
        { isElectron: () => true, require: requireModule, debug_log: vi.fn() },
      );
      expect(on.mock.calls.length > 0).toBe(!unsigned);
    },
  );

  it('ignores applyUpdate when an unsigned build has no updater', () => {
    const source = readFileSync('index.js', 'utf8');
    const handler = source.slice(
      source.indexOf('  socket.on("applyUpdate"'),
      source.indexOf('  socket.on("downloadUpdate"'),
    );
    const socket = new EventEmitter();
    runInNewContext(handler, { socket, autoUpdater: undefined });
    expect(() => socket.emit('applyUpdate')).not.toThrow();
  });
});
