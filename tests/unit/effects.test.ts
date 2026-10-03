import { describe, it, expect } from 'vitest';
import { EFFECTS } from '../../src/glitch-config';
import { AD_SELECTORS, EFFECT_LABELS, EFFECTS_CSS, FX_CLASS, displayText, scrambleText } from '../../src/effects';

describe('effects', () => {
  it('has a label and a CSS rule for every effect', () => {
    for (const e of EFFECTS) {
      expect(EFFECT_LABELS[e]).toBeTruthy();
      expect(EFFECTS_CSS).toContain(`.${FX_CLASS}--${e}`);
    }
  });
  it('scramble is deterministic, length-preserving, keeps whitespace, hides letters', () => {
    const s = scrambleText('paid partnership');
    expect(s).toBe(scrambleText('paid partnership'));
    expect([...s]).toHaveLength([...'paid partnership'].length);
    expect(s[4]).toBe(' ');
    expect(s).not.toMatch(/[a-z]/);
  });
  it('displayText only transforms for scramble', () => {
    expect(displayText('ad', 'blur')).toBe('ad');
    expect(displayText('ad', 'scramble')).not.toBe('ad');
  });
  it('honours reduced motion and the zenOS sensory hooks', () => {
    expect(EFFECTS_CSS).toContain('prefers-reduced-motion');
    expect(EFFECTS_CSS).toContain('[data-gts-reduce-motion]');
    expect(EFFECTS_CSS).toContain('[data-zenos-sensory="high-contrast"]');
  });
  it('ad selectors are all valid CSS', () => {
    for (const sel of AD_SELECTORS) expect(() => document.querySelector(sel)).not.toThrow();
  });
});
