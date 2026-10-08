import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CONFIG, EFFECTS, EffectType, MAX_FILTERS, defaultConfig, isSiteDisabled, migrateLegacy,
  nextEffect, normalizeHost, parseFilterEntry, validateConfig,
} from '../../src/glitch-config';

describe('parseFilterEntry', () => {
  it('parses plain text as a literal (trimmed)', () => {
    expect(parseFilterEntry('  sponsored ')).toEqual({ ok: true, filter: { kind: 'literal', text: 'sponsored' } });
  });
  it('parses /regex/flags', () => {
    expect(parseFilterEntry('/crypto\\w*/i')).toEqual({ ok: true, filter: { kind: 'regex', source: 'crypto\\w*', flags: 'i' } });
  });
  it.each([
    ['', 'empty'],
    ['   ', 'empty'],
    [42, 'text'],
    ['x'.repeat(201), 'longer'],
    ['/a(/', 'Invalid regex'],
    ['/a/g', 'Unsupported'],
    ['/a/ii', 'Unsupported'],
    ['/a*/', 'empty text'],
    ['/x|/', 'empty text'],
  ])('rejects %j (%s)', (raw, msg) => {
    const r = parseFilterEntry(raw);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toContain(msg);
  });
  it('treats a lone slash-wrapped word without closing flags issue as regex', () => {
    expect(parseFilterEntry('/ad/').ok).toBe(true);
  });
});

describe('normalizeHost / isSiteDisabled', () => {
  it.each([
    ['Example.COM', 'example.com'],
    ['https://news.example.com/path?q=1', 'news.example.com'],
    ['*.example.com', 'example.com'],
    ['example.com:8080', 'example.com'],
    ['example.com/foo', 'example.com'],
  ])('normalizes %s → %s', (raw, want) => expect(normalizeHost(raw)).toBe(want));
  it.each(['', 'not a host!', '..', '.example.com', 'http://', 'chrome://extensions', 'about://blank', 7])('rejects %j', (raw) => expect(normalizeHost(raw)).toBeNull());
  it('matches exact host and subdomains, not lookalikes', () => {
    const sites = ['example.com'];
    expect(isSiteDisabled('example.com', sites)).toBe(true);
    expect(isSiteDisabled('www.example.com', sites)).toBe(true);
    expect(isSiteDisabled('notexample.com', sites)).toBe(false);
    expect(isSiteDisabled('example.com.evil.io', sites)).toBe(false);
  });
});

describe('validateConfig', () => {
  it('returns defaults for non-objects', () => {
    for (const bad of [null, undefined, 3, 'x', []]) {
      const r = validateConfig(bad);
      expect(r.config).toEqual(defaultConfig());
      expect(r.errors.length).toBe(1);
    }
  });
  it('accepts a valid config unchanged', () => {
    const c = { ...defaultConfig(), filters: ['foo', '/bar/i'], effect: 'scramble', disabledSites: ['a.com'] };
    expect(validateConfig(c)).toEqual({ config: c, errors: [] });
  });
  it('drops invalid filters with errors and dedupes', () => {
    const r = validateConfig({ filters: ['ok', 'ok', '/(/', '', 5] });
    expect(r.config.filters).toEqual(['ok']);
    expect(r.errors).toHaveLength(3);
  });
  it('falls back on bad enums and booleans', () => {
    const r = validateConfig({ effect: 'explode', intensity: 'max', enabled: 'yes' });
    expect(r.config.effect).toBe(DEFAULT_CONFIG.effect);
    expect(r.config.intensity).toBe(DEFAULT_CONFIG.intensity);
    expect(r.config.enabled).toBe(true);
    expect(r.errors).toHaveLength(3);
  });
  it('strips unknown keys (no prototype pollution passthrough)', () => {
    const r = validateConfig(JSON.parse('{"__proto__":{"polluted":1},"evil":"<script>"}'));
    expect(Object.keys(r.config).sort()).toEqual(Object.keys(defaultConfig()).sort());
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
  it('caps filter count', () => {
    const r = validateConfig({ filters: Array.from({ length: MAX_FILTERS + 5 }, (_, i) => `w${i}`) });
    expect(r.config.filters).toHaveLength(MAX_FILTERS);
    expect(r.errors.some((e) => e.includes('more than'))).toBe(true);
  });
  it('normalizes and dedupes disabled sites', () => {
    const r = validateConfig({ disabledSites: ['https://A.com/x', 'a.com', 'bad host'] });
    expect(r.config.disabledSites).toEqual(['a.com']);
    expect(r.errors).toHaveLength(1);
  });
  it('defaultConfig returns fresh arrays', () => {
    const a = defaultConfig();
    a.filters.push('x');
    expect(defaultConfig().filters).not.toContain('x');
  });
});

describe('migrateLegacy', () => {
  it('returns null when no legacy keys', () => {
    expect(migrateLegacy({ glitchConfig: {} })).toBeNull();
  });
  it('maps v0.1 flat keys', () => {
    const c = migrateLegacy({ filterList: ['ad', 'promo'], effectType: 'blur', effectIntensity: 'extreme', caseSensitive: true, enabled: false });
    expect(c).toMatchObject({ filters: ['ad', 'promo'], effect: 'blur', intensity: 'extreme', caseSensitive: true, enabled: false });
  });
});

describe('nextEffect', () => {
  it('cycles through every effect and wraps', () => {
    let e: EffectType = EFFECTS[0];
    const seen: EffectType[] = [e];
    for (let i = 1; i < EFFECTS.length; i++) seen.push((e = nextEffect(e)));
    expect(seen).toEqual([...EFFECTS]);
    expect(nextEffect(EFFECTS[EFFECTS.length - 1])).toBe(EFFECTS[0]);
  });
});
