import { describe, it, expect, beforeAll, vi } from 'vitest';
import optionsHtml from '../../src/options.html?raw';
import { CONFIG_KEY } from '../../src/config-store';

const local = () => (globalThis as any).__localData as Record<string, unknown>;
const tick = () => new Promise((r) => setTimeout(r, 0));
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let mod: typeof import('../../src/options');

/** Mount the options fixture without executing its script tag. The test imports the module itself. */
function mountOptionsFixture(html: string): void {
  const parsed = new DOMParser().parseFromString(html, 'text/html');
  parsed.querySelectorAll('script').forEach((node) => node.remove());
  const adopt = (nodes: Node[]) => nodes.map((node) => document.importNode(node, true));
  document.head.replaceChildren(...adopt([...parsed.head.childNodes]));
  document.body.replaceChildren(...adopt([...parsed.body.childNodes]));
}

describe('options page', () => {
  beforeAll(async () => {
    mountOptionsFixture(optionsHtml);
    local()[CONFIG_KEY] = { filters: ['alpha', 'beta'], effect: 'blur' };
    mod = await import('../../src/options');
    await tick();
    await tick();
  });

  it('fills the form from storage', () => {
    expect($<HTMLTextAreaElement>('filters').value).toBe('alpha\nbeta');
    expect($<HTMLSelectElement>('effect').value).toBe('blur');
    expect($<HTMLSelectElement>('effect').options.length).toBe(7);
    expect($<HTMLInputElement>('wholeWord').checked).toBe(true);
  });

  it('filterErrors reports per-line problems', () => {
    expect(mod.filterErrors('ok\n/(/\n\n/a*/')).toHaveLength(2);
    expect(mod.filterErrors('ok')).toEqual([]);
  });

  it('saves edits, skipping invalid entries with feedback', async () => {
    $<HTMLTextAreaElement>('filters').value = 'gamma\n/(/';
    $<HTMLTextAreaElement>('disabledSites').value = 'Example.com\nnot a host';
    $('btn-save').click();
    await tick();
    await tick();
    expect(local()[CONFIG_KEY]).toMatchObject({ filters: ['gamma'], disabledSites: ['example.com'] });
    expect($('errors').textContent).toContain('line 2');
    expect($('errors').textContent).toContain('not a host');
  });

  it('checkbox changes auto-save', async () => {
    const box = $<HTMLInputElement>('glitchAds');
    box.checked = true;
    box.dispatchEvent(new Event('change'));
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).glitchAds).toBe(true);
  });

  it('adds common ad words without duplicates', async () => {
    $('btn-add-ads').click();
    await tick();
    await tick();
    const f = (local()[CONFIG_KEY] as any).filters as string[];
    expect(f).toContain('sponsored');
    expect(new Set(f).size).toBe(f.length);
  });

  it('preview reflects the selected effect', async () => {
    const sel = $<HTMLSelectElement>('effect');
    sel.value = 'scramble';
    sel.dispatchEvent(new Event('change'));
    await tick();
    await tick();
    expect($('preview-word').className).toContain('gts-fx--scramble');
    expect($('preview-word').textContent).not.toBe('sponsored');
  });

  it('reset restores defaults after confirmation', async () => {
    vi.stubGlobal('confirm', () => true);
    $('btn-reset').click();
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).filters).toEqual(['sponsored', 'advertisement', 'promoted']);
    vi.unstubAllGlobals();
  });
});
