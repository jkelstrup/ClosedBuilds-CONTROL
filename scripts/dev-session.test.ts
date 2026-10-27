import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtemp, mkdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { startDevSession } from './dev-session.js';

const cleanups: (() => Promise<void>)[] = [];
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup();
});

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'control-dev-'));
  cleanups.push(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, 'app', 'nested'), { recursive: true });
  const messages: unknown[] = [];
  const children: ChildProcess[] = [];
  const exit = vi.fn<(code: number) => void>();
  const log = vi.fn<(message: string) => void>();
  const session = startDevSession(
    root,
    () => {
      const child = spawn(
        process.execPath,
        [
          '-e',
          `process.on('message', message => {
            process.send(message);
            if (message.type === 'control:quit') process.exit(0);
          });
          process.send({type: 'ready'});`,
        ],
        { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] },
      );
      child.on('message', (message: unknown) => messages.push(message));
      children.push(child);
      return child;
    },
    log,
    exit,
  );
  cleanups.push(session.stop);
  await vi.waitFor(() => expect(messages).toContainEqual({ type: 'ready' }));
  return { root, messages, children, session, exit, log };
}

describe('development watcher (with isolated Node children, not CONTROL)', () => {
  it('reloads nested frontend edits without restarting; ignores unrelated files', async () => {
    const f = await fixture();
    await writeFile(join(f.root, 'app', 'nested', 'style.css'), 'body {}');
    await vi.waitFor(() =>
      expect(f.messages).toContainEqual({ type: 'control:reload' }),
    );
    expect(f.children).toHaveLength(1);
    f.messages.length = 0;
    await writeFile(join(f.root, 'notes.md'), 'unrelated');
    await writeFile(join(f.root, 'app', 'editor.swp'), 'temporary');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(f.messages).toEqual([]);
  });

  it('coalesces saves and prioritizes a main restart over a frontend reload', async () => {
    const f = await fixture();
    await writeFile(join(f.root, 'index.js'), '// main');
    await writeFile(join(f.root, 'grblStrings.js'), '// dependency');
    await writeFile(join(f.root, 'app', 'index.html'), '<html>');
    await vi.waitFor(() => expect(f.children).toHaveLength(2));
    expect(f.children[0]?.exitCode).toBe(0);
    expect(f.messages).toContainEqual({ type: 'control:quit' });
    expect(f.messages).not.toContainEqual({ type: 'control:reload' });
    expect(f.exit).not.toHaveBeenCalled();
  });

  it('stops the child and watchers without starting another process', async () => {
    const f = await fixture();
    await f.session.stop();
    expect(f.children[0]?.exitCode).toBe(0);
    await writeFile(join(f.root, 'index.js'), '// after stop');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(f.children).toHaveLength(1);
    expect(f.exit).not.toHaveBeenCalled();
  });

  it('closes watchers when the application quits on its own', async () => {
    const f = await fixture();
    f.children[0]?.send({ type: 'control:quit' });
    await vi.waitFor(() => expect(f.exit).toHaveBeenCalledWith(0));
    await writeFile(join(f.root, 'index.js'), '// after quit');
    await new Promise((resolve) => setTimeout(resolve, 350));
    expect(f.children).toHaveLength(1);
  });

  it('reports spawn failures and releases the watchers', async () => {
    const root = await mkdtemp(join(tmpdir(), 'control-dev-failure-'));
    cleanups.push(() => rm(root, { recursive: true, force: true }));
    await mkdir(join(root, 'app'));
    const exit = vi.fn<(code: number) => void>();
    const log = vi.fn<(message: string) => void>();
    const session = startDevSession(
      root,
      () => spawn(join(root, 'missing-executable'), [], { stdio: 'ignore' }),
      log,
      exit,
    );
    cleanups.push(session.stop);
    await vi.waitFor(() => expect(exit).toHaveBeenCalledWith(1));
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('Could not launch'),
    );
    await session.stop();
  });
});
