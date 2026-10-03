#!/usr/bin/env node
/**
 * Headless smoke test — zero dependencies (Chrome DevTools Protocol over
 * --remote-debugging-pipe). Loads dist/chrome into a real Chromium,
 * serves a test page and asserts that words get glitched, the service worker
 * starts, and popup/options render without errors.
 *
 *   npm run build && npm run smoke
 *   CHROME_BIN=/path/to/chromium npm run smoke
 *   SMOKE_SCREENSHOTS=/tmp/shots npm run smoke   # also save PNGs
 *
 * Uses CDP Extensions.loadUnpacked (Chrome ≥ 126), which works in branded
 * Chrome where --load-extension is disabled.
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extDir = join(root, 'dist', 'chrome');
if (!existsSync(join(extDir, 'manifest.json'))) {
  console.error('dist/chrome missing — run `npm run build` first');
  process.exit(1);
}
const candidates = [process.env.CHROME_BIN, 'google-chrome', 'chromium', 'chromium-browser', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const chromeBin = candidates.find((c) => c.includes('/') ? existsSync(c) : true);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PAGE = `<!doctype html><html><head><title>smoke</title></head><body>
<p id="a">This sponsored article is totally not promoted.</p>
<p id="b">Nothing to see.</p>
<script>setTimeout(() => { const d = document.createElement('p'); d.id = 'late'; d.textContent = 'Late advertisement'; document.body.appendChild(d); }, 300);</script>
</body></html>`;

const server = createServer((_, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(PAGE));
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const pageUrl = `http://127.0.0.1:${server.address().port}/`;

const profile = await mkdtemp(join(tmpdir(), 'gts-smoke-'));
// CDP over --remote-debugging-pipe (fd 3 = to Chrome, fd 4 = from Chrome, NUL-delimited JSON).
// Extensions.loadUnpacked is the supported way to load an unpacked extension into
// branded Chrome ≥ 137, where --load-extension is ignored.
const chrome = spawn(chromeBin, [
  '--headless=new', '--no-sandbox', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
  `--user-data-dir=${profile}`, '--remote-debugging-pipe', '--enable-unsafe-extension-debugging',
  '--disable-features=DisableLoadExtensionCommandLineSwitch', 'about:blank',
], { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] });

let failures = 0;
const check = (ok, msg) => {
  console.log(`${ok ? '✓' : '✗'} ${msg}`);
  if (!ok) failures++;
};

const toChrome = chrome.stdio[3];
const fromChrome = chrome.stdio[4];
let seq = 0;
const pending = new Map();
const events = [];
let buf = '';
fromChrome.on('data', (chunk) => {
  buf += chunk.toString('utf8');
  let i;
  while ((i = buf.indexOf('\0')) >= 0) {
    const msg = JSON.parse(buf.slice(0, i));
    buf = buf.slice(i + 1);
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    } else if (msg.method) events.push(msg);
  }
});
function send(method, params = {}, sessionId) {
  return new Promise((resolve, reject) => {
    const id = ++seq;
    const t = setTimeout(() => reject(new Error(`CDP timeout: ${method}`)), 15000);
    pending.set(id, (m) => {
      clearTimeout(t);
      m.error ? reject(new Error(`${method}: ${m.error.message}`)) : resolve(m.result);
    });
    toChrome.write(JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) }) + '\0');
  });
}

async function openTab(url) {
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId);
  return {
    sessionId,
    errors: () => events.filter((e) => e.sessionId === sessionId && e.method === 'Runtime.exceptionThrown'),
    shot: async (file) => {
      const dir = process.env.SMOKE_SCREENSHOTS;
      if (!dir) return;
      await mkdir(dir, { recursive: true });
      const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      await writeFile(join(dir, file), Buffer.from(data, 'base64'));
    },
    eval: async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result?.value,
    close: () => send('Target.closeTarget', { targetId }).catch(() => {}),
  };
}

try {
  // 1. load the unpacked build, wait for its service worker
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
    const r = await send('Runtime.evaluate', {
      expression: `chrome.storage.local.get('glitchConfig').then(d => !!d.glitchConfig && Array.isArray(d.glitchConfig.filters))`,
      awaitPromise: true, returnByValue: true,
    }, sessionId);
    check(r.result?.value === true, 'onInstalled initialized config in chrome.storage.local');
  }

  // 2. content script glitches the page
  const page = await openTab(pageUrl);
  await sleep(1500);
  const originals = await page.eval(`[...document.querySelectorAll('span.gts-fx')].map(s => s.dataset.gtsOriginal)`);
  check(JSON.stringify(originals) === JSON.stringify(['sponsored', 'promoted', 'advertisement']), `page words glitched: ${JSON.stringify(originals)}`);
  check(await page.eval(`!!document.getElementById('gts-effects') && !!document.getElementById('zenos-theme-registry')`), 'effect + zenOS theme styles injected');
  check(await page.eval(`document.getElementById('a').textContent === 'This sponsored article is totally not promoted.'`), 'page text content preserved');
  await page.shot('page-glitch.png');
  const pageErrors = page.errors();
  check(pageErrors.length === 0, `no page exceptions (${pageErrors.length})`);

  // 3. popup + options render
  const popup = await openTab(`chrome-extension://${extId}/popup.html`);
  await sleep(800);
  await popup.shot('popup.png');
  check(await popup.eval(`!!document.getElementById('sel-effect') && !!document.querySelector('[data-sensory="glitch"]')`), 'popup renders filter + zenOS controls');
  // change effect through the real UI → page updates live via storage.onChanged
  await popup.eval(`(() => { const s = document.getElementById('sel-effect'); s.value = 'redact'; s.dispatchEvent(new Event('change')); })()`);
  await sleep(800);
  check(await page.eval(`document.querySelector('span.gts-fx')?.dataset.gtsEffect === 'redact'`), 'popup effect change applied live to open page');
  const popupErrors = popup.errors();
  check(popupErrors.length === 0, `no popup exceptions (${popupErrors.length})`);

  const options = await openTab(`chrome-extension://${extId}/options.html`);
  await sleep(800);
  await options.shot('options.png');
  check((await options.eval(`document.getElementById('filters').value`))?.includes('sponsored'), 'options page loads saved filters');
  const optErrors = options.errors();
  check(optErrors.length === 0, `no options exceptions (${optErrors.length})`);

  // 4. disable → page restored
  await popup.eval(`(() => { const c = document.getElementById('chk-enabled'); c.checked = false; c.dispatchEvent(new Event('change')); })()`);
  await sleep(800);
  check((await page.eval(`document.querySelectorAll('span.gts-fx').length`)) === 0, 'disabling restores the page');
  await Promise.all([page, popup, options].map((c) => c.close()));
} catch (e) {
  console.error(`✗ ${e.message}`);
  failures++;
} finally {
  chrome.kill('SIGTERM');
  server.close();
  await sleep(300);
  await rm(profile, { recursive: true, force: true }).catch(() => {});
}
console.log(failures ? `\nSMOKE FAILED (${failures})` : '\nSMOKE PASSED');
process.exit(failures ? 1 : 0);
