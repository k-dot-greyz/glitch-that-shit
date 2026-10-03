import { describe, it, expect } from 'vitest';
import { compileMatcher } from '../../src/matcher';

const m = (filters: string[], opts: { caseSensitive?: boolean; wholeWord?: boolean } = {}) =>
  compileMatcher({ filters, caseSensitive: opts.caseSensitive ?? false, wholeWord: opts.wholeWord ?? true })!;
const words = (filters: string[], text: string, opts = {}) => m(filters, opts).find(text).map(([a, b]) => text.slice(a, b));

describe('compileMatcher', () => {
  it('returns null for no usable filters', () => {
    expect(compileMatcher({ filters: [], caseSensitive: false, wholeWord: true })).toBeNull();
    expect(compileMatcher({ filters: ['/(/'], caseSensitive: false, wholeWord: true })).toBeNull();
  });
  it('matches literals case-insensitively by default', () => {
    expect(words(['sponsored'], 'Sponsored post — SPONSORED!')).toEqual(['Sponsored', 'SPONSORED']);
  });
  it('respects caseSensitive', () => {
    expect(words(['Ad'], 'ad Ad AD', { caseSensitive: true })).toEqual(['Ad']);
  });
  it('whole-word mode does not match inside words', () => {
    expect(words(['ad'], 'ad, load, adverb, (ad)')).toEqual(['ad', 'ad']);
  });
  it('whole-word boundaries are Unicode-aware', () => {
    expect(words(['ziņas'], 'jaunākās ziņas, ziņasx')).toEqual(['ziņas']);
    expect(words(['ad'], 'ādad ad')).toEqual(['ad']);
  });
  it('substring mode matches inside words', () => {
    expect(words(['ad'], 'load', { wholeWord: false })).toEqual(['ad']);
  });
  it('escapes regex metacharacters in literals', () => {
    expect(words(['c++', 'a.b'], 'c++ and axb a.b', { wholeWord: false })).toEqual(['c++', 'a.b']);
  });
  it('prefers longest overlapping literal', () => {
    expect(words(['ad', 'ad network'], 'an ad network')).toEqual(['ad network']);
  });
  it('supports regex entries and merges with literals without overlap', () => {
    expect(words(['/\\d{4}-\\d{4}/', 'call'], 'call 1234-5678 now')).toEqual(['call', '1234-5678']);
  });
  it('regex entries inherit case-insensitivity unless caseSensitive', () => {
    expect(words(['/crypto\\w*/'], 'CryptoCoin')).toEqual(['CryptoCoin']);
    expect(words(['/crypto\\w*/'], 'CryptoCoin', { caseSensitive: true })).toEqual([]);
  });
  it('skips zero-length matches without hanging', () => {
    expect(words(['/\\b/'], 'a b c')).toEqual([]);
  });
  it('test() mirrors find()', () => {
    expect(m(['x']).test('a x b')).toBe(true);
    expect(m(['x']).test('abc')).toBe(false);
  });
  it('is reusable across calls (no lastIndex leak)', () => {
    const mm = m(['foo']);
    expect(mm.find('foo')).toHaveLength(1);
    expect(mm.find('foo')).toHaveLength(1);
  });
});
