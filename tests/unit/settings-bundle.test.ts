import { describe, it, expect } from 'vitest';
import { BUNDLE_SCHEMA, createBundle, parseBundle, MAX_IMPORT_BYTES } from '../../src/settings-bundle';
import { defaultConfig } from '../../src/glitch-config';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';

describe('settings bundle', () => {
  it('round-trips export → import', () => {
    const config = { ...defaultConfig(), filters: ['a', '/b/i'], effect: 'redact' as const };
    const profile = { ...DEFAULT_PROFILE, sensoryMode: 'glitch' as const };
    const text = JSON.stringify(createBundle(config, profile, new Date('2026-10-04T00:00:00Z')));
    const r = parseBundle(text);
    expect(r).toEqual({ ok: true, config, profile, warnings: [] });
  });
  it('rejects junk', () => {
    expect(parseBundle('{nope').ok).toBe(false);
    expect(parseBundle('[1,2]').ok).toBe(false);
    expect(parseBundle('{"hello":1}').ok).toBe(false);
    expect(parseBundle('x'.repeat(MAX_IMPORT_BYTES + 1)).ok).toBe(false);
    expect(parseBundle('{"app":"glitch-that-shit","schema":99}').ok).toBe(false);
  });
  it('sanitizes hostile bundle content', () => {
    const r = parseBundle(JSON.stringify({
      app: 'glitch-that-shit', schema: 1,
      config: { filters: ['ok', '/(/'], effect: 'boom' },
      profile: { sensoryMode: '"><img>', baseHue: 'NaN', maxChroma: 99 },
    }));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.filters).toEqual(['ok']);
    expect(r.warnings.length).toBe(2);
    expect(r.profile!.sensoryMode).toBe(DEFAULT_PROFILE.sensoryMode);
    expect(r.profile!.baseHue).toBe(DEFAULT_PROFILE.baseHue);
    expect(r.profile!.maxChroma).toBe(0.4);
  });
  it('imports v0.1 flat exports and bare configs', () => {
    const legacy = parseBundle(JSON.stringify({ filterList: ['x'], effectType: 'blur' }));
    expect(legacy.ok && legacy.config.filters).toEqual(['x']);
    const bare = parseBundle(JSON.stringify({ filters: ['y'] }));
    expect(bare.ok && bare.config.filters).toEqual(['y']);
  });

  it('rejects future bundle schema (forward-compat ablation)', () => {
    const r = parseBundle(
      JSON.stringify({
        app: 'glitch-that-shit',
        schema: BUNDLE_SCHEMA + 1,
        config: defaultConfig(),
        profile: DEFAULT_PROFILE,
      }),
    );
    expect(r).toEqual({ ok: false, error: 'Unsupported bundle schema 2' });
  });

  it('does not treat typosquat app + legacy keys as a signed bundle', () => {
    const r = parseBundle(
      JSON.stringify({
        app: 'glitch-that-shit-evil',
        schema: 1,
        filterList: ['inject'],
        effectType: 'redact',
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.filters).toEqual(['inject']);
    expect(r.profile).toBeNull();
  });

  it('sanitizes config when app matches but JSON carries pollution keys', () => {
    const r = parseBundle(
      JSON.stringify({
        app: 'glitch-that-shit',
        schema: 1,
        config: JSON.parse('{"filters":["ok"],"__proto__":{"owned":true},"effect":"glitch"}'),
        profile: null,
      }),
    );
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.config.filters).toEqual(['ok']);
    expect(({} as Record<string, unknown>).owned).toBeUndefined();
  });
});
