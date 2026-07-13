/**
 * Security boundary tests for src/storage.ts
 * Attack surface: corrupted sync storage, prototype pollution, partial profiles.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { storage } from '../../src/storage';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';
import { SecurityHarness } from '../helpers/security-harness';

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

describe('storage — hostile sync payloads (SecurityHarness)', () => {
  const harness = new SecurityHarness();

  beforeEach(() => {
    clearStorage();
    vi.clearAllMocks();
  });

  it('returns DEFAULT_PROFILE when storage key is absent', async () => {
    const profile = await storage.getProfile();
    expect(profile).toEqual(DEFAULT_PROFILE);
  });

  it('passes through corrupted profile without validation (documents gap)', async () => {
    const corrupt = harness.corruptStorageBlob({
      sensoryMode: harness.catalog.attributeInjectionSensoryModes[0],
      baseLightness: 'not-a-number',
      maxChroma: null,
      extraMaliciousField: '<script>alert(1)</script>',
    });
    storageData[harness.catalog.storageKey] = corrupt;

    const profile = await storage.getProfile();
    expect(profile.sensoryMode).toBe(harness.catalog.attributeInjectionSensoryModes[0]);
    expect(profile.baseLightness).toBe('not-a-number');
    expect((profile as Record<string, unknown>).extraMaliciousField).toBe('<script>alert(1)</script>');
  });

  it('merges hostile partial patches without sanitizing', async () => {
    await storage.setProfile({
      sensoryMode: harness.catalog.attributeInjectionSensoryModes[1] as never,
    });

    const stored = storageData[harness.catalog.storageKey] as Record<string, unknown>;
    expect(stored.sensoryMode).toBe(harness.catalog.attributeInjectionSensoryModes[1]);
  });

  it.each(harness.catalog.prototypePollutionKeys)(
    'setProfile does not pollute Object.prototype via key: %s',
    async (key) => {
      await storage.setProfile({ [key]: { polluted: true } } as never);
      expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
    },
  );

  it('onChange delivers hostile newValue verbatim to listeners', async () => {
    const cb = vi.fn();
    storage.onChange(cb);

    const hostile = harness.corruptProfile({
      id: harness.catalog.agenticInstructionStrings[0],
      sensoryMode: 'glitch' as const,
    });
    storageData[harness.catalog.storageKey] = hostile;
    const changes: Record<string, chrome.storage.StorageChange> = {
      [harness.catalog.storageKey]: { oldValue: DEFAULT_PROFILE, newValue: hostile },
    };
    storageListeners.forEach(l => l(changes, 'sync'));

    expect(cb).toHaveBeenCalledOnce();
    expect(cb.mock.calls[0][0].id).toBe(harness.catalog.agenticInstructionStrings[0]);
  });

  it('resetProfile clears hostile state back to DEFAULT_PROFILE', async () => {
    storageData[harness.catalog.storageKey] = harness.corruptStorageBlob({
      sensoryMode: harness.catalog.attributeInjectionSensoryModes[2],
    });
    await storage.resetProfile();
    expect(storageData[harness.catalog.storageKey]).toEqual(DEFAULT_PROFILE);
  });
});
