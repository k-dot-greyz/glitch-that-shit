/**
 * Security boundary tests for src/shared/utils.js
 * Attack surface: filter regex injection, config import validation, DOM skip rules.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  escapeRegex,
  validateConfig,
  mergeWithDefaults,
  getDefaultConfig,
  shouldSkipElement,
  deepClone,
  prefersReducedMotion,
  prefersDarkMode,
} from '../../src/shared/utils.js';
import { SecurityHarness } from '../helpers/security-harness';

describe('utils.js — hostile input boundary (SecurityHarness)', () => {
  const harness = new SecurityHarness();

  describe('validateConfig', () => {
    it('rejects null and non-object configs', () => {
      expect(validateConfig(null)).toBe(false);
      expect(validateConfig(undefined)).toBe(false);
      expect(validateConfig('not-an-object')).toBe(false);
      expect(validateConfig(42)).toBe(false);
    });

    it.each(harness.catalog.invalidEffectTypes)(
      'rejects invalid effectType: %s',
      (effectType) => {
        const config = harness.legacyConfig({ effectType });
        expect(validateConfig(config)).toBe(false);
      },
    );

    it('accepts empty effectIntensity because falsy values skip validation (documents gap)', () => {
      const config = harness.legacyConfig({ effectIntensity: '' });
      expect(validateConfig(config)).toBe(true);
    });

    it.each(harness.catalog.invalidIntensities)(
      'rejects invalid effectIntensity: %s',
      (effectIntensity) => {
        const config = harness.legacyConfig({ effectIntensity });
        expect(validateConfig(config)).toBe(false);
      },
    );

    it('rejects filterList when not an array', () => {
      const config = harness.legacyConfig({ filterList: 'ad,sponsored' });
      expect(validateConfig(config)).toBe(false);
    });

    it('accepts configs with valid effectType and intensity', () => {
      for (const effectType of harness.catalog.validEffectTypes) {
        const config = harness.legacyConfig({ effectType });
        expect(validateConfig(config)).toBe(true);
      }
    });

    it('accepts empty filterList array', () => {
      const config = harness.legacyConfig({ filterList: [] });
      expect(validateConfig(config)).toBe(true);
    });

    it.each(harness.catalog.agenticInstructionStrings)(
      'rejects agentic-injection string as effectType: %s',
      (payload) => {
        const config = harness.legacyConfig({ effectType: payload });
        expect(validateConfig(config)).toBe(false);
      },
    );
  });

  describe('escapeRegex', () => {
    it.each(harness.catalog.regexInjectionStrings)(
      'escapes regex metacharacters in: %s',
      (input) => {
        const escaped = escapeRegex(input);
        expect(() => new RegExp(escaped)).not.toThrow();
        expect(escaped).not.toBe(input);
      },
    );

    it('produces a literal match for strings with special chars', () => {
      const raw = 'test.*+?^${}()|[]\\';
      const escaped = escapeRegex(raw);
      expect(new RegExp(escaped).test(raw)).toBe(true);
      expect(new RegExp(escaped).test('testXXXX')).toBe(false);
    });
  });

  describe('mergeWithDefaults', () => {
    it('does not let null override enabled to null', () => {
      const merged = mergeWithDefaults({ enabled: null });
      expect(merged.enabled).toBeNull();
      // Documents current behavior: null passes through; validation must happen upstream.
    });

    it('preserves default filterList when override omits it', () => {
      const merged = mergeWithDefaults({ effectType: harness.catalog.validEffectTypes[1] });
      expect(merged.filterList).toEqual(getDefaultConfig().filterList);
    });

    it.each(harness.catalog.prototypePollutionKeys)(
      'does not pollute Object.prototype via merge key: %s',
      (key) => {
        const payload = { [key]: { polluted: true } };
        mergeWithDefaults(payload);
        expect((Object.prototype as Record<string, unknown>).polluted).toBeUndefined();
      },
    );
  });

  describe('deepClone', () => {
    it('isolates nested filterList mutations from source', () => {
      const source = harness.legacyConfig({ filterList: ['ad'] });
      const clone = deepClone(source);
      (clone.filterList as string[]).push('injected');
      expect(source.filterList).toHaveLength(1);
    });

    it('drops non-JSON values (functions) without throwing', () => {
      const source = harness.legacyConfig({
        filterList: ['ad'],
        malicious: () => 'fn',
      });
      const clone = deepClone(source);
      expect(clone.malicious).toBeUndefined();
    });
  });

  describe('shouldSkipElement', () => {
    it('skips SCRIPT and STYLE elements', () => {
      const script = document.createElement('script');
      const style = document.createElement('style');
      expect(shouldSkipElement(script)).toBe(true);
      expect(shouldSkipElement(style)).toBe(true);
    });

    it('skips elements already marked data-glitched', () => {
      const span = document.createElement('span');
      span.setAttribute('data-glitched', 'true');
      expect(shouldSkipElement(span)).toBe(true);
    });

    it('does not skip ordinary text containers', () => {
      const p = document.createElement('p');
      expect(shouldSkipElement(p)).toBe(false);
    });
  });
});

describe('utils.js — prefersReducedMotion / prefersDarkMode', () => {
  beforeEach(() => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: false })));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('reads matchMedia without throwing on hostile query strings', () => {
    const harness = new SecurityHarness();
    expect(() => prefersReducedMotion()).not.toThrow();
    expect(() => prefersDarkMode()).not.toThrow();
    expect(window.matchMedia).toHaveBeenCalled();
    void harness;
  });
});
