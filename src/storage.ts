/**
 * chrome.storage.sync wrapper for ZenProfile state.
 * Cross-instance sync: popup ↔ content script ↔ background.
 *
 * dex_id: 0x7E:0x32
 * Refs: glitch-that-shit#2
 */

import { ZenProfile, DEFAULT_PROFILE } from './site-profile.schema';

const STORAGE_KEY = 'zenProfile';

/**
 * Serialises concurrent setProfile calls so that each write always reads the
 * state that the previous write committed.  Without this, two rapid UI
 * interactions (e.g. clicking a mode button while dragging a slider) both read
 * the same stale profile and the second write silently overwrites the first
 * write's change.
 */
let _writeChain: Promise<void> = Promise.resolve();

export const storage = {
  async getProfile(): Promise<ZenProfile> {
    const data = await chrome.storage.sync.get(STORAGE_KEY);
    return (data[STORAGE_KEY] as ZenProfile) ?? DEFAULT_PROFILE;
  },

  async setProfile(patch: Partial<ZenProfile>): Promise<void> {
    const pending = _writeChain
      .catch(() => {})  // a previous write failure must not block the queue
      .then(async () => {
        const data = await chrome.storage.sync.get(STORAGE_KEY);
        const current = (data[STORAGE_KEY] as ZenProfile) ?? DEFAULT_PROFILE;
        await chrome.storage.sync.set({
          [STORAGE_KEY]: { ...current, ...patch },
        });
      });
    _writeChain = pending;
    return pending;
  },

  async resetProfile(): Promise<void> {
    await chrome.storage.sync.set({ [STORAGE_KEY]: DEFAULT_PROFILE });
  },

  /** Subscribe to profile changes — fires whenever popup or another tab updates. */
  onChange(callback: (profile: ZenProfile) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      if (area === 'sync' && changes[STORAGE_KEY]) {
        callback(changes[STORAGE_KEY].newValue as ZenProfile);
      }
    });
  },
};
