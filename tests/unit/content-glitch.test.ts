/** Integration: real content.ts + storage modules against the chrome mock. */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { CONFIG_KEY } from '../../src/config-store';
import { defaultConfig } from '../../src/glitch-config';

const local = () => (globalThis as any).__localData as Record<string, unknown>;
const chromeMock = () => (globalThis as any).__chromeMock;
const tick = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const spans = () => document.querySelectorAll('span.gts-fx');

// Track observers so each booted module instance is torn down (no cross-test/env-teardown leaks)
const observers: MutationObserver[] = [];
const RealMO = globalThis.MutationObserver;
class TrackedMO extends RealMO {
  constructor(cb: MutationCallback) {
    super(cb);
    observers.push(this);
  }
}
globalThis.MutationObserver = TrackedMO;

async function boot() {
  vi.resetModules();
  await import('../../src/content');
  await tick();
  await tick();
}

describe('content script — glitch engine', () => {
  beforeEach(() => {
    for (const k of Object.keys(local())) delete local()[k];
    document.body.innerHTML = '<p>This is sponsored content. Totally not promoted.</p>';
    vi.clearAllMocks();
  });

  afterEach(() => {
    observers.splice(0).forEach((o) => o.disconnect());
  });

  it('glitches default filters on load and injects effect styles', async () => {
    await boot();
    expect([...spans()].map((s) => s.getAttribute('data-gts-original'))).toEqual(['sponsored', 'promoted']);
    expect(document.getElementById('gts-effects')).not.toBeNull();
  });

  it('glitches content added later (SPA)', async () => {
    await boot();
    const div = document.createElement('div');
    div.textContent = 'fresh advertisement here';
    document.body.appendChild(div);
    await tick();
    expect(div.querySelector('span.gts-fx')?.textContent).toBe('advertisement');
  });

  it('reacts to config changes live: effect switch and disable/restore', async () => {
    await boot();
    await chrome.storage.local.set({ [CONFIG_KEY]: { ...defaultConfig(), effect: 'redact' } });
    expect(spans()[0].className).toContain('gts-fx--redact');
    await chrome.storage.local.set({ [CONFIG_KEY]: { ...defaultConfig(), enabled: false } });
    expect(spans()).toHaveLength(0);
    expect(document.body.textContent).toBe('This is sponsored content. Totally not promoted.');
  });

  it('does nothing on a paused site', async () => {
    local()[CONFIG_KEY] = { ...defaultConfig(), disabledSites: [location.hostname || 'localhost'] };
    await boot();
    expect(spans()).toHaveLength(0);
  });

  it('click-to-reveal shows the original and swallows the first click', async () => {
    local()[CONFIG_KEY] = { ...defaultConfig(), effect: 'scramble' };
    document.body.innerHTML = '<a href="#x"><span>sponsored</span></a>';
    await boot();
    const s = spans()[0] as HTMLElement;
    const ev = new MouseEvent('click', { bubbles: true, cancelable: true });
    s.dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
    expect(s.textContent).toBe('sponsored');
    const ev2 = new MouseEvent('click', { bubbles: true, cancelable: true });
    s.dispatchEvent(ev2);
    expect(ev2.defaultPrevented).toBe(false);
  });

  it('reports hit count to the background (debounced)', async () => {
    await boot();
    await tick(300);
    expect(chromeMock().runtime.sendMessage).toHaveBeenCalledWith({ type: 'gts:hits', count: 2 });
  });

  it('answers popup status queries', async () => {
    await boot();
    const handler = chromeMock().runtime.onMessage.addListener.mock.calls.at(-1)[0];
    const send = vi.fn();
    handler({ type: 'gts:status' }, {}, send);
    expect(send).toHaveBeenCalledWith(expect.objectContaining({ hits: 2, active: true }));
    const send2 = vi.fn();
    expect(handler({ type: 'bogus' }, {}, send2)).toBe(false);
    expect(send2).not.toHaveBeenCalled();
  });
});
