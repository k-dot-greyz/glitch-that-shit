/**
 * Filter matcher — pure text → match-range logic, no DOM.
 * All literal filters are folded into one alternation regex; each regex filter
 * keeps its own RegExp (flags can differ). Overlapping matches resolve to the
 * earliest, then longest, range.
 */

import { GlitchConfig, parseFilterEntry } from './glitch-config';

export type Range = [start: number, end: number];

export interface Matcher {
  /** Non-overlapping, sorted match ranges. */
  find(text: string): Range[];
  /** Cheap pre-check. */
  test(text: string): boolean;
}

const escapeRegex = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
// Unicode-aware word boundaries (\b only knows ASCII — breaks on "ā", "ж", …)
const WORD_START = '(?<![\\p{L}\\p{N}_])';
const WORD_END = '(?![\\p{L}\\p{N}_])';

export function compileMatcher(config: Pick<GlitchConfig, 'filters' | 'caseSensitive' | 'wholeWord'>): Matcher | null {
  const literals: string[] = [];
  const regexes: RegExp[] = [];

  for (const raw of config.filters) {
    const res = parseFilterEntry(raw);
    if (!res.ok) continue; // validated upstream; stay defensive
    if (res.filter.kind === 'literal') {
      literals.push(res.filter.text);
    } else {
      const flags = new Set(res.filter.flags + 'gu');
      if (!config.caseSensitive) flags.add('i');
      try {
        regexes.push(new RegExp(res.filter.source, [...flags].join('')));
      } catch {
        // `u` can make a previously valid pattern invalid; retry without it
        flags.delete('u');
        try {
          regexes.push(new RegExp(res.filter.source, [...flags].join('')));
        } catch {
          /* skip */
        }
      }
    }
  }

  if (literals.length) {
    // Longest first so "ad network" beats "ad" in the alternation
    const alt = [...new Set(literals)].sort((a, b) => b.length - a.length).map(escapeRegex).join('|');
    const body = config.wholeWord ? `${WORD_START}(?:${alt})${WORD_END}` : `(?:${alt})`;
    regexes.unshift(new RegExp(body, config.caseSensitive ? 'gu' : 'giu'));
  }

  if (!regexes.length) return null;

  const find = (text: string): Range[] => {
    const all: Range[] = [];
    for (const re of regexes) {
      re.lastIndex = 0;
      let m: RegExpExecArray | null;
      let guard = 0;
      while ((m = re.exec(text)) !== null && guard++ < 10_000) {
        if (m[0].length === 0) {
          re.lastIndex++;
          continue;
        }
        all.push([m.index, m.index + m[0].length]);
      }
    }
    all.sort((a, b) => a[0] - b[0] || b[1] - a[1]);
    const out: Range[] = [];
    let end = -1;
    for (const r of all) {
      if (r[0] >= end) {
        out.push(r);
        end = r[1];
      }
    }
    return out;
  };

  return {
    find,
    test: (text: string) => find(text).length > 0,
  };
}
