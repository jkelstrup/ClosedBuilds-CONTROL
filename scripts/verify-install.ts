// Installation smoke check only: never import index.js or enumerate/open ports.
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { SerialPort } from 'serialport';
import { ReadlineParser } from '@serialport/parser-readline';
import manifest from '../package.json';

const port = new SerialPort({
  path: 'installation-check-never-opened',
  baudRate: 115200,
  autoOpen: false,
});
assert.equal(port.isOpen, false);

const lines: string[] = [];
const parser = new ReadlineParser({ delimiter: '\r\n' });
parser.on('data', (line: string) => lines.push(line));
parser.write(Buffer.from('o'));
parser.write(Buffer.from('k\r\n'));
assert.deepEqual(lines, ['ok']);

if (process.versions.electron) {
  assert.equal(process.versions.electron, manifest.devDependencies.electron);
} else {
  assert.equal(process.versions.node, manifest.engines.node);
  // Electron's package exports an executable path in Node, not its API object.
  const electronPath: unknown = createRequire(__filename)('electron');
  assert(typeof electronPath === 'string');
  const result = spawnSync(electronPath, [__filename], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
    timeout: 30000,
  });
  if (result.error) throw result.error;
  assert.equal(
    result.status,
    0,
    `Electron smoke check failed (${result.signal})`,
  );
}

console.log(
  `Install smoke check passed: ${process.platform}/${process.arch}, ` +
    `Node ${process.versions.node}` +
    (process.versions.electron
      ? `, Electron ${process.versions.electron}`
      : ''),
);
