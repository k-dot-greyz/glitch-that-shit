import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderGlitchSection } from '../../src/popup';
import { CONFIG_KEY } from '../../src/config-store';
import { defaultConfig } from '../../src/glitch-config';

const local = () => (globalThis as any).__localData as Record<string, unknown>;
const c = (globalThis as any).__chromeMock;
const tick = () => new Promise((r) => setTimeout(r, 0));
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

async function render() {
  document.body.innerHTML = '<section id="root"></section>';
  await renderGlitchSection($('root'));
}

describe('popup — glitch section', () => {
  beforeEach(() => {
    for (const k of Object.keys(local())) delete local()[k];
    c.tabs.query.mockResolvedValue([{ id: 5, url: 'https://news.example.com/x' }]);
    c.tabs.sendMessage.mockResolvedValue({ hits: 4, active: true, host: 'news.example.com' });
  });

  it('reflects current config and page status', async () => {
    local()[CONFIG_KEY] = { ...defaultConfig(), effect: 'blur', intensity: 'subtle' };
    await render();
    await tick();
    expect($<HTMLInputElement>('chk-enabled').checked).toBe(true);
    expect($<HTMLSelectElement>('sel-effect').value).toBe('blur');
    expect($<HTMLSelectElement>('sel-intensity').value).toBe('subtle');
    expect($<HTMLInputElement>('chk-site').checked).toBe(true);
    expect(document.body.textContent).toContain('news.example.com');
    expect($('val-hits').textContent).toBe('4');
  });

  it('writes enable/effect/intensity changes', async () => {
    await render();
    const sel = $<HTMLSelectElement>('sel-effect');
    sel.value = 'redact';
    sel.dispatchEvent(new Event('change'));
    const chk = $<HTMLInputElement>('chk-enabled');
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    await tick();
    await tick();
    expect(local()[CONFIG_KEY]).toMatchObject({ effect: 'redact', enabled: false });
  });

  it('quick-add validates and appends filters', async () => {
    await render();
    const form = $<HTMLFormElement>('form-add-filter');
    $<HTMLInputElement>('inp-filter').value = 'crypto';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).filters).toContain('crypto');
    expect($('filter-msg').dataset.kind).toBe('ok');
    $<HTMLInputElement>('inp-filter').value = '/(/';
    form.dispatchEvent(new Event('submit', { cancelable: true }));
    await tick();
    await tick();
    expect($('filter-msg').dataset.kind).toBe('error');
    expect($('filter-msg').textContent).toContain('Invalid regex');
  });

  it('site toggle pauses the current host', async () => {
    await render();
    const site = $<HTMLInputElement>('chk-site');
    site.checked = false;
    site.dispatchEvent(new Event('change'));
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).disabledSites).toEqual(['news.example.com']);
  });

  it('disables the site toggle on pages without a host', async () => {
    c.tabs.query.mockResolvedValue([{ id: 1, url: 'chrome://extensions/' }]);
    await render();
    expect($<HTMLInputElement>('chk-site').disabled).toBe(true);
  });

  it('settings button opens the options page', async () => {
    await render();
    $('btn-settings').click();
    expect(c.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('host from a hostile URL is rendered as text, not HTML', async () => {
    c.tabs.query.mockResolvedValue([{ id: 1, url: 'https://evil.com/<img src=x onerror=alert(1)>' }]);
    await render();
    expect(document.querySelector('#root img')).toBeNull();
  });
});
