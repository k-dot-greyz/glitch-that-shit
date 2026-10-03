/**
 * chrome.storage.sync wrapper for ZenProfile state.
 * Cross-instance sync: popup ↔ content script ↔ background.
 *
 * - Reads are sanitized (sanitizeProfile) — storage is a trust boundary.
 * - setProfile() read-modify-writes are serialized through a promise chain so
 *   rapid slider/button input can't lose updates (supersedes PR #17/#18).
 * - onChange ignores deletions (newValue undefined, e.g. sync cleared).
 *
 * dex_id: 0x7E:0x32
 * Refs: glitch-that-shit#2
 */

import { ZenProfile, DEFAULT_PROFILE, sanitizeProfile } from './site-profile.schema';

const STORAGE_KEY = 'zenProfile';

let writeChain: Promise<void> = Promise.resolve();

export const storage = {
  async getProfile(): Promise<ZenProfile> {
    try {
      const data = await chrome.storage.sync.get(STORAGE_KEY);
      const raw = data?.[STORAGE_KEY];
      return raw == null ? DEFAULT_PROFILE : sanitizeProfile(raw);
    } catch {
      return DEFAULT_PROFILE; // storage unavailable → safe defaults
    }
  },

  setProfile(patch: Partial<ZenProfile>): Promise<void> {
    const next = writeChain
      .catch(() => {})
      .then(async () => {
        const current = await storage.getProfile();
        await chrome.storage.sync.set({ [STORAGE_KEY]: sanitizeProfile({ ...current, ...patch }) });
      });
    writeChain = next;
    return next;
  },

  resetProfile(): Promise<void> {
    const next = writeChain
      .catch(() => {})
      .then(() => chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_PROFILE }));
    writeChain = next;
    return next;
  },

  /** Subscribe to profile changes — fires whenever popup or another tab updates. */
  onChange(callback: (profile: ZenProfile) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      const change = changes[STORAGE_KEY];
      if (area !== 'sync' || !change || change.newValue == null) return;
      callback(sanitizeProfile(change.newValue));
    });
  },
};
