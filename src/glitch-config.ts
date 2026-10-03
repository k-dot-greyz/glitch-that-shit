/**
 * GlitchConfig — the word/phrase/ad filtering half of glitch-that-shit.
 * Stored in chrome.storage.local (filter lists can exceed sync quotas).
 *
 * Everything that crosses a trust boundary (storage, import files, popup input)
 * goes through validateConfig()/parseFilterEntry() first ("hostile edge" rule
 * from CONTRIBUTING §3.4). Invalid input is dropped with a readable error,
 * never thrown into the content script.
 */

export const EFFECTS = ['glitch', 'pixelate', 'blur', 'scramble', 'rainbow', 'sparkle', 'redact'] as const;
export type EffectType = (typeof EFFECTS)[number];

export const INTENSITIES = ['subtle', 'medium', 'extreme'] as const;
export type Intensity = (typeof INTENSITIES)[number];

export const CONFIG_SCHEMA_VERSION = 1;
export const MAX_FILTERS = 500;
export const MAX_FILTER_LENGTH = 200;
export const MAX_SITES = 500;

export interface GlitchConfig {
  schema: number;
  enabled: boolean;
  /** Plain words/phrases, or `/regex/flags` entries (flags: i, u). */
  filters: string[];
  effect: EffectType;
  intensity: Intensity;
  caseSensitive: boolean;
  /** Plain entries only match whole words (Unicode-aware boundaries). */
  wholeWord: boolean;
  /** Native tooltip with the original text. */
  showOriginalOnHover: boolean;
  /** First click on a glitched word reveals it. */
  clickToReveal: boolean;
  /** Apply the effect to well-known ad containers (visual censoring, no removal). */
  glitchAds: boolean;
  /** Hostnames where the extension is paused (subdomains included). */
  disabledSites: string[];
}

export const DEFAULT_CONFIG: Readonly<GlitchConfig> = Object.freeze({
  schema: CONFIG_SCHEMA_VERSION,
  enabled: true,
  filters: ['sponsored', 'advertisement', 'promoted'],
  effect: 'glitch',
  intensity: 'medium',
  caseSensitive: false,
  wholeWord: true,
  showOriginalOnHover: true,
  clickToReveal: true,
  glitchAds: false,
  disabledSites: [],
} as GlitchConfig);

export function defaultConfig(): GlitchConfig {
  return { ...DEFAULT_CONFIG, filters: [...DEFAULT_CONFIG.filters], disabledSites: [] };
}

export type ParsedFilter =
  | { kind: 'literal'; text: string }
  | { kind: 'regex'; source: string; flags: string };

export type ParseResult = { ok: true; filter: ParsedFilter } | { ok: false; error: string };

const REGEX_ENTRY = /^\/(.+)\/([a-z]*)$/s;

/** Parse one user-entered filter line. */
export function parseFilterEntry(raw: unknown): ParseResult {
  if (typeof raw !== 'string') return { ok: false, error: 'Filter must be text' };
  const entry = raw.trim();
  if (!entry) return { ok: false, error: 'Filter is empty' };
  if (entry.length > MAX_FILTER_LENGTH) {
    return { ok: false, error: `Filter longer than ${MAX_FILTER_LENGTH} characters` };
  }
  const m = REGEX_ENTRY.exec(entry);
  if (!m) return { ok: true, filter: { kind: 'literal', text: entry } };

  const [, source, flags] = m;
  if (/[^iu]/.test(flags) || new Set(flags).size !== flags.length) {
    return { ok: false, error: `Unsupported regex flags "${flags}" (allowed: i, u)` };
  }
  let re: RegExp;
  try {
    re = new RegExp(source, flags);
  } catch (e) {
    return { ok: false, error: `Invalid regex: ${(e as Error).message}` };
  }
  if (re.test('')) return { ok: false, error: 'Regex matches empty text' };
  return { ok: true, filter: { kind: 'regex', source, flags } };
}

/** Normalize a hostname / URL / pattern the user typed into a bare hostname. */
export function normalizeHost(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  let s = raw.trim().toLowerCase();
  if (!s) return null;
  if (s.includes('://')) {
    try {
      const u = new URL(s);
      if (u.protocol !== 'http:' && u.protocol !== 'https:') return null; // chrome://, about:, file:// have no site
      s = u.hostname;
    } catch {
      return null;
    }
  }
  s = s.replace(/^\*\./, '').replace(/\/.*$/, '').replace(/:\d+$/, '').replace(/\.$/, '');
  if (!/^[a-z0-9.-]+$/.test(s) || s.startsWith('.') || s.includes('..')) return null;
  return s;
}

/** True if `hostname` equals or is a subdomain of any disabled site. */
export function isSiteDisabled(hostname: string, disabledSites: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, '');
  return disabledSites.some((site) => host === site || host.endsWith(`.${site}`));
}

export interface ValidationResult {
  config: GlitchConfig;
  errors: string[];
}

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T, name: string, errors: string[]): T {
  if (value === undefined) return fallback;
  if (typeof value === 'string' && (allowed as readonly string[]).includes(value)) return value as T;
  errors.push(`${name}: "${String(value)}" is not one of ${allowed.join(', ')}`);
  return fallback;
}

function pickBool(value: unknown, fallback: boolean, name: string, errors: string[]): boolean {
  if (value === undefined) return fallback;
  if (typeof value === 'boolean') return value;
  errors.push(`${name}: expected true/false`);
  return fallback;
}

/**
 * Sanitize anything into a valid GlitchConfig. Unknown keys are dropped,
 * invalid values fall back to defaults, invalid filters are skipped.
 * Never throws.
 */
export function validateConfig(input: unknown): ValidationResult {
  const errors: string[] = [];
  const d = defaultConfig();
  if (typeof input !== 'object' || input === null || Array.isArray(input)) {
    return { config: d, errors: ['Config must be a JSON object'] };
  }
  const o = input as Record<string, unknown>;

  let filters = d.filters;
  if (o.filters !== undefined) {
    if (!Array.isArray(o.filters)) {
      errors.push('filters: expected a list');
    } else {
      const seen = new Set<string>();
      filters = [];
      for (const raw of o.filters) {
        const res = parseFilterEntry(raw);
        if (!res.ok) {
          errors.push(`filter "${String(raw).slice(0, 40)}": ${res.error}`);
          continue;
        }
        const key = String(raw).trim();
        if (seen.has(key)) continue;
        if (filters.length >= MAX_FILTERS) {
          errors.push(`filters: more than ${MAX_FILTERS} entries, extra entries ignored`);
          break;
        }
        seen.add(key);
        filters.push(key);
      }
    }
  }

  let disabledSites: string[] = [];
  if (o.disabledSites !== undefined) {
    if (!Array.isArray(o.disabledSites)) {
      errors.push('disabledSites: expected a list');
    } else {
      for (const raw of o.disabledSites) {
        const host = normalizeHost(raw);
        if (!host) {
          errors.push(`disabledSites: "${String(raw).slice(0, 40)}" is not a hostname`);
          continue;
        }
        if (!disabledSites.includes(host) && disabledSites.length < MAX_SITES) disabledSites.push(host);
      }
    }
  }

  const config: GlitchConfig = {
    schema: CONFIG_SCHEMA_VERSION,
    enabled: pickBool(o.enabled, d.enabled, 'enabled', errors),
    filters,
    effect: pickEnum(o.effect, EFFECTS, d.effect, 'effect', errors),
    intensity: pickEnum(o.intensity, INTENSITIES, d.intensity, 'intensity', errors),
    caseSensitive: pickBool(o.caseSensitive, d.caseSensitive, 'caseSensitive', errors),
    wholeWord: pickBool(o.wholeWord, d.wholeWord, 'wholeWord', errors),
    showOriginalOnHover: pickBool(o.showOriginalOnHover, d.showOriginalOnHover, 'showOriginalOnHover', errors),
    clickToReveal: pickBool(o.clickToReveal, d.clickToReveal, 'clickToReveal', errors),
    glitchAds: pickBool(o.glitchAds, d.glitchAds, 'glitchAds', errors),
    disabledSites,
  };
  return { config, errors };
}

/**
 * Migrate v0.1 flat chrome.storage.local keys (filterList, effectType,
 * effectIntensity, caseSensitive, enabled) into a GlitchConfig.
 * Returns null when no legacy keys are present.
 */
export function migrateLegacy(raw: Record<string, unknown>): GlitchConfig | null {
  const legacyKeys = ['filterList', 'effectType', 'effectIntensity', 'caseSensitive', 'enabled'];
  if (!legacyKeys.some((k) => k in raw)) return null;
  return validateConfig({
    enabled: raw.enabled,
    filters: raw.filterList,
    effect: raw.effectType,
    intensity: raw.effectIntensity,
    caseSensitive: raw.caseSensitive,
  }).config;
}

/** Next effect in the cycle (keyboard shortcut / popup button). */
export function nextEffect(current: EffectType): EffectType {
  const i = EFFECTS.indexOf(current);
  return EFFECTS[(i + 1) % EFFECTS.length];
}
