/**
 * Tests for src/site-profile.schema.ts
 * Covers: DEFAULT_PROFILE values, COLORBLIND_HUE_OFFSETS, type structure contracts.
 */

import { describe, it, expect } from 'vitest';
import {
  DEFAULT_PROFILE,
  COLORBLIND_HUE_OFFSETS,
  type ZenProfile,
  type ColorBlindMode,
  type SensoryMode,
} from '../../src/site-profile.schema';

describe('DEFAULT_PROFILE', () => {
  it('has the expected id', () => {
    expect(DEFAULT_PROFILE.id).toBe('global');
  });

  it('defaults sensoryMode to calm', () => {
    expect(DEFAULT_PROFILE.sensoryMode).toBe('calm');
  });

  it('defaults colorBlindMode to none', () => {
    expect(DEFAULT_PROFILE.colorBlindMode).toBe('none');
  });

  it('baseLightness is in valid OKLCH range (0–1)', () => {
    expect(DEFAULT_PROFILE.baseLightness).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PROFILE.baseLightness).toBeLessThanOrEqual(1);
    expect(DEFAULT_PROFILE.baseLightness).toBe(0.15);
  });

  it('maxChroma is in valid OKLCH range (0–0.4)', () => {
    expect(DEFAULT_PROFILE.maxChroma).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PROFILE.maxChroma).toBeLessThanOrEqual(0.4);
    expect(DEFAULT_PROFILE.maxChroma).toBe(0.05);
  });

  it('baseHue is in valid degree range (0–360)', () => {
    expect(DEFAULT_PROFILE.baseHue).toBeGreaterThanOrEqual(0);
    expect(DEFAULT_PROFILE.baseHue).toBeLessThanOrEqual(360);
    expect(DEFAULT_PROFILE.baseHue).toBe(168);
  });

  it('reduceMotion defaults to true', () => {
    expect(DEFAULT_PROFILE.reduceMotion).toBe(true);
  });

  it('dynamicRangeClamp defaults to true', () => {
    expect(DEFAULT_PROFILE.dynamicRangeClamp).toBe(true);
  });

  it('is a complete ZenProfile (all required keys present)', () => {
    const requiredKeys: Array<keyof ZenProfile> = [
      'id',
      'sensoryMode',
      'colorBlindMode',
      'baseLightness',
      'maxChroma',
      'baseHue',
      'reduceMotion',
      'dynamicRangeClamp',
    ];
    for (const key of requiredKeys) {
      expect(DEFAULT_PROFILE).toHaveProperty(key);
    }
  });
});

describe('COLORBLIND_HUE_OFFSETS', () => {
  it('covers all four ColorBlindMode values', () => {
    const modes: ColorBlindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];
    for (const mode of modes) {
      expect(COLORBLIND_HUE_OFFSETS).toHaveProperty(mode);
    }
  });

  it('none offset is 0 (no hue shift)', () => {
    expect(COLORBLIND_HUE_OFFSETS.none).toBe(0);
  });

  it('protanopia offset is positive (rotate away from red)', () => {
    expect(COLORBLIND_HUE_OFFSETS.protanopia).toBe(60);
    expect(COLORBLIND_HUE_OFFSETS.protanopia).toBeGreaterThan(0);
  });

  it('deuteranopia offset equals protanopia (same red/green axis)', () => {
    expect(COLORBLIND_HUE_OFFSETS.deuteranopia).toBe(COLORBLIND_HUE_OFFSETS.protanopia);
  });

  it('tritanopia offset is negative (rotate away from blue)', () => {
    expect(COLORBLIND_HUE_OFFSETS.tritanopia).toBe(-90);
    expect(COLORBLIND_HUE_OFFSETS.tritanopia).toBeLessThan(0);
  });

  it('all offsets are finite numbers', () => {
    for (const [, offset] of Object.entries(COLORBLIND_HUE_OFFSETS)) {
      expect(typeof offset).toBe('number');
      expect(isFinite(offset)).toBe(true);
    }
  });

  it('has exactly four entries', () => {
    expect(Object.keys(COLORBLIND_HUE_OFFSETS)).toHaveLength(4);
  });
});

describe('SensoryMode type values', () => {
  // These tests act as regression guards: if valid modes change, tests break.
  const validModes: SensoryMode[] = ['default', 'calm', 'glitch', 'high-contrast'];

  it('DEFAULT_PROFILE.sensoryMode is among valid modes', () => {
    expect(validModes).toContain(DEFAULT_PROFILE.sensoryMode);
  });

  it('all four sensory modes are distinct strings', () => {
    const unique = new Set(validModes);
    expect(unique.size).toBe(4);
  });
});

describe('ColorBlindMode type values', () => {
  const validModes: ColorBlindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];

  it('DEFAULT_PROFILE.colorBlindMode is among valid modes', () => {
    expect(validModes).toContain(DEFAULT_PROFILE.colorBlindMode);
  });

  it('all four colorblind modes are distinct strings', () => {
    const unique = new Set(validModes);
    expect(unique.size).toBe(4);
  });
});