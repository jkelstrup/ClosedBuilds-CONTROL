import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';
import { describe, expect, it, vi } from 'vitest';

// Evaluate only the IPC hook. Importing index.js would start machine infrastructure.
const source = readFileSync(resolve('index.js'), 'utf8');
const hook = source.slice(
  source.indexOf('// Only the development launcher'),
  source.indexOf('electronApp.setAppUserModelId'),
);

function install(packaged: boolean, flag: string | undefined, ipc: boolean) {
  const on =
    vi.fn<(event: string, handler: (message: unknown) => void) => void>();
  const reload = vi.fn();
  const quit = vi.fn();
  const context = {
    electronApp: { isPackaged: packaged, quit },
    process: { env: { CONTROL_DEV_RELOAD: flag }, send: ipc, on },
    jogWindow: {
      isDestroyed: () => false,
      webContents: { reloadIgnoringCache: reload },
    },
  };
  runInNewContext(hook, context);
  return { on, reload, quit };
}

describe('development IPC hook', () => {
  it.each([
    [true, '1', true],
    [false, undefined, true],
    [false, '1', false],
  ] as const)(
    'does not enable for packaged=%s, flag=%s, IPC=%s',
    (packaged, flag, ipc) => {
      expect(install(packaged, flag, ipc).on).not.toHaveBeenCalled();
    },
  );

  it('handles only private reload and quit messages', () => {
    const f = install(false, '1', true);
    expect(f.on).toHaveBeenCalledWith('message', expect.any(Function));
    const handler = f.on.mock.calls[0]?.[1];
    expect(handler).toBeDefined();
    handler?.(null);
    handler?.({ type: 'unrelated' });
    expect(f.reload).not.toHaveBeenCalled();
    expect(f.quit).not.toHaveBeenCalled();
    handler?.({ type: 'control:reload' });
    expect(f.reload).toHaveBeenCalledOnce();
    handler?.({ type: 'control:quit' });
    expect(f.quit).toHaveBeenCalledOnce();
  });
});
