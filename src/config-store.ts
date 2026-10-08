/**
 * chrome.storage.local wrapper for GlitchConfig (filters, effects, sites).
 * Same guarantees as storage.ts: sanitized reads, serialized writes,
 * deletion-safe onChange. Includes v0.1 flat-key migration.
 */

import { GlitchConfig, defaultConfig, migrateLegacy, validateConfig } from './glitch-config';

export const CONFIG_KEY = 'glitchConfig';

let writeChain: Promise<unknown> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const next = writeChain.catch(() => {}).then(fn);
  writeChain = next;
  return next;
}

export const configStore = {
  async get(): Promise<GlitchConfig> {
    try {
      const data = await chrome.storage.local.get(CONFIG_KEY);
      const raw = data?.[CONFIG_KEY];
      return raw == null ? defaultConfig() : validateConfig(raw).config;
    } catch {
      // storage unavailable → safe OFF state, not a half-applied filter set
      return { ...defaultConfig(), enabled: false };
    }
  },

  /** Merge a patch; returns the persisted (validated) config plus any validation errors. */
  update(patch: Partial<GlitchConfig>): Promise<{ config: GlitchConfig; errors: string[] }> {
    return enqueue(async () => {
      const current = await configStore.get();
      const result = validateConfig({ ...current, ...patch });
      await chrome.storage.local.set({ [CONFIG_KEY]: result.config });
      return result;
    });
  },

  /** Replace the whole config (import). */
  replace(input: unknown): Promise<{ config: GlitchConfig; errors: string[] }> {
    return enqueue(async () => {
      const result = validateConfig(input);
      await chrome.storage.local.set({ [CONFIG_KEY]: result.config });
      return result;
    });
  },

  reset(): Promise<GlitchConfig> {
    return enqueue(async () => {
      const config = defaultConfig();
      await chrome.storage.local.set({ [CONFIG_KEY]: config });
      return config;
    });
  },

  /** Add a single filter entry (popup quick-add / context menu). */
  async addFilter(entry: string): Promise<{ config: GlitchConfig; errors: string[] }> {
    const current = await configStore.get();
    return configStore.update({ filters: [...current.filters, entry.trim()] });
  },

  /** Install/update hook: migrate v0.1 flat keys or re-validate existing config. */
  ensureInitialized(): Promise<GlitchConfig> {
    return enqueue(async () => {
      const all = (await chrome.storage.local.get(null)) as Record<string, unknown>;
      let config: GlitchConfig;
      if (all[CONFIG_KEY] != null) {
        config = validateConfig(all[CONFIG_KEY]).config;
      } else {
        config = migrateLegacy(all) ?? defaultConfig();
      }
      await chrome.storage.local.set({ [CONFIG_KEY]: config });
      const legacy = ['filterList', 'effectType', 'effectIntensity', 'caseSensitive', 'enabled', 'reduceMotion', 'showTooltips', 'version'];
      const stale = legacy.filter((k) => k in all);
      if (stale.length) await chrome.storage.local.remove(stale);
      return config;
    });
  },

  onChange(callback: (config: GlitchConfig) => void): void {
    chrome.storage.onChanged.addListener((changes, area) => {
      const change = changes[CONFIG_KEY];
      if (area !== 'local' || !change || change.newValue == null) return;
      callback(validateConfig(change.newValue).config);
    });
  },
};
