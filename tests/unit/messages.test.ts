/** CONTRIBUTING §3.3 — typed IPC; hostile/malformed payloads must not cross contexts. */
import { describe, it, expect } from 'vitest';
import { isMessage } from '../../src/messages';

describe('isMessage (IPC gate)', () => {
  it('accepts gts:hits with a finite count', () => {
    expect(isMessage({ type: 'gts:hits', count: 0 })).toBe(true);
    expect(isMessage({ type: 'gts:hits', count: 42.5 })).toBe(true);
  });

  it('accepts gts:status without extra fields', () => {
    expect(isMessage({ type: 'gts:status' })).toBe(true);
  });

  it('rejects non-objects and wrong shapes (agentic / malformed)', () => {
    for (const bad of [
      null,
      undefined,
      1,
      'gts:hits',
      [],
      { type: 'gts:evil' },
      { type: 'gts:hits' },
      { type: 'gts:hits', count: NaN },
      { type: 'gts:hits', count: Infinity },
      { type: 'gts:hits', count: '12' },
    ]) {
      expect(isMessage(bad)).toBe(false);
    }
  });

  it('allows unknown extra keys (handlers must ignore them)', () => {
    expect(isMessage({ type: 'gts:hits', count: 1, extra: 'agentic noise' })).toBe(true);
  });

  it('does not treat prototype-pollution keys as a valid message', () => {
    const payload = JSON.parse('{"type":"gts:hits","count":3}');
    expect(isMessage(payload)).toBe(true);
    expect(({} as Record<string, unknown>).polluted).toBeUndefined();
  });
});
