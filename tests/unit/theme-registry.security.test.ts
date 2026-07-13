/**
 * Security boundary tests for src/theme-registry.ts
 * Attack surface: unsanitized sensoryMode written to DOM attributes.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { applyTheme, generateThemeVariables } from '../../src/theme-registry';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';
import { SecurityHarness } from '../helpers/security-harness';

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

describe('theme-registry — DOM injection via profile (SecurityHarness)', () => {
  const harness = new SecurityHarness();

  beforeEach(() => {
    mockHDR(false);
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  afterEach(() => {
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  it.each(harness.catalog.attributeInjectionSensoryModes)(
    'applyTheme writes unsanitized sensoryMode to data-zenos-sensory: %s',
    (hostileMode) => {
      const profile = harness.corruptProfile({ sensoryMode: hostileMode as never });
      applyTheme(profile);
      expect(document.documentElement.getAttribute('data-zenos-sensory')).toBe(hostileMode);
    },
  );

  it.each(harness.catalog.numericEdgeValues)(
    'generateThemeVariables does not throw for baseLightness edge: %s',
    (value) => {
      const profile = harness.corruptProfile({ baseLightness: value as never, maxChroma: 0, baseHue: 0 });
      expect(() => generateThemeVariables(profile)).not.toThrow();
    },
  );

  it('generateThemeVariables emits oklch() even when chroma/hue are hostile strings', () => {
    const profile = harness.corruptProfile({
      maxChroma: '0.05<script>' as never,
      baseHue: '168" onload="alert(1)' as never,
    });
    const css = generateThemeVariables(profile);
    expect(css).toContain('oklch(');
    // Documents gap: string coercion produces invalid CSS but does not throw.
    expect(css).toContain('0.05<script>');
  });

  it('does not create duplicate style elements under rapid hostile re-apply', () => {
    for (const mode of harness.catalog.attributeInjectionSensoryModes) {
      applyTheme(harness.corruptProfile({ sensoryMode: mode as never }));
    }
    expect(document.querySelectorAll('#zenos-theme-registry')).toHaveLength(1);
  });
});
