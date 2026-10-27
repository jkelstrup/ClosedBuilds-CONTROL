// Installation smoke check only: never import index.js or enumerate/open ports.
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const manifest = require('../package.json');

const port = new SerialPort({
  path: 'installation-check-never-opened',
  baudRate: 115200,
  autoOpen: false,
});
assert.equal(port.isOpen, false);

const lines = [];
const parser = new ReadlineParser({ delimiter: '\r\n' });
parser.on('data', (line) => lines.push(line));
parser.write(Buffer.from('o'));
parser.write(Buffer.from('k\r\n'));
assert.deepEqual(lines, ['ok']);

if (process.versions.electron) {
  assert.equal(process.versions.electron, manifest.devDependencies.electron);
} else {
  assert.equal(process.versions.node, manifest.engines.node);
  const result = spawnSync(require('electron'), [__filename], {
    env: { ...process.env, ELECTRON_RUN_AS_NODE: '1' },
    stdio: 'inherit',
    timeout: 30000,
  });
  if (result.error) throw result.error;
  assert.equal(result.status, 0, `Electron smoke check failed (${result.signal})`);
}

console.log(
  `Install smoke check passed: ${process.platform}/${process.arch}, ` +
    `Node ${process.versions.node}` +
    (process.versions.electron ? `, Electron ${process.versions.electron}` : ''),
);
