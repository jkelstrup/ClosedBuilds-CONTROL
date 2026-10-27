import { readFile } from 'node:fs/promises';
import { expect, test } from '@playwright/test';

test('built renderer bridge supports the legacy title callback in full and mobile pages', async ({
  context,
  page,
}) => {
  const bundle = await readFile('app/generated/renderer.js');
  const main = await readFile('app/js/main.js', 'utf8');
  const callback = main.slice(
    main.indexOf('function setWindowTitle('),
    main.indexOf('function getReleaseStats('),
  );
  const unexpected: string[] = [];
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    if (url === 'http://preview.test/generated/renderer.js') {
      await route.fulfill({
        contentType: 'application/javascript',
        body: bundle,
      });
    } else if (
      url === 'http://preview.test/' ||
      url === 'http://preview.test/jog/'
    ) {
      await route.fulfill({
        contentType: 'text/html',
        body: '<!doctype html><span id="windowtitle"></span><script src="/generated/renderer.js"></script>',
      });
    } else {
      unexpected.push(url);
      await route.abort();
    }
  });
  for (const [path, mainScript] of [
    ['/', 'js/main.js'],
    ['/jog/', '../js/main.js'],
  ]) {
    const html = await readFile(
      path === '/' ? 'app/index.html' : 'app/jog/index.html',
      'utf8',
    );
    const bridgeTag = 'src="/generated/renderer.js"';
    expect(html).toContain(bridgeTag);
    expect(html.indexOf(bridgeTag)).toBeLessThan(
      html.indexOf(`src="${mainScript}"`),
    );
    await page.goto(`http://preview.test${path}`);
    await page.addScriptTag({
      content: `
      var loadedFileName = 'example.nc';
      var nostatusyet = false;
      var laststatus = { driver: { version: '0.1.0' }, comms: { interfaces: { activePort: '/dev/example' } } };
      var $ = () => ({ html: value => { document.getElementById('windowtitle').innerHTML = value; } });
      ${callback}
      setWindowTitle();
    `,
    });
    await expect(page).toHaveTitle(
      'CBC v0.1.0 / example.nc / connected to /dev/example',
    );
    await expect(page.locator('#windowtitle')).toHaveText(
      'v0.1.0 / example.nc / connected to /dev/example',
    );
  }
  expect(unexpected).toEqual([]);
});
