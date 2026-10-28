import { once } from 'node:events';
import { setImmediate } from 'node:timers/promises';
import { afterEach, expect, it } from 'vitest';
import { DevController } from './dev-controller.js';

const controllers: DevController[] = [];
afterEach(() => {
  for (const controller of controllers) controller.destroy();
  controllers.length = 0;
});

function connect() {
  const controller = new DevController();
  controllers.push(controller);
  const replies: string[] = [];
  controller.on('data', (chunk: Buffer) => replies.push(chunk.toString()));
  return { controller, replies };
}

it('opens without hardware and reports fixed idle coordinates without an acknowledgement', async () => {
  const { controller, replies } = connect();
  await once(controller, 'open');
  expect(controller.isOpen).toBe(true);
  controller.write('?');
  await setImmediate();
  expect(replies.join('')).toBe(
    '<Idle|MPos:0.000,0.000,0.000|WCO:0.000,0.000,0.000|FS:0,0|Ov:100,100,100>\r\n',
  );
});

it('acknowledges complete commands asynchronously, including split and batched input', async () => {
  const { controller, replies } = connect();
  controller.write('G0 X');
  controller.write('10\r\nG0 Y20\n');
  expect(replies).toEqual([]);
  await setImmediate();
  expect(replies.join('')).toBe('ok\r\nok\r\n');
  controller.write('?');
  await setImmediate();
  expect(replies.join('')).toContain('MPos:0.000,0.000,0.000');
});

it('supplies identification and modal replies but does not simulate settings or real-time commands', async () => {
  const { controller, replies } = connect();
  controller.write('$I\n$G\n$$\n!~\x85');
  await setImmediate();
  expect(replies.join('')).toBe(
    '[VER:1.1h.20261028:Dev Controller]\r\n[OPT:V,15,128]\r\nok\r\n' +
      '[GC:G0 G54 G17 G21 G90 G94 M5 M9 T0 F0 S0]\r\nok\r\nok\r\n',
  );
});

it('drops pending replies on disconnect and starts a fresh connection', async () => {
  const { controller, replies } = connect();
  controller.write('G0 X10\n');
  controller.destroy();
  await setImmediate();
  expect(controller.isOpen).toBe(false);
  expect(replies).toEqual([]);
  const next = connect();
  await once(next.controller, 'open');
  next.controller.write('$G\n');
  await setImmediate();
  expect(next.replies.join('')).toContain('[GC:G0 G54');
});
