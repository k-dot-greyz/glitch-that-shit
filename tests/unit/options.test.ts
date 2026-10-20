import { describe, it, expect, beforeAll, vi } from 'vitest';
import optionsHtml from '../../src/options.html?raw';
import { CONFIG_KEY } from '../../src/config-store';

const local = () => (globalThis as any).__localData as Record<string, unknown>;
const tick = () => new Promise((r) => setTimeout(r, 0));
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

let mod: typeof import('../../src/options');

describe('options page', () => {
  beforeAll(async () => {
    document.documentElement.innerHTML = optionsHtml.replace(/^[\s\S]*?<html[^>]*>/, '').replace(/<script[\s\S]*?<\/script>/g, '');
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

  it('import applies a validated bundle and rejects hostile JSON (§3.4 / §3.5)', async () => {
    const input = $<HTMLInputElement>('file-import');
    const withText = (content: string, name: string) => {
      const f = new File([content], name, { type: 'application/json' });
      (f as File & { text: () => Promise<string> }).text = () => Promise.resolve(content);
      return f;
    };
    const hostile = withText(
      '{"app":"glitch-that-shit","schema":1,"config":{"filters":["/(/"],"effect":"boom"}}',
      'bad.json',
    );
    Object.defineProperty(input, 'files', { value: [hostile], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).filters).toEqual([]);
    expect($('status').textContent).toMatch(/Imported/);

    const good = withText(
      JSON.stringify({ app: 'glitch-that-shit', schema: 1, config: { filters: ['imported'] }, profile: null }),
      'good.json',
    );
    Object.defineProperty(input, 'files', { value: [good], configurable: true });
    input.dispatchEvent(new Event('change', { bubbles: true }));
    await tick();
    await tick();
    expect((local()[CONFIG_KEY] as any).filters).toEqual(['imported']);
    expect($<HTMLTextAreaElement>('filters').value).toBe('imported');
  });
});
