#!/usr/bin/env node
/**
 * End-to-end run with graceful ablation and progressive artifact minting.
 *
 * A failed step is recorded, later steps that depend on it are skipped, and
 * report.json is rewritten after every transition. Screenshot failures warn
 * and do not fail the run. Mint errors are logged and swallowed.
 *
 *   npm run build && npm run e2e
 *   E2E_DIR=/tmp/gts-e2e npm run e2e
 *
 * Artifacts (default): artifacts/e2e/<timestamp>/
 *   report.json     latest snapshot (safe to read while the run is in progress)
 *   events.jsonl    one line per transition
 *   shots/*.png     page, popup, options
 */
import { existsSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchChrome, openTab, resolveChromeBin, serveHtml } from './chrome-session.mjs';
import { createRun } from './e2e-report.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const extDir = join(root, 'dist', 'chrome');
const stamp = new Date().toISOString().replace(/[:.]/g, '-');
const outDir = process.env.E2E_DIR || join(root, 'artifacts', 'e2e', stamp);
const shotDir = join(outDir, 'shots');

const PAGE = `<!doctype html><html><head><title>e2e</title></head><body>
<p id="a">This sponsored article is totally not promoted.</p>
<p id="b">Nothing to see.</p>
<script>setTimeout(() => { const d = document.createElement('p'); d.id = 'late'; d.textContent = 'Late advertisement'; document.body.appendChild(d); }, 300);</script>
</body></html>`;

const report = createRun(outDir);
let session = null;
let server = null;

function log(step, status, extra = '') {
  const mark = status === 'ok' ? '✓' : status === 'skipped' ? '–' : status === 'warned' ? '!' : '✗';
  console.log(`${mark} ${step.id}${extra ? ` — ${extra}` : ''}`);
}

async function gate(id, ok, detail, { level = 'hard', title } = {}) {
  await report.begin(id, { level, title });
  if (ok) {
    await report.pass(id, detail);
    log({ id }, 'ok', detail);
    return true;
  }
  await report.fail(id, detail || 'failed');
  const step = report.state.steps.find((s) => s.id === id);
  log({ id }, step?.status || 'failed', detail);
  return false;
}

async function skipRest(ids, reason) {
  for (const id of ids) {
    if (report.state.steps.some((s) => s.id === id && s.status !== 'running')) continue;
    await report.skip(id, reason);
    log({ id }, 'skipped', reason);
  }
}

const AFTER_DIST = [
  'chrome',
  'launch',
  'load-extension',
  'service-worker',
  'config-init',
  'page-glitch',
  'styles',
  'text-preserved',
  'page-exceptions',
  'page-shot',
  'popup',
  'live-effect',
  'popup-exceptions',
  'popup-shot',
  'options',
  'hostile-filter',
  'options-exceptions',
  'options-shot',
  'disable-restores',
];

try {
  const distOk = await gate('dist', existsSync(join(extDir, 'manifest.json')), existsSync(join(extDir, 'manifest.json')) ? extDir : 'dist/chrome missing — npm run build', {
    title: 'Chrome build present',
  });
  if (!distOk) {
    await skipRest(AFTER_DIST, 'dist missing');
  } else {
    const chromeBin = resolveChromeBin();
    const chromeOk = await gate('chrome', Boolean(chromeBin), chromeBin || 'set CHROME_BIN to a Chrome/Chromium binary', {
      title: 'Chrome binary',
    });
    if (!chromeOk) {
      await skipRest(AFTER_DIST.slice(1), 'chrome missing');
    } else {
      let launched = false;
      try {
        await report.begin('launch', { title: 'Headless Chrome' });
        server = await serveHtml(PAGE);
        session = await launchChrome(chromeBin);
        launched = true;
        await report.pass('launch', 'cdp pipe up');
        log({ id: 'launch' }, 'ok');
      } catch (err) {
        await report.fail('launch', err);
        log({ id: 'launch' }, 'failed', err.message);
      }
      if (!launched) {
        await skipRest(AFTER_DIST.slice(2), 'chrome did not launch');
      } else {
        await runLoaded(session, server);
      }
    }
  }
} catch (err) {
  await report.begin('runner', { title: 'Unhandled runner error' });
  await report.fail('runner', err);
  console.error(`✗ runner — ${err.message}`);
} finally {
  if (session) await session.kill().catch((err) => console.error(`[e2e] chrome cleanup: ${err.message}`));
  if (server) await server.close().catch((err) => console.error(`[e2e] server cleanup: ${err.message}`));
  const code = await report.finish();
  const rel = relative(root, join(outDir, 'report.json'));
  console.log(`\nreport: ${rel.startsWith('..') ? join(outDir, 'report.json') : rel}`);
  console.log(code === 0 ? 'E2E PASSED' : 'E2E FAILED');
  process.exit(code);
}

async function runLoaded(session, server) {
  const { send, sleep } = session;
  let extId = null;
  try {
    await report.begin('load-extension', { title: 'Load unpacked dist/chrome' });
    const loaded = await send('Extensions.loadUnpacked', { path: extDir });
    extId = loaded.id;
    await report.pass('load-extension', extId);
    log({ id: 'load-extension' }, 'ok', extId);
  } catch (err) {
    await report.fail('load-extension', err);
    log({ id: 'load-extension' }, 'failed', err.message);
    await skipRest(AFTER_DIST.slice(3), 'extension did not load');
    return;
  }

  let sw = null;
  await report.begin('service-worker', { title: 'Service worker' });
  for (let i = 0; i < 40 && !sw; i++) {
    const { targetInfos } = await send('Target.getTargets');
    sw = targetInfos.find((t) => t.type === 'service_worker' && t.url === `chrome-extension://${extId}/background.js`);
    if (!sw) await sleep(250);
  }
  if (!sw) {
    await report.fail('service-worker', 'service worker did not start');
    log({ id: 'service-worker' }, 'failed', 'did not start');
    await skipRest(AFTER_DIST.slice(4), 'service worker missing');
    return;
  }
  await report.pass('service-worker', sw.targetId);
  log({ id: 'service-worker' }, 'ok');

  const { sessionId } = await send('Target.attachToTarget', { targetId: sw.targetId, flatten: true });
  await sleep(500);
  const init = await send(
    'Runtime.evaluate',
    {
      expression: `chrome.storage.local.get('glitchConfig').then(d => !!d.glitchConfig && Array.isArray(d.glitchConfig.filters))`,
      awaitPromise: true,
      returnByValue: true,
    },
    sessionId,
  );
  const configOk = await gate('config-init', init.result?.value === true, 'onInstalled wrote glitchConfig', {
    title: 'Default config initialized',
  });
  if (!configOk) {
    await skipRest(AFTER_DIST.slice(5), 'config was not initialized');
    return;
  }

  const page = await openTab(session, server.url, shotDir);
  await sleep(1500);
  const originals = await page.eval(`[...document.querySelectorAll('span.gts-fx')].map(s => s.dataset.gtsOriginal)`);
  const glitched = await gate(
    'page-glitch',
    JSON.stringify(originals) === JSON.stringify(['sponsored', 'promoted', 'advertisement']),
    `originals=${JSON.stringify(originals)}`,
    { title: 'Page words glitched' },
  );
  await gate(
    'styles',
    await page.eval(`!!document.getElementById('gts-effects') && !!document.getElementById('zenos-theme-registry')`),
    'effect + zenOS theme styles',
    { title: 'Styles injected' },
  );
  await gate(
    'text-preserved',
    await page.eval(`document.getElementById('a').textContent === 'This sponsored article is totally not promoted.'`),
    'visible text unchanged',
    { title: 'Page text preserved' },
  );
  const pageErrors = page.errors();
  await gate('page-exceptions', pageErrors.length === 0, `${pageErrors.length} exception(s)`, { title: 'No page exceptions' });
  await shot(page, 'page-glitch.png', 'page-shot');

  if (!glitched) {
    await skipRest(['popup', 'live-effect', 'popup-exceptions', 'popup-shot', 'options', 'hostile-filter', 'options-exceptions', 'options-shot', 'disable-restores'], 'page did not glitch');
    await page.close();
    return;
  }

  const popup = await openTab(session, `chrome-extension://${extId}/popup.html`, shotDir);
  await sleep(800);
  const popupOk = await gate(
    'popup',
    await popup.eval(`!!document.getElementById('sel-effect') && !!document.querySelector('[data-sensory="glitch"]')`),
    'filter + zenOS controls',
    { title: 'Popup rendered' },
  );
  if (popupOk) {
    await popup.eval(`(() => { const s = document.getElementById('sel-effect'); s.value = 'redact'; s.dispatchEvent(new Event('change')); })()`);
    await sleep(800);
    await gate('live-effect', await page.eval(`document.querySelector('span.gts-fx')?.dataset.gtsEffect === 'redact'`), 'effect=redact', {
      title: 'Popup effect applied live',
    });
  } else {
    await skipRest(['live-effect'], 'popup did not render');
  }
  await gate('popup-exceptions', popup.errors().length === 0, `${popup.errors().length} exception(s)`, { title: 'No popup exceptions' });
  await shot(popup, 'popup.png', 'popup-shot');

  const options = await openTab(session, `chrome-extension://${extId}/options.html`, shotDir);
  await sleep(800);
  const optionsOk = await gate('options', (await options.eval(`document.getElementById('filters').value`))?.includes('sponsored'), 'filters include sponsored', {
    title: 'Options loaded saved filters',
  });
  if (optionsOk) {
    await options.eval(`(() => { const ta = document.getElementById('filters'); ta.value = 'sponsored\\n/(/'; ta.dispatchEvent(new Event('blur')); })()`);
    await sleep(800);
    const errText = await options.eval(`document.getElementById('errors').textContent || ''`);
    const still = await page.eval(`[...document.querySelectorAll('span.gts-fx')].some(s => s.dataset.gtsOriginal === 'sponsored')`);
    await gate('hostile-filter', typeof errText === 'string' && errText.includes('Invalid regex') && still === true, `errors=${JSON.stringify(errText)} stillGlitched=${still}`, {
      title: 'Invalid regex dropped, valid filter kept',
    });
  } else {
    await report.skip('hostile-filter', 'options did not load');
    log({ id: 'hostile-filter' }, 'skipped', 'options did not load');
  }
  await gate('options-exceptions', options.errors().length === 0, `${options.errors().length} exception(s)`, {
    title: 'No options exceptions',
  });
  await shot(options, 'options.png', 'options-shot');

  if (popupOk) {
    await popup.eval(`(() => { const c = document.getElementById('chk-enabled'); c.checked = false; c.dispatchEvent(new Event('change')); })()`);
    await sleep(800);
    await gate('disable-restores', (await page.eval(`document.querySelectorAll('span.gts-fx').length`)) === 0, 'spans removed', {
      title: 'Disable restores the page',
    });
  } else {
    await report.skip('disable-restores', 'popup did not render');
    log({ id: 'disable-restores' }, 'skipped', 'popup did not render');
  }
  await Promise.all([page, popup, options].map((c) => c.close()));
}

async function shot(tab, file, id) {
  await report.begin(id, { level: 'warn', title: `Screenshot ${file}` });
  try {
    const path = await tab.shot(file);
    if (!path) throw new Error('screenshot returned no path');
    await report.pass(id, file);
    log({ id }, 'ok', file);
  } catch (err) {
    await report.fail(id, err);
    log({ id }, 'warned', err.message);
  }
}
