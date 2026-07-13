/**
 * Tests for src/theme-registry.ts
 * Covers: generateThemeVariables, applyTheme, removeTheme.
 * HDR detection uses the window.matchMedia mock from setup.ts.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  generateThemeVariables,
  applyTheme,
  removeTheme,
} from '../../src/theme-registry';
import { DEFAULT_PROFILE, COLORBLIND_HUE_OFFSETS } from '../../src/site-profile.schema';
import type { ZenProfile } from '../../src/site-profile.schema';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function mockHDR(isHDR: boolean) {
  vi.mocked(window.matchMedia).mockImplementation((query: string) => ({
    matches: isHDR,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
}

function makeProfile(overrides: Partial<ZenProfile> = {}): ZenProfile {
  return { ...DEFAULT_PROFILE, ...overrides };
}

// ─── generateThemeVariables ───────────────────────────────────────────────────

describe('generateThemeVariables', () => {
  beforeEach(() => {
    mockHDR(false);
  });

  it('returns a non-empty CSS string', () => {
    const css = generateThemeVariables(DEFAULT_PROFILE);
    expect(typeof css).toBe('string');
    expect(css.trim().length).toBeGreaterThan(0);
  });

  it('contains all six zen CSS custom properties', () => {
    const css = generateThemeVariables(DEFAULT_PROFILE);
    expect(css).toContain('--zen-bg:');
    expect(css).toContain('--zen-surface:');
    expect(css).toContain('--zen-text:');
    expect(css).toContain('--zen-muted:');
    expect(css).toContain('--zen-accent:');
    expect(css).toContain('--zen-border:');
    expect(css).toContain('--zen-transition:');
  });

  it('outputs oklch() color functions', () => {
    const css = generateThemeVariables(DEFAULT_PROFILE);
    const oklchCount = (css.match(/oklch\(/g) ?? []).length;
    expect(oklchCount).toBe(6); // bg, surface, text, muted, accent, border
  });

  it('uses baseLightness as background L value', () => {
    const profile = makeProfile({ baseLightness: 0.20, maxChroma: 0, baseHue: 180 });
    const css = generateThemeVariables(profile);
    expect(css).toContain('oklch(0.2 0 180)');
  });

  it('surface L is baseLightness + 0.04', () => {
    const profile = makeProfile({ baseLightness: 0.20, maxChroma: 0, baseHue: 180 });
    const css = generateThemeVariables(profile);
    // JS float: 0.20 + 0.04 = 0.24000000000000002
    expect(css).toContain(`oklch(${0.20 + 0.04} 0 180)`);
  });

  it('text L is clamped at 0.95 when baseLightness is high', () => {
    const profile = makeProfile({ baseLightness: 0.30, maxChroma: 0, baseHue: 0 });
    const css = generateThemeVariables(profile);
    // 0.30 + 0.70 = 1.00 > 0.95, so clamped
    expect(css).toContain('oklch(0.95 0 0)');
  });

  it('text L is baseLightness + 0.70 when not clamped', () => {
    const profile = makeProfile({ baseLightness: 0.10, maxChroma: 0, baseHue: 0 });
    const css = generateThemeVariables(profile);
    // 0.10 + 0.70 = 0.7999999999999999 in JS float
    expect(css).toContain(`oklch(${0.10 + 0.70} 0 0)`);
  });

  it('muted L is clamped at 0.75 when baseLightness is high', () => {
    const profile = makeProfile({ baseLightness: 0.35, maxChroma: 0, baseHue: 0 });
    const css = generateThemeVariables(profile);
    // 0.35 + 0.45 = 0.80 > 0.75, clamped
    expect(css).toContain('oklch(0.75 0 0)');
  });

  it('accent chroma is clamped at 0.18', () => {
    // maxChroma = 0.10, C*3 = 0.30 > 0.18 → clamped at 0.18
    const profile = makeProfile({ baseLightness: 0.15, maxChroma: 0.10, baseHue: 168 });
    const css = generateThemeVariables(profile);
    expect(css).toContain('0.18 168');
  });

  it('accent chroma is C*3 when below 0.18', () => {
    // maxChroma = 0.05, C*3 = 0.15 ≤ 0.18
    const profile = makeProfile({ baseLightness: 0.15, maxChroma: 0.05, baseHue: 200 });
    const css = generateThemeVariables(profile);
    expect(css).toContain(`0.15000000000000002 200`);
  });

  it('uses transition 0s when reduceMotion is true', () => {
    const profile = makeProfile({ reduceMotion: true });
    const css = generateThemeVariables(profile);
    expect(css).toContain('--zen-transition: 0s');
  });

  it('uses full cubic-bezier transition when reduceMotion is false', () => {
    const profile = makeProfile({ reduceMotion: false });
    const css = generateThemeVariables(profile);
    expect(css).toContain('--zen-transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1)');
  });

  it('contains :root selector', () => {
    const css = generateThemeVariables(DEFAULT_PROFILE);
    expect(css).toContain(':root');
  });

  it('contains [data-zenos-sensory] selector', () => {
    const css = generateThemeVariables(DEFAULT_PROFILE);
    expect(css).toContain('[data-zenos-sensory]');
  });
});

// ─── HDR chroma clamping ──────────────────────────────────────────────────────

describe('generateThemeVariables — HDR chroma clamping', () => {
  afterEach(() => {
    mockHDR(false);
  });

  it('clamps chroma to 0.03 on HDR display when dynamicRangeClamp is true', () => {
    mockHDR(true);
    const profile = makeProfile({ maxChroma: 0.12, dynamicRangeClamp: true, baseHue: 168 });
    const css = generateThemeVariables(profile);
    // bg should use 0.03 not 0.12
    expect(css).toContain('oklch(0.15 0.03 168)');
  });

  it('does NOT clamp chroma on HDR display when dynamicRangeClamp is false', () => {
    mockHDR(true);
    const profile = makeProfile({ maxChroma: 0.12, dynamicRangeClamp: false, baseHue: 168 });
    const css = generateThemeVariables(profile);
    expect(css).toContain('oklch(0.15 0.12 168)');
  });

  it('does NOT clamp chroma on non-HDR display even with dynamicRangeClamp true', () => {
    mockHDR(false);
    const profile = makeProfile({ maxChroma: 0.12, dynamicRangeClamp: true, baseHue: 168 });
    const css = generateThemeVariables(profile);
    expect(css).toContain('oklch(0.15 0.12 168)');
  });

  it('clamps to 0.03 even when maxChroma is already below 0.03', () => {
    mockHDR(true);
    const profile = makeProfile({ maxChroma: 0.01, dynamicRangeClamp: true, baseHue: 100 });
    const css = generateThemeVariables(profile);
    // min(0.01, 0.03) = 0.01 — not blown up
    expect(css).toContain('oklch(0.15 0.01 100)');
  });
});

// ─── Colorblind hue rotation ──────────────────────────────────────────────────

describe('generateThemeVariables — colorblind hue rotation', () => {
  beforeEach(() => {
    mockHDR(false);
  });

  it('none mode uses baseHue unchanged', () => {
    const profile = makeProfile({ baseHue: 168, colorBlindMode: 'none', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (168 + COLORBLIND_HUE_OFFSETS.none + 360) % 360; // 168
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('protanopia rotates hue by +60', () => {
    const profile = makeProfile({ baseHue: 168, colorBlindMode: 'protanopia', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (168 + 60 + 360) % 360; // 228
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('deuteranopia rotates hue by +60 (same as protanopia)', () => {
    const profile = makeProfile({ baseHue: 168, colorBlindMode: 'deuteranopia', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (168 + 60 + 360) % 360; // 228
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('tritanopia rotates hue by -90', () => {
    const profile = makeProfile({ baseHue: 168, colorBlindMode: 'tritanopia', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (168 + (-90) + 360) % 360; // 78
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('hue wraps correctly for large base hue with positive offset', () => {
    const profile = makeProfile({ baseHue: 330, colorBlindMode: 'protanopia', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (330 + 60 + 360) % 360; // 30
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('hue wraps correctly for small base hue with negative offset', () => {
    const profile = makeProfile({ baseHue: 30, colorBlindMode: 'tritanopia', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    const expectedHue = (30 + (-90) + 360) % 360; // 300
    expect(css).toContain(`oklch(0.15 0 ${expectedHue})`);
  });

  it('hue 0 with no offset stays at 0', () => {
    const profile = makeProfile({ baseHue: 0, colorBlindMode: 'none', maxChroma: 0, baseLightness: 0.15 });
    const css = generateThemeVariables(profile);
    expect(css).toContain('oklch(0.15 0 0)');
  });
});

// ─── applyTheme ───────────────────────────────────────────────────────────────

describe('applyTheme', () => {
  beforeEach(() => {
    mockHDR(false);
    // Clean up any previous theme elements
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  afterEach(() => {
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  it('injects a <style> element with id zenos-theme-registry', () => {
    applyTheme(DEFAULT_PROFILE);
    const styleEl = document.getElementById('zenos-theme-registry');
    expect(styleEl).not.toBeNull();
    expect(styleEl!.tagName).toBe('STYLE');
  });

  it('the injected style element contains CSS variable definitions', () => {
    applyTheme(DEFAULT_PROFILE);
    const styleEl = document.getElementById('zenos-theme-registry') as HTMLStyleElement;
    expect(styleEl.textContent).toContain('--zen-bg:');
    expect(styleEl.textContent).toContain('--zen-accent:');
  });

  it('sets data-zenos-sensory attribute on documentElement', () => {
    applyTheme(DEFAULT_PROFILE);
    expect(document.documentElement.getAttribute('data-zenos-sensory')).toBe(
      DEFAULT_PROFILE.sensoryMode
    );
  });

  it('updates data-zenos-sensory when sensoryMode changes', () => {
    applyTheme(DEFAULT_PROFILE);
    applyTheme({ ...DEFAULT_PROFILE, sensoryMode: 'glitch' });
    expect(document.documentElement.getAttribute('data-zenos-sensory')).toBe('glitch');
  });

  it('updates existing style element without creating a duplicate', () => {
    applyTheme(DEFAULT_PROFILE);
    applyTheme({ ...DEFAULT_PROFILE, sensoryMode: 'high-contrast' });

    const all = document.querySelectorAll('#zenos-theme-registry');
    expect(all.length).toBe(1);
  });

  it('style content changes when profile changes', () => {
    applyTheme(makeProfile({ reduceMotion: true }));
    const css1 = (document.getElementById('zenos-theme-registry') as HTMLStyleElement).textContent;

    applyTheme(makeProfile({ reduceMotion: false }));
    const css2 = (document.getElementById('zenos-theme-registry') as HTMLStyleElement).textContent;

    expect(css1).not.toBe(css2);
    expect(css1).toContain('0s');
    expect(css2).toContain('cubic-bezier');
  });

  it('appends the style element to document.head', () => {
    applyTheme(DEFAULT_PROFILE);
    const styleEl = document.getElementById('zenos-theme-registry');
    expect(document.head.contains(styleEl)).toBe(true);
  });
});

// ─── removeTheme ──────────────────────────────────────────────────────────────

describe('removeTheme', () => {
  beforeEach(() => {
    mockHDR(false);
    // Ensure theme is applied before removal tests
    applyTheme(DEFAULT_PROFILE);
  });

  it('removes the zenos-theme-registry style element', () => {
    removeTheme();
    expect(document.getElementById('zenos-theme-registry')).toBeNull();
  });

  it('removes the data-zenos-sensory attribute from documentElement', () => {
    removeTheme();
    expect(document.documentElement.hasAttribute('data-zenos-sensory')).toBe(false);
  });

  it('is idempotent — calling twice does not throw', () => {
    removeTheme();
    expect(() => removeTheme()).not.toThrow();
  });

  it('after removal, style element is gone from document.head', () => {
    removeTheme();
    const styleEl = document.head.querySelector('#zenos-theme-registry');
    expect(styleEl).toBeNull();
  });
});