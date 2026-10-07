#!/usr/bin/env node
/**
 * Headless smoke test — zero dependencies beyond scripts/chrome-session.mjs.
 *
 *   npm run build && npm run smoke
 *   CHROME_BIN=/path/to/chromium npm run smoke
 *   SMOKE_SCREENSHOTS=/tmp/shots npm run smoke   # also save PNGs
 */
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openTab, resolveChromeBin, serveHtml } from './chrome-session.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extDir = join(root, 'dist', 'chrome');
if (!existsSync(join(extDir, 'manifest.json'))) {
  console.error('dist/chrome missing — run `npm run build` first');
  process.exit(1);
}
const chromeBin = resolveChromeBin();

const PAGE = `<!doctype html><html><head><title>smoke</title></head><body>
<p id="a">This sponsored article is totally not promoted.</p>
<p id="b">Nothing to see.</p>
<script>setTimeout(() => { const d = document.createElement('p'); d.id = 'late'; d.textContent = 'Late advertisement'; document.body.appendChild(d); }, 300);</script>
</body></html>`;

const server = await serveHtml(PAGE);
const session = await launchChrome(chromeBin);
const { send, sleep } = session;

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};

try {
  const { id: extId } = await send('Extensions.loadUnpacked', { path: extDir });
  let sw = null;
  for (let i = 0; i < 40 && !sw; i++) {
    const { targetInfos } = await send('Target.getTargets');
    sw = targetInfos.find((t) => t.type === 'service_worker' && t.url === `chrome-extension://${extId}/background.js`);
    if (!sw) await sleep(250);
  }
  check(!!sw, `extension loaded, service worker running (id ${extId})`);
  if (sw) {
    const { sessionId } = await send('Target.attachToTarget', { targetId: sw.targetId, flatten: true });
    await sleep(500);
    const r = await send(
      'Runtime.evaluate',
      {
        expression: `chrome.storage.local.get('glitchConfig').then(d => !!d.glitchConfig && Array.isArray(d.glitchConfig.filters))`,
        awaitPromise: true,
        returnByValue: true,
      },
      sessionId,
    );
    check(r.result?.value === true, 'onInstalled initialized config in chrome.storage.local');
  }

  const page = await openTab(session, server.url);
  await sleep(1500);
  const originals = await page.eval(`[...document.querySelectorAll('span.gts-fx')].map(s => s.dataset.gtsOriginal)`);
  check(
    JSON.stringify(originals) === JSON.stringify(['sponsored', 'promoted', 'advertisement']),
    `page words glitched: ${JSON.stringify(originals)}`,
  );
  check(
    await page.eval(`!!document.getElementById('gts-effects') && !!document.getElementById('zenos-theme-registry')`),
    'effect + zenOS theme styles injected',
  );
  check(
    await page.eval(`document.getElementById('a').textContent === 'This sponsored article is totally not promoted.'`),
    'page text content preserved',
  );
  await page.shot('page-glitch.png');
  const pageErrors = page.errors();
  check(pageErrors.length === 0, `no page exceptions (${pageErrors.length})`);

  const popup = await openTab(session, `chrome-extension://${extId}/popup.html`);
  await sleep(800);
  await popup.shot('popup.png');
  check(
    await popup.eval(`!!document.getElementById('sel-effect') && !!document.querySelector('[data-sensory="glitch"]')`),
    'popup renders filter + zenOS controls',
  );
  await popup.eval(`(() => { const s = document.getElementById('sel-effect'); s.value = 'redact'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(800);
  check(await page.eval(`document.querySelector('span.gts-fx')?.dataset.gtsEffect === 'redact'`), 'popup effect change applied live to open page');
  const popupErrors = popup.errors();
  check(popupErrors.length === 0, `no popup exceptions (${popupErrors.length})`);

  const options = await openTab(session, `chrome-extension://${extId}/options.html`);
  await sleep(800);
  await options.shot('options.png');
  check((await options.eval(`document.getElementById('filters').value`))?.includes('sponsored'), 'options page loads saved filters');
  const optErrors = options.errors();
  check(optErrors.length === 0, `no options exceptions (${optErrors.length})`);

  await popup.eval(`(() => { const c = document.getElementById('chk-enabled'); c.checked = false; c.dispatchEvent(new Event('change')); })()`);
  await sleep(800);
  check((await page.eval(`document.querySelectorAll('span.gts-fx').length`)) === 0, 'disabling restores the page');
  await Promise.all([page, popup, options].map((c) => c.close()));
} catch (e) {
  console.error(`✗ ${e.message}`);
  failures++;
} finally {
  await session.kill();
  await server.close();
}
console.log(failures ? `\nSMOKE FAILED (${failures})` : '\nSMOKE PASSED');
process.exit(failures ? 1 : 0);
