import { describe, it, expect, beforeEach, vi } from 'vitest';
import { configStore, CONFIG_KEY } from '../../src/config-store';
import { defaultConfig } from '../../src/glitch-config';

const local = () => (globalThis as unknown as { __localData: Record<string, unknown> }).__localData;
const chromeMock = () => (globalThis as unknown as { __chromeMock: any }).__chromeMock;

describe('configStore', () => {
  beforeEach(() => {
    for (const k of Object.keys(local())) delete local()[k];
    vi.clearAllMocks();
  });

  it('returns defaults when empty', async () => {
    expect(await configStore.get()).toEqual(defaultConfig());
  });

  it('sanitizes hostile stored data', async () => {
    local()[CONFIG_KEY] = { effect: '"><script>', filters: ['ok', '/(/'], enabled: 'nope' };
    const c = await configStore.get();
    expect(c.effect).toBe('glitch');
    expect(c.filters).toEqual(['ok']);
    expect(c.enabled).toBe(true);
  });

  it('falls back to a safe OFF state if storage throws', async () => {
    chromeMock().storage.local.get.mockRejectedValueOnce(new Error('boom'));
    expect((await configStore.get()).enabled).toBe(false);
  });

  it('update() merges, validates and reports errors', async () => {
    const r = await configStore.update({ filters: ['a', '/(/'], effect: 'redact' });
    expect(r.config.filters).toEqual(['a']);
    expect(r.config.effect).toBe('redact');
    expect(r.errors).toHaveLength(1);
    expect((local()[CONFIG_KEY] as any).effect).toBe('redact');
  });

  it('concurrent updates do not lose writes', async () => {
    await Promise.all([
      configStore.update({ effect: 'blur' }),
      configStore.update({ intensity: 'extreme' }),
      configStore.update({ glitchAds: true }),
    ]);
    expect(await configStore.get()).toMatchObject({ effect: 'blur', intensity: 'extreme', glitchAds: true });
  });

  it('a failed write does not block the queue', async () => {
    chromeMock().storage.local.set.mockRejectedValueOnce(new Error('quota'));
    await expect(configStore.update({ effect: 'blur' })).rejects.toThrow('quota');
    await configStore.update({ effect: 'rainbow' });
    expect((await configStore.get()).effect).toBe('rainbow');
  });

  it('addFilter appends and dedupes', async () => {
    await configStore.addFilter(' crypto ');
    const r = await configStore.addFilter('crypto');
    expect(r.config.filters.filter((f) => f === 'crypto')).toHaveLength(1);
  });

  it('replace() and reset()', async () => {
    await configStore.replace({ filters: ['x'], effect: 'sparkle' });
    expect((await configStore.get()).filters).toEqual(['x']);
    await configStore.reset();
    expect(await configStore.get()).toEqual(defaultConfig());
  });

  it('ensureInitialized migrates v0.1 flat keys and removes them', async () => {
    Object.assign(local(), { filterList: ['legacy'], effectType: 'blur', enabled: true, version: '0.1.0' });
    const c = await configStore.ensureInitialized();
    expect(c.filters).toEqual(['legacy']);
    expect(c.effect).toBe('blur');
    expect(Object.keys(local())).toEqual([CONFIG_KEY]);
  });

  it('ensureInitialized keeps an existing config', async () => {
    await configStore.update({ effect: 'redact' });
    expect((await configStore.ensureInitialized()).effect).toBe('redact');
  });

  it('onChange delivers validated config and ignores deletions/other areas', async () => {
    const cb = vi.fn();
    configStore.onChange(cb);
    const listeners = (globalThis as any).__storageListeners as Array<(c: any, a: string) => void>;
    const l = listeners[listeners.length - 1];
    l({ [CONFIG_KEY]: { oldValue: {}, newValue: undefined } }, 'local');
    l({ [CONFIG_KEY]: { newValue: { effect: 'blur' } } }, 'sync');
    l({ other: { newValue: 1 } }, 'local');
    expect(cb).not.toHaveBeenCalled();
    l({ [CONFIG_KEY]: { newValue: { effect: 'blur', filters: ['/(/'] } } }, 'local');
    expect(cb).toHaveBeenCalledWith(expect.objectContaining({ effect: 'blur', filters: [] }));
  });
});
