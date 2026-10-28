import { type ChildProcess } from 'node:child_process';
import { watch, type FSWatcher } from 'node:fs';
import { join } from 'node:path';

const mainFiles = new Set(['index.js', 'grblStrings.js', 'package.json']);

export function startDevSession(
  root: string,
  launch: () => ChildProcess,
  log: (message: string) => void,
  onExit: (code: number) => void,
): { stop: () => Promise<void> } {
  let child: ChildProcess | undefined;
  let stopping = false;
  let restarting = false;
  let pending: 'reload' | 'restart' | undefined;
  let debounce: NodeJS.Timeout | undefined;
  const watchers: FSWatcher[] = [];

  function send(type: string) {
    if (child?.connected) {
      child.send({ type }, (error) => {
        if (error && !stopping && !restarting) log(`IPC: ${error.message}`);
      });
    }
  }

  function start() {
    child = launch();
    child.once('error', (error) => {
      log(`Could not launch Electron: ${error.message}`);
      void stop().then(() => onExit(1));
    });
    child.once('close', (code) => {
      child = undefined;
      if (!stopping && !restarting) {
        void stop().then(() => onExit(code ?? 1));
      }
    });
  }

  async function closeChild() {
    const current = child;
    if (!current) return;
    await new Promise<void>((resolve) => {
      const timeout = setTimeout(() => current.kill('SIGKILL'), 5000);
      // Close follows exit and also covers spawn failures.
      current.once('close', () => {
        clearTimeout(timeout);
        resolve();
      });
      if (current.connected) send('control:quit');
      else current.kill();
    });
  }

  async function applyChange() {
    if (stopping || restarting) return;
    const action = pending;
    pending = undefined;
    if (action === 'restart') {
      restarting = true;
      log('Main-process change: restarting Electron');
      await closeChild();
      restarting = false;
      if (!stopping) start();
    } else if (action === 'reload') {
      log(
        'Frontend change: reloading window (unsaved editor contents are lost)',
      );
      send('control:reload');
    }
    if (pending && !stopping) schedule(pending);
  }

  function schedule(action: 'reload' | 'restart') {
    if (stopping) return;
    if (action === 'restart' || !pending) pending = action;
    clearTimeout(debounce);
    debounce = setTimeout(() => {
      void applyChange();
    }, 200);
  }

  async function stop() {
    stopping = true;
    clearTimeout(debounce);
    for (const watcher of watchers) watcher.close();
    await closeChild();
  }

  try {
    watchers.push(
      watch(join(root, 'app'), { recursive: true }, (_event, filename) => {
        if (
          !filename ||
          /\.(html|css|js|json|svg|png|jpe?g|gif|ico|woff2?|ttf)$/i.test(
            filename,
          )
        ) {
          schedule('reload');
        }
      }),
    );
    watchers.push(
      watch(root, (_event, filename) => {
        if (!filename || mainFiles.has(filename)) schedule('restart');
      }),
    );
    for (const watcher of watchers) {
      watcher.on('error', (error) => {
        log(`Watcher failed: ${error.message}`);
        void stop().then(() => onExit(1));
      });
    }
    start();
  } catch (error) {
    for (const watcher of watchers) watcher.close();
    throw error;
  }

  return { stop };
}
