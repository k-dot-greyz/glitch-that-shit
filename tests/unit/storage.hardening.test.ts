/** storage.ts hardening: serialized writes, deletion-safe onChange, sanitized reads. */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { storage, _resetStorageForTest } from '../../src/storage';
import { DEFAULT_PROFILE, sanitizeProfile } from '../../src/site-profile.schema';

const data = () => (globalThis as any).__storageData as Record<string, unknown>;
const listeners = () => (globalThis as any).__storageListeners as Array<(c: any, a: string) => void>;

describe('storage hardening', () => {
  beforeEach(() => {
    for (const k of Object.keys(data())) delete data()[k];
    _resetStorageForTest();
  });

  it('concurrent setProfile calls with different keys all land', async () => {
    await Promise.all([
      storage.setProfile({ sensoryMode: 'glitch' }),
      storage.setProfile({ baseHue: 200 }),
      storage.setProfile({ colorBlindMode: 'tritanopia' }),
    ]);
    expect(await storage.getProfile()).toMatchObject({ sensoryMode: 'glitch', baseHue: 200, colorBlindMode: 'tritanopia' });
  });

  it('last enqueued write wins for the same key', async () => {
    await Promise.all([1, 2, 3].map((h) => storage.setProfile({ baseHue: h })));
    expect((await storage.getProfile()).baseHue).toBe(3);
  });

  it('onChange ignores deletions (newValue undefined)', () => {
    const cb = vi.fn();
    storage.onChange(cb);
    listeners()[listeners().length - 1]({ zenProfile: { oldValue: DEFAULT_PROFILE } }, 'sync');
    expect(cb).not.toHaveBeenCalled();
  });

  it('getProfile sanitizes hostile stored values', async () => {
    data().zenProfile = { ...DEFAULT_PROFILE, sensoryMode: 'x" onload="', baseLightness: NaN, maxChroma: -5 };
    const p = await storage.getProfile();
    expect(p.sensoryMode).toBe(DEFAULT_PROFILE.sensoryMode);
    expect(p.baseLightness).toBe(DEFAULT_PROFILE.baseLightness);
    expect(p.maxChroma).toBe(0);
  });

  it('getProfile returns defaults if storage throws', async () => {
    (globalThis as any).__chromeMock.storage.sync.get.mockRejectedValueOnce(new Error('x'));
    expect(await storage.getProfile()).toEqual(DEFAULT_PROFILE);
  });
});

describe('sanitizeProfile', () => {
  it('passes valid profiles through and drops unknown keys', () => {
    expect(sanitizeProfile({ ...DEFAULT_PROFILE, evil: 1 })).toEqual(DEFAULT_PROFILE);
  });
  it('returns defaults for non-objects', () => {
    for (const v of [null, 1, 'x', []]) expect(sanitizeProfile(v)).toEqual(DEFAULT_PROFILE);
  });
  it('clamps numeric rails', () => {
    expect(sanitizeProfile({ baseHue: 999, baseLightness: 2 })).toMatchObject({ baseHue: 360, baseLightness: 1 });
  });
});
