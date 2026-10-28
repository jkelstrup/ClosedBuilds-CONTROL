import { readFileSync } from 'node:fs';
import { setImmediate } from 'node:timers/promises';
import { runInNewContext } from 'node:vm';
import { ReadlineParser } from '@serialport/parser-readline';
import { expect, it, vi } from 'vitest';
import { DevController } from './dev-controller.js';

it('connects, acknowledges, disconnects and reconnects through the legacy adapter without startup I/O', async () => {
  // Evaluate only the existing connection handler and cleanup function, never
  // import index.js (which would launch Electron and network infrastructure).
  const source = readFileSync('index.js', 'utf8');
  const connection = source.slice(
    source.indexOf('  socket.on("connectTo",'),
    source.indexOf("  socket.on('saveToSd',"),
  );
  const cleanup = source.slice(
    source.indexOf('function stopPort()'),
    source.indexOf('function parseFeedback('),
  );
  const handlers = new Map<string, (data: { type: string }) => void>();
  const controllers: DevController[] = [];
  const status = {
    comms: {
      connectionStatus: 0,
      interfaces: { type: '', activePort: false },
    },
    machine: { firmware: {}, modals: {} },
  };
  const emit = vi.fn();
  const send1Q = vi.fn();
  const parseFeedback = vi.fn();
  const clearInterval = vi.fn();
  const setInterval = vi.fn(() => 1);
  runInNewContext(connection + cleanup, {
    socket: {
      on: (name: string, handler: (data: { type: string }) => void) =>
        handlers.set(name, handler),
    },
    require: (path: string) => {
      expect(path).toBe('./dist/machine/dev-controller.js');
      return {
        DevController: class extends DevController {
          constructor() {
            super();
            controllers.push(this);
          }
        },
      };
    },
    ReadlineParser,
    status,
    io: { sockets: { emit } },
    debug_log: () => {},
    addQRealtime: (data: string) => controllers.at(-1)?.write(data),
    send1Q,
    parseFeedback,
    setInterval,
    clearInterval,
    statusLoop: 0,
    queueCounter: 0,
    jogWindow: false,
    sentBuffer: [],
    gcodeQueue: [],
    // Exercise the actual cleanup function via the existing error/close hooks.
    stopPort: undefined,
  });
  const connect = handlers.get('connectTo');
  expect(connect).toBeDefined();
  try {
    connect?.({ type: 'dev' });
    await setImmediate();
    expect(status.comms.connectionStatus).toBe(2);
    expect(status.comms.interfaces.activePort).toBe('Dev Controller');
    expect(emit).toHaveBeenCalledWith('grbl', status.machine.firmware);
    expect(parseFeedback).toHaveBeenCalledWith(
      expect.stringContaining('<Idle|MPos:0.000'),
    );
    expect(setInterval).toHaveBeenCalledTimes(1);

    controllers[0]?.write('G0 X10\n');
    await setImmediate();
    expect(send1Q).toHaveBeenCalledTimes(1);
    // Selecting another device while connected must not replace the transport.
    connect?.({ type: 'usb' });
    expect(controllers).toHaveLength(1);

    controllers[0]?.destroy();
    await setImmediate();
    expect(status.comms.connectionStatus).toBe(0);
    expect(status.comms.interfaces.activePort).toBe(false);
    expect(clearInterval).toHaveBeenCalledWith(1);

    connect?.({ type: 'dev' });
    await setImmediate();
    expect(controllers).toHaveLength(2);
    expect(status.comms.connectionStatus).toBe(2);
  } finally {
    for (const controller of controllers) controller.destroy();
    await setImmediate();
  }
});
