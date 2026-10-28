import { EventEmitter } from 'node:events';
import { existsSync, readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';
import manifest from '../package.json';

describe('disabled application updates (without starting CONTROL)', () => {
  it.each(['applyUpdate', 'downloadUpdate'])(
    'rejects the legacy %s request without an updater, I/O or process access',
    (event) => {
      const source = readFileSync('index.js', 'utf8');
      const start = source.indexOf('  // Retain old client event names');
      const end = source.indexOf('  socket.on("flashGrbl"', start);
      expect(start).toBeGreaterThan(-1);
      expect(end).toBeGreaterThan(start);
      const socket = new EventEmitter();
      const response = vi.fn();
      socket.on('updatedata', response);
      // Only the actual socket registration is evaluated, with no require,
      // Electron, timers, network or updater available to the handlers.
      runInNewContext(source.slice(start, end), { socket });
      socket.emit(event, true);
      expect(response).toHaveBeenCalledExactlyOnceWith({
        command: 'autoupdate',
        response: 'CBC automatic updates are not configured.',
      });
    },
  );

  it('has no updater dependency, initialization, feed or publishing destination', () => {
    expect(manifest.dependencies).not.toHaveProperty('electron-updater');
    expect(manifest.build.publish).toBeNull();
    expect(existsSync('dev-app-update.yml')).toBe(false);
    const source = readFileSync('index.js', 'utf8');
    expect(source).not.toMatch(/autoUpdater|checkForUpdates|quitAndInstall/);
  });

  it('removes renderer release checks, countdowns and installation prompts', () => {
    expect(existsSync('app/js/updates.js')).toBe(false);
    for (const file of [
      'app/js/main.js',
      'app/js/websocket.js',
      'app/index.html',
      'app/jog/index.html',
    ]) {
      const source = readFileSync(file, 'utf8');
      expect(source).not.toMatch(
        /api\.github\.com\/repos\/OpenBuilds\/OpenBuilds-CONTROL|raw\.githubusercontent\.com\/OpenBuilds\/OpenBuilds-CONTROL/,
      );
      expect(source).not.toMatch(
        /getReleaseStats|getChangelog|js\/updates\.js|updateready|updateprogress|emit\(['"](?:applyUpdate|downloadUpdate)['"]|id="downloadUpdate"/,
      );
    }
  });

  it('explains the disabled update state in the existing application UI', () => {
    const html = readFileSync('app/index.html', 'utf8');
    expect(html).toContain('id="applicationUpdateStatus"');
    expect(html).toContain('CBC automatic updates are not configured.');
  });
});
