/**
 * Export/import ("hydration/dehydration", CONTRIBUTING §3.5) of the full
 * settings: GlitchConfig + ZenProfile. Imports are validated before persisting.
 */

import { GlitchConfig, validateConfig } from './glitch-config';
import { ZenProfile, sanitizeProfile } from './site-profile.schema';

export const BUNDLE_APP = 'glitch-that-shit';
export const BUNDLE_SCHEMA = 1;
export const MAX_IMPORT_BYTES = 256 * 1024;

export interface SettingsBundle {
  app: typeof BUNDLE_APP;
  schema: number;
  exportedAt: string;
  config: GlitchConfig;
  profile: ZenProfile;
}

export function createBundle(config: GlitchConfig, profile: ZenProfile, now = new Date()): SettingsBundle {
  return { app: BUNDLE_APP, schema: BUNDLE_SCHEMA, exportedAt: now.toISOString(), config, profile };
}

export type ParsedBundle =
  | { ok: true; config: GlitchConfig; profile: ZenProfile | null; warnings: string[] }
  | { ok: false; error: string };

/** Accepts a full bundle, a bare GlitchConfig, or a v0.1 flat export. */
export function parseBundle(text: string): ParsedBundle {
  if (text.length > MAX_IMPORT_BYTES) return { ok: false, error: 'File too large (max 256 KB)' };
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, error: 'Not valid JSON' };
  }
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    return { ok: false, error: 'Expected a JSON object' };
  }
  const o = data as Record<string, unknown>;
  if (o.app === BUNDLE_APP) {
    if (typeof o.schema !== 'number' || o.schema > BUNDLE_SCHEMA) {
      return { ok: false, error: `Unsupported bundle schema ${String(o.schema)}` };
    }
    const { config, errors } = validateConfig(o.config);
    return { ok: true, config, profile: o.profile == null ? null : sanitizeProfile(o.profile), warnings: errors };
  }
  if ('filterList' in o || 'effectType' in o) {
    // v0.1 export (flat chrome.storage.local dump)
    const { config, errors } = validateConfig({
      enabled: o.enabled,
      filters: o.filterList,
      effect: o.effectType,
      intensity: o.effectIntensity,
      caseSensitive: o.caseSensitive,
    });
    return { ok: true, config, profile: null, warnings: errors };
  }
  if ('filters' in o) {
    const { config, errors } = validateConfig(o);
    return { ok: true, config, profile: null, warnings: errors };
  }
  return { ok: false, error: 'Not a glitch-that-shit settings file' };
}
