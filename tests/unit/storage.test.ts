/**
 * Tests for src/storage.ts
 * Covers: getProfile, setProfile, resetProfile, onChange.
 * Uses the chrome mock installed in tests/helpers/setup.ts.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../../src/storage';
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
});