/**
 * chrome.storage.sync wrapper for ZenProfile state.
 * Cross-instance sync: popup ↔ content script ↔ background.
 *
 * - Reads are sanitized (sanitizeProfile) — storage is a trust boundary.
 * - In-memory write-through cache: setProfile/resetProfile merge synchronously
 *   so getProfile never returns a stale profile while chrome.storage.set is
 *   in flight (slider + mode-button overlap).
 * - Coalesced flush: chrome.storage.sync.set is serialized and always writes
 *   the *latest* cache, so a slower earlier IPC cannot clobber a newer merge.
 * - onChange ignores deletions for callbacks (newValue undefined) but drops
 *   the cache so the next get hydrates defaults / current storage.
 *
 * dex_id: 0x7E:0x32
 * Refs: glitch-that-shit#2
 */

import { ZenProfile, DEFAULT_PROFILE, sanitizeProfile } from './site-profile.schema';

const STORAGE_KEY = 'zenProfile';

let cache: ZenProfile | null = null;
let hydratePromise: Promise<ZenProfile> | null = null;
let dirty = false;
let pumping = false;
let pumpTail: Promise<void> = Promise.resolve();
let cacheListenerBound = false;

async function hydrate(): Promise<ZenProfile> {
  bindCacheListener();
  if (cache) return cache;
  if (!hydratePromise) {
    hydratePromise = (async () => {
      try {
        const data = await chrome.storage.sync.get(STORAGE_KEY);
        if (cache) return cache;
        const raw = data?.[STORAGE_KEY];
        cache = raw == null ? { ...DEFAULT_PROFILE } : sanitizeProfile(raw);
        return cache;
      } catch {
        cache ??= { ...DEFAULT_PROFILE };
        return cache;
      }
    })();
  }
  return hydratePromise;
}

function scheduleFlush(): Promise<void> {
  dirty = true;
  const next = pumpTail.catch(() => {}).then(pump);
  pumpTail = next;
  return next;
}

async function pump(): Promise<void> {
  if (pumping) return;
  pumping = true;
  try {
    while (dirty) {
      dirty = false;
      const snapshot = cache;
      if (snapshot) {
        await chrome.storage.sync.set({ [STORAGE_KEY]: snapshot });
      }
    }
  } finally {
    pumping = false;
  }
  if (dirty) return pump();
}

function onSyncChange(changes: Record<string, chrome.storage.StorageChange>, area: string): void {
  const change = changes[STORAGE_KEY];
  if (area !== 'sync' || !change) return;
  if (change.newValue == null) {
    cache = null;
    hydratePromise = null;
    return;
  }
  const next = sanitizeProfile(change.newValue);
  // Skip applying echoes while a local flush is in flight — the cache already
  // holds the merged local truth.
  if (!dirty && !pumping) cache = next;
}

function bindCacheListener(): void {
  if (cacheListenerBound) return;
  cacheListenerBound = true;
  chrome.storage.onChanged.addListener(onSyncChange);
}

export const storage = {
  async getProfile(): Promise<ZenProfile> {
    await hydrate();
    return cache!;
  },

  async setProfile(patch: Partial<ZenProfile>): Promise<void> {
    await hydrate();
    cache = sanitizeProfile({ ...cache!, ...patch });
    return scheduleFlush();
  },

  async resetProfile(): Promise<void> {
    bindCacheListener();
    cache = { ...DEFAULT_PROFILE };
    hydratePromise = Promise.resolve(cache);
    return scheduleFlush();
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

/** Reset module state. Test isolation only — do not call from production code. */
export function _resetStorageForTest(): void {
  cache = null;
  hydratePromise = null;
  dirty = false;
  pumping = false;
  pumpTail = Promise.resolve();
  cacheListenerBound = false;
}
