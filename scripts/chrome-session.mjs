/**
 * Headless Chrome over --remote-debugging-pipe. Shared by smoke and e2e.
 * Extensions.loadUnpacked needs Chrome ≥ 126 (branded Chrome ignores --load-extension).
 */
import { spawn } from 'node:child_process';
import { createServer } from 'node:http';
import { mkdtemp, rm, writeFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export function resolveChromeBin() {
  const candidates = [
    process.env.CHROME_BIN,
    'google-chrome',
    'chromium',
    'chromium-browser',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  ].filter(Boolean);
  return candidates.find((c) => (c.includes('/') ? existsSync(c) : true)) || null;
}

export function serveHtml(html) {
  const server = createServer((_, res) => res.writeHead(200, { 'content-type': 'text/html' }).end(html));
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      resolve({
        url: `http://127.0.0.1:${server.address().port}/`,
        close: () =>
          new Promise((done) => {
            server.close(() => done());
          }),
      });
    });
  });
}

export async function launchChrome(chromeBin) {
  const profile = await mkdtemp(join(tmpdir(), 'gts-chrome-'));
  const chrome = spawn(
    chromeBin,
    [
      '--headless=new',
      '--no-sandbox',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-gpu',
      `--user-data-dir=${profile}`,
      '--remote-debugging-pipe',
      '--enable-unsafe-extension-debugging',
      '--disable-features=DisableLoadExtensionCommandLineSwitch',
      'about:blank',
    ],
    { stdio: ['ignore', 'ignore', 'ignore', 'pipe', 'pipe'] },
  );

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
      const raw = buf.slice(0, i);
      buf = buf.slice(i + 1);
      let msg;
      try {
        msg = JSON.parse(raw);
      } catch (err) {
        events.push({ method: 'parse-error', error: String(err.message || err), raw: raw.slice(0, 200) });
        continue;
      }
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
      toChrome.write(`${JSON.stringify({ id, method, params, ...(sessionId ? { sessionId } : {}) })}\0`);
    });
  }

  async function kill() {
    chrome.kill('SIGTERM');
    await sleep(300);
    await rm(profile, { recursive: true, force: true }).catch(() => {});
  }

  return { send, events, kill, sleep };
}

export async function openTab(session, url, shotDir) {
  const { send, events } = session;
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  await send('Runtime.enable', {}, sessionId);
  await send('Page.enable', {}, sessionId);
  await send('Page.navigate', { url }, sessionId);
  return {
    sessionId,
    errors: () => events.filter((e) => e.sessionId === sessionId && e.method === 'Runtime.exceptionThrown'),
    shot: async (file) => {
      const dir = shotDir || process.env.SMOKE_SCREENSHOTS;
      if (!dir) return null;
      await mkdir(dir, { recursive: true });
      const { data } = await send('Page.captureScreenshot', { format: 'png' }, sessionId);
      const path = join(dir, file);
      await writeFile(path, Buffer.from(data, 'base64'));
      return path;
    },
    eval: async (expression) =>
      (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true }, sessionId)).result?.value,
    close: () => send('Target.closeTarget', { targetId }).catch(() => {}),
  };
}
