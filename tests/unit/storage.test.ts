/**
 * Tests for src/storage.ts
 * Covers: getProfile, setProfile, resetProfile, onChange.
 * Uses the chrome mock installed in tests/helpers/setup.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage, _clearCacheForTest } from '../../src/storage';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';
import type { ZenProfile } from '../../src/site-profile.schema';

// Access the shared mock internals set up in setup.ts
const storageData = (globalThis as Record<string, unknown>).__storageData as Record<string, unknown>;
const storageListeners = (globalThis as Record<string, unknown>).__storageListeners as Array<
  (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
>;

function clearStorage() {
  for (const k of Object.keys(storageData)) {
    delete storageData[k];
  }
  storageListeners.length = 0;
  // Reset write-through cache so tests that expect a cold storage read aren't
  // served a cached value from a previous test.
  _clearCacheForTest();
}

beforeEach(() => {
  clearStorage();
  vi.clearAllMocks();
});

// ─── getProfile ───────────────────────────────────────────────────────────────

describe('storage.getProfile', () => {
  it('returns DEFAULT_PROFILE when nothing is stored', async () => {
    const profile = await storage.getProfile();
    expect(profile).toEqual(DEFAULT_PROFILE);
  });

  it('returns the stored profile when one exists', async () => {
    const customProfile: ZenProfile = {
      ...DEFAULT_PROFILE,
      sensoryMode: 'glitch',
      baseHue: 270,
    };
    storageData['zenProfile'] = customProfile;

    const profile = await storage.getProfile();
    expect(profile).toEqual(customProfile);
    expect(profile.sensoryMode).toBe('glitch');
    expect(profile.baseHue).toBe(270);
  });

  it('calls chrome.storage.sync.get with the correct key', async () => {
    await storage.getProfile();
    expect(chrome.storage.sync.get).toHaveBeenCalledWith('zenProfile');
  });

  it('returns the exact DEFAULT_PROFILE reference shape (all keys)', async () => {
    const profile = await storage.getProfile();
    const keys: Array<keyof ZenProfile> = [
      'id', 'sensoryMode', 'colorBlindMode', 'baseLightness',
      'maxChroma', 'baseHue', 'reduceMotion', 'dynamicRangeClamp',
    ];
    for (const key of keys) {
      expect(profile).toHaveProperty(key);
    }
  });
});

// ─── setProfile ───────────────────────────────────────────────────────────────

describe('storage.setProfile', () => {
  it('merges a partial patch into the existing profile', async () => {
    // Start from default
    await storage.setProfile({ sensoryMode: 'glitch' });

    // Verify stored value is merged
    const stored = storageData['zenProfile'] as ZenProfile;
    expect(stored.sensoryMode).toBe('glitch');
    // Other fields unchanged
    expect(stored.colorBlindMode).toBe(DEFAULT_PROFILE.colorBlindMode);
    expect(stored.baseLightness).toBe(DEFAULT_PROFILE.baseLightness);
  });

  it('merges multiple keys in one call', async () => {
    await storage.setProfile({ baseHue: 90, maxChroma: 0.12 });

    const stored = storageData['zenProfile'] as ZenProfile;
    expect(stored.baseHue).toBe(90);
    expect(stored.maxChroma).toBe(0.12);
    expect(stored.sensoryMode).toBe(DEFAULT_PROFILE.sensoryMode);
  });

  it('successive patches accumulate correctly', async () => {
    await storage.setProfile({ sensoryMode: 'calm' });
    await storage.setProfile({ colorBlindMode: 'tritanopia' });

    const stored = storageData['zenProfile'] as ZenProfile;
    expect(stored.sensoryMode).toBe('calm');
    expect(stored.colorBlindMode).toBe('tritanopia');
  });

  it('calls chrome.storage.sync.set with the zenProfile key', async () => {
    await storage.setProfile({ reduceMotion: false });
    expect(chrome.storage.sync.set).toHaveBeenCalledWith(
      expect.objectContaining({ zenProfile: expect.any(Object) })
    );
  });
});

// ─── resetProfile ─────────────────────────────────────────────────────────────

describe('storage.resetProfile', () => {
  it('overwrites any existing profile with DEFAULT_PROFILE', async () => {
    // First set something custom
    await storage.setProfile({ sensoryMode: 'high-contrast', baseHue: 300 });
    // Then reset
    await storage.resetProfile();

    const stored = storageData['zenProfile'] as ZenProfile;
    expect(stored).toEqual(DEFAULT_PROFILE);
  });

  it('calls chrome.storage.sync.set with DEFAULT_PROFILE', async () => {
    await storage.resetProfile();
    expect(chrome.storage.sync.set).toHaveBeenCalledWith({ zenProfile: DEFAULT_PROFILE });
  });

  it('after reset, getProfile returns DEFAULT_PROFILE', async () => {
    await storage.setProfile({ baseHue: 45 });
    await storage.resetProfile();
    const profile = await storage.getProfile();
    expect(profile).toEqual(DEFAULT_PROFILE);
  });
});

// ─── onChange ─────────────────────────────────────────────────────────────────

describe('storage.onChange', () => {
  it('registers a listener via chrome.storage.onChanged.addListener', () => {
    const cb = vi.fn();
    storage.onChange(cb);
    expect(chrome.storage.onChanged.addListener).toHaveBeenCalledOnce();
  });

  it('callback fires when zenProfile changes in sync area', async () => {
    const cb = vi.fn();
    storage.onChange(cb);

    // Trigger a storage change by setting a profile
    await storage.setProfile({ sensoryMode: 'glitch' });

    expect(cb).toHaveBeenCalledOnce();
    const receivedProfile = cb.mock.calls[0][0] as ZenProfile;
    expect(receivedProfile.sensoryMode).toBe('glitch');
  });

  it('callback receives the full merged profile (newValue)', async () => {
    const cb = vi.fn();
    storage.onChange(cb);

    await storage.setProfile({ baseHue: 200, maxChroma: 0.1 });

    const received = cb.mock.calls[0][0] as ZenProfile;
    expect(received.baseHue).toBe(200);
    expect(received.maxChroma).toBe(0.1);
    // Unchanged fields should still be present
    expect(received.id).toBe(DEFAULT_PROFILE.id);
  });

  it('callback does NOT fire for non-zenProfile keys', () => {
    const cb = vi.fn();
    storage.onChange(cb);

    // Manually simulate a change to a different key
    const changes: Record<string, chrome.storage.StorageChange> = {
      someOtherKey: { oldValue: 'a', newValue: 'b' },
    };
    storageListeners.forEach(l => l(changes, 'sync'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('callback does NOT fire for non-sync areas', () => {
    const cb = vi.fn();
    storage.onChange(cb);

    // Simulate a 'local' area change for zenProfile
    const changes: Record<string, chrome.storage.StorageChange> = {
      zenProfile: { oldValue: DEFAULT_PROFILE, newValue: { ...DEFAULT_PROFILE, baseHue: 99 } },
    };
    storageListeners.forEach(l => l(changes, 'local'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('multiple listeners can be registered independently', async () => {
    const cb1 = vi.fn();
    const cb2 = vi.fn();
    storage.onChange(cb1);
    storage.onChange(cb2);

    await storage.setProfile({ reduceMotion: false });

    expect(cb1).toHaveBeenCalledOnce();
    expect(cb2).toHaveBeenCalledOnce();
  });

  it('callback is NOT called when newValue is absent (storage key deleted)', () => {
    // Trigger: user clears Chrome sync data (Settings → Privacy → Clear browsing data →
    // Sync). Chrome fires onChanged with a StorageChange that has oldValue but no newValue.
    // Without the newValue guard, callback(undefined) propagates to applyTheme(undefined)
    // which throws TypeError on undefined.sensoryMode — crashing silently in the content
    // script context.
    const cb = vi.fn();
    storage.onChange(cb);

    const changes: Record<string, chrome.storage.StorageChange> = {
      zenProfile: { oldValue: DEFAULT_PROFILE } as chrome.storage.StorageChange,
    };
    storageListeners.forEach(l => l(changes, 'sync'));

    expect(cb).not.toHaveBeenCalled();
  });

  it('callback is NOT called when newValue is explicitly undefined', () => {
    const cb = vi.fn();
    storage.onChange(cb);

    const changes: Record<string, chrome.storage.StorageChange> = {
      zenProfile: { oldValue: DEFAULT_PROFILE, newValue: undefined as unknown as ZenProfile },
    };
    storageListeners.forEach(l => l(changes, 'sync'));

    expect(cb).not.toHaveBeenCalled();
  });
});

// ─── Concurrent write safety (cache-based race fix) ───────────────────────────

describe('storage.setProfile — concurrent write safety', () => {
  it('two simultaneous setProfile calls with different patches preserve both patches', async () => {
    // Trigger for the original bug: user quickly moves the hue slider (fires
    // an input event → setProfile({ baseHue })) while also clicking a sensory
    // mode button (fires setProfile({ sensoryMode })). Both calls land their
    // getProfile() read before either write completes, so both see the same
    // current profile. Without the cache fix, the second write only carries its
    // own patch and silently reverts the first caller's change.
    const p1 = storage.setProfile({ baseHue: 270 });
    const p2 = storage.setProfile({ sensoryMode: 'glitch' });
    await Promise.all([p1, p2]);

    const stored = storageData['zenProfile'] as ZenProfile;
    // Both patches must land in the final written value.
    expect(stored.baseHue).toBe(270);
    expect(stored.sensoryMode).toBe('glitch');
    // Unrelated fields stay at their defaults.
    expect(stored.colorBlindMode).toBe(DEFAULT_PROFILE.colorBlindMode);
  });

  it('three simultaneous setProfile calls with distinct keys all survive', async () => {
    await Promise.all([
      storage.setProfile({ baseHue: 90 }),
      storage.setProfile({ sensoryMode: 'high-contrast' }),
      storage.setProfile({ colorBlindMode: 'deuteranopia' }),
    ]);

    const stored = storageData['zenProfile'] as ZenProfile;
    expect(stored.baseHue).toBe(90);
    expect(stored.sensoryMode).toBe('high-contrast');
    expect(stored.colorBlindMode).toBe('deuteranopia');
  });

  it('getProfile returns cached value on second call (no redundant chrome.storage reads)', async () => {
    await storage.getProfile();
    const callsAfterFirst = (chrome.storage.sync.get as ReturnType<typeof vi.fn>).mock.calls.length;

    await storage.getProfile();
    // Cache hit — storage should NOT have been queried again.
    expect((chrome.storage.sync.get as ReturnType<typeof vi.fn>).mock.calls.length).toBe(
      callsAfterFirst,
    );
  });
});