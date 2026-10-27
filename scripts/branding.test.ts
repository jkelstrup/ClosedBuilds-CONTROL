import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../package.json';
import { formatWindowTitle } from '../src/renderer/window-title.js';

describe('CBC branding (without starting CONTROL)', () => {
  it('retains version, filename and port in the native window title', () => {
    const source = readFileSync('app/js/main.js', 'utf8');
    const titleFunction = source.slice(
      source.indexOf('function setWindowTitle('),
      source.indexOf('function getReleaseStats('),
    );
    const document = { title: '' };
    const status = {
      driver: { version: manifest.version },
      comms: { interfaces: { activePort: '/dev/example' } },
    };
    runInNewContext(`${titleFunction}\nsetWindowTitle(laststatus);`, {
      document,
      window: { CBCWindowTitle: formatWindowTitle },
      laststatus: status,
      loadedFileName: 'example.nc',
      nostatusyet: false,
      $: () => ({ html: vi.fn() }),
    });
    expect(document.title).toBe(
      `CBC v${manifest.version} / example.nc / connected to /dev/example`,
    );
  });

  it.each([false, true])(
    'preserves profile paths (explicit override: %s)',
    (override) => {
      const source = readFileSync('index.js', 'utf8');
      const profileSetup = source.slice(
        source.indexOf('// Keep the existing profile'),
        source.indexOf('// Only the development launcher'),
      );
      const setPath = vi.fn();
      const setName = vi.fn();
      const mkdirSync = vi.fn();
      runInNewContext(profileSetup, {
        path,
        fs: { mkdirSync },
        electronApp: {
          commandLine: { hasSwitch: () => override },
          getPath: (name: string) =>
            name === 'userData'
              ? '/example/custom-profile'
              : '/example/app-data',
          setPath,
          setName,
        },
      });
      const profile = override
        ? '/example/custom-profile'
        : path.join('/example/app-data', 'OpenBuildsCONTROL');
      expect(mkdirSync).toHaveBeenCalledWith(profile, { recursive: true });
      expect(setPath).toHaveBeenCalledWith('userData', profile);
      expect(setPath).toHaveBeenCalledWith('sessionData', profile);
      expect(setName).toHaveBeenCalledWith('CBC');
      expect(manifest.build.productName).toBe('CBC');
      expect(manifest.build.appId).toBe('openbuilds.control');
    },
  );

  it('uses the supplied white SVG on the dark splash and CBC page titles', () => {
    const html = readFileSync('app/index.html', 'utf8');
    expect(html).toContain('<title>CBC</title>');
    expect(html).toContain('src="/img/CBC.svg" alt="CBC"');
    expect(readFileSync('app/img/CBC.svg', 'utf8')).toContain(
      'viewBox="0 0 256 233"',
    );
    expect(readFileSync('app/css/splash.css', 'utf8')).toContain(
      'background-color: #000',
    );
    expect(readFileSync('app/jog/index.html', 'utf8')).toContain(
      '<title>CBC</title>',
    );
  });
});
