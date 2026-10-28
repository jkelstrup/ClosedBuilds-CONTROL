import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('dev controller is selectable, excluded from flashing, and uses normal connected UI controls', async ({
  context,
  page,
}) => {
  await context.route('**/*', (route) => {
    if (route.request().url() === 'http://controller.test/') {
      return route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html>',
      });
    }
    return route.abort();
  });
  await page.goto('http://controller.test/');
  await page.setContent(`<!doctype html>
    <div class="select"><select id="portUSB"></select></div>
    <div class="select"><select id="portUSB2"></select></div>
    <span id="connectStatus"></span>
    <button id="connectBtn">Connect</button>
    <button id="disconnectBtn">Disconnect</button>
    <button class="jogbtn">Jog</button>
    <input id="command"><button id="sendCommand">Send</button>`);
  await page.addScriptTag({
    content: await readFile('app/lib/jquery/jquery.min.js', 'utf8'),
  });
  const websocket = await readFile('app/js/websocket.js', 'utf8');
  const selection = websocket.slice(
    websocket.indexOf('function selectPort('),
    websocket.indexOf('function closePort('),
  );
  const menu = websocket.slice(
    websocket.indexOf('function populatePortsMenu()'),
    websocket.indexOf('function sendGcode('),
  );
  await page.addScriptTag({ content: await readFile('app/js/ui.js', 'utf8') });
  await page.addScriptTag({
    content: `
      var editor = null;
      var emitted = [];
      var socket = { emit: (...args) => emitted.push(args) };
      var laststatus = { comms: { connectionStatus: 0, interfaces: {
        type: '', activePort: false, ports: [], networkDevices: []
      } } };
      for (const id of ['portUSB', 'portUSB2']) {
        $('#' + id).data('select', { data: html => $('#' + id).html(html) });
      }
      ${selection}
      ${menu}
      populatePortsMenu();
      function renderConnection(value) {
        laststatus.comms.connectionStatus = value;
        laststatus.comms.interfaces.type = value ? 'dev' : '';
        laststatus.comms.interfaces.activePort = value ? 'Dev Controller' : false;
        setConnectBar(value, laststatus);
        setJogPanel(value, laststatus);
        setConsole(value, laststatus);
      }
      renderConnection(0);
      $('#connectBtn').on('click', () => selectPort());
      $('#disconnectBtn').on('click', () => renderConnection(0));
    `,
  });
  await expect(
    page.locator('#portUSB option[value="Dev Controller"]'),
  ).toHaveText('Dev Controller (simulated)');
  await expect(
    page.locator('#portUSB2 option[value="Dev Controller"]'),
  ).toHaveCount(0);
  await expect(page.locator('.jogbtn')).toBeDisabled();
  await expect(page.locator('#command')).toBeDisabled();
  await page.selectOption('#portUSB', 'Dev Controller');
  // Production refreshes these controls on each backend status snapshot.
  await page.evaluate('renderConnection(0)');
  await page.click('#connectBtn');
  expect(await page.evaluate('emitted')).toEqual([
    ['connectTo', { type: 'dev' }],
  ]);
  await page.evaluate('renderConnection(2)');
  await expect(page.locator('#connectStatus')).toHaveText(
    'Dev Controller (simulated)',
  );
  await expect(page.locator('#connectBtn')).toBeHidden();
  await expect(page.locator('.jogbtn')).toBeEnabled();
  await expect(page.locator('#command')).toBeEnabled();
  await page.click('#disconnectBtn');
  await expect(page.locator('#connectStatus')).toHaveText(
    'Port: Not Connected',
  );
  await expect(page.locator('.jogbtn')).toBeDisabled();
});
