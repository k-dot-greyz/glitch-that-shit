/**
 * chrome.storage.sync wrapper for ZenProfile state.
 * Cross-instance sync: popup ↔ content script ↔ background.
 *
 * dex_id: 0x7E:0x32
 * Refs: glitch-that-shit#2
 */

import { ZenProfile, DEFAULT_PROFILE } from './site-profile.schema';

const STORAGE_KEY = 'zenProfile';

// Write-through cache that eliminates the read-modify-write race in setProfile.
//
// Without it, two concurrent setProfile calls (e.g. slider input fires while a
// mode button click is also resolving) both read the same pre-write profile from
// storage, then each write only their own patch — the second write silently
// reverts the first caller's changes. This is a silent data-loss path for
// accessibility settings (colorblind mode, contrast, hue).
//
// With the cache, setProfile merges patches into _cache SYNCHRONOUSLY before
// the async storage write. The second concurrent caller reads the already-merged
// cache, so both patches accumulate correctly regardless of write ordering.
let _cache: ZenProfile | null = null;

export const storage = {
  async getProfile(): Promise<ZenProfile> {
    if (_cache !== null) return _cache;
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    // Use ??= so a concurrent getProfile that already set _cache wins.
    _cache ??= (data[STORAGE_KEY] as ZenProfile) ?? DEFAULT_PROFILE;
    return _cache;
  },

  async setProfile(patch: Partial<ZenProfile>): Promise<void> {
    if (_cache === null) {
      // Cold-cache path: read from storage once.
      const data = await chrome.storage.sync.get(STORAGE_KEY);
      _cache ??= (data[STORAGE_KEY] as ZenProfile) ?? DEFAULT_PROFILE;
    }
    // Synchronous merge: a second concurrent setProfile sees this updated state.
    _cache = { ..._cache, ...patch };
    await chrome.storage.sync.set({ [STORAGE_KEY]: _cache });
  },

  async resetProfile(): Promise<void> {
    _cache = { ...DEFAULT_PROFILE };
    await chrome.storage.sync.set({ [STORAGE_KEY]: _cache });
  },

  /** Subscribe to profile changes — fires whenever popup or another tab updates. */
  onChange(callback: (profile: ZenProfile) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) {
        const newValue = changes[STORAGE_KEY].newValue as ZenProfile | undefined;
        // newValue is absent when the key is deleted (e.g. user clears Chrome
        // sync data). Guard before calling callback — callers expect a valid
        // ZenProfile and would throw a TypeError on undefined.
        if (newValue != null) {
          _cache = newValue;
          callback(newValue);
        }
      }
    });
  },
};

/**
 * Reset the in-memory cache to null.
 * Exported for test isolation only — do not call from production code.
 */
export function _clearCacheForTest(): void {
  _cache = null;
}
