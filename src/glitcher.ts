/**
 * DOM engine: wraps matched text in effect spans, glitches ad containers,
 * and restores the page exactly (text + attributes) when disabled.
 *
 * Graceful degradation: every per-node operation is try/catch'd — a weird
 * node or hostile DOM must never brick the tab.
 */

import type { GlitchConfig } from './glitch-config';
import type { Matcher } from './matcher';
import { AD_CLASS, AD_SELECTORS, EFFECT_STYLE_ID, EFFECTS_CSS, FX_CLASS, displayText } from './effects';

const SKIP_TAGS = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
  'IFRAME', 'OBJECT', 'CANVAS', 'SVG', 'MATH', 'HEAD', 'TITLE',
]);

export const ORIGINAL_ATTR = 'data-gts-original';
const AD_SELECTOR = AD_SELECTORS.join(',');

export class Glitcher {
  private config: GlitchConfig | null = null;
  private matcher: Matcher | null = null;
  /** Text nodes we created (leftovers around a match) — never re-scan them. */
  private produced = new WeakSet<Text>();
  private hits = 0;

  constructor(private readonly doc: Document) {}

  get active(): boolean {
    return !!this.config && !!this.matcher;
  }

  get hitCount(): number {
    return this.hits;
  }

  /** Set config + matcher; pass null to deactivate. Does not touch the DOM. */
  configure(config: GlitchConfig | null, matcher: Matcher | null): void {
    this.config = config;
    this.matcher = config ? matcher : null;
  }

  ensureStyles(): void {
    if (this.doc.getElementById(EFFECT_STYLE_ID)) return;
    const style = this.doc.createElement('style');
    style.id = EFFECT_STYLE_ID;
    style.textContent = EFFECTS_CSS;
    (this.doc.head ?? this.doc.documentElement).appendChild(style);
  }

  /** Scan a subtree (element or text node). Returns number of new hits. */
  scan(root: Node | null | undefined): number {
    if (!root || !this.config) return 0;
    let found = 0;
    try {
      if (this.config.glitchAds && root.nodeType === Node.ELEMENT_NODE) found += this.scanAds(root as Element);
      if (this.matcher) {
        if (root.nodeType === Node.TEXT_NODE) {
          found += this.processText(root as Text);
        } else if (root.nodeType === Node.ELEMENT_NODE || root.nodeType === Node.DOCUMENT_NODE) {
          const texts = this.collectTexts(root);
          for (const t of texts) found += this.processText(t);
        }
      }
    } catch (e) {
      // degrade to "no effect" for this subtree
      if (this.doc.documentElement.hasAttribute('data-gts-debug')) console.warn('[glitch-that-shit] scan failed', e);
    }
    this.hits += found;
    return found;
  }

  /** Re-check a text node whose data changed in place (SPA text updates). */
  rescanText(node: Text): number {
    this.produced.delete(node);
    return this.scan(node);
  }

  /** Undo everything: unwrap spans, untag ads, drop the stylesheet. */
  restore(root: ParentNode = this.doc): void {
    root.querySelectorAll?.(`span.${FX_CLASS}[${ORIGINAL_ATTR}]`).forEach((span) => {
      try {
        const text = this.doc.createTextNode(span.getAttribute(ORIGINAL_ATTR) ?? span.textContent ?? '');
        span.replaceWith(text);
      } catch {
        /* node vanished */
      }
    });
    root.querySelectorAll?.(`.${AD_CLASS}`).forEach((el) => {
      el.classList.remove(AD_CLASS);
      el.removeAttribute('data-gts-effect');
    });
    this.doc.getElementById(EFFECT_STYLE_ID)?.remove();
    this.hits = 0;
  }

  /** Toggle reveal on a glitched span. Returns true if the span was hidden and is now revealed. */
  toggleReveal(span: HTMLElement): boolean {
    const original = span.getAttribute(ORIGINAL_ATTR) ?? '';
    const effect = (span.getAttribute('data-gts-effect') ?? 'glitch') as GlitchConfig['effect'];
    if (span.hasAttribute('data-gts-revealed')) {
      span.removeAttribute('data-gts-revealed');
      span.textContent = displayText(original, effect);
      return false;
    }
    span.setAttribute('data-gts-revealed', '');
    span.textContent = original;
    return true;
  }

  private shouldSkip(el: Element | null): boolean {
    for (let cur = el; cur; cur = cur.parentElement) {
      if (SKIP_TAGS.has(cur.tagName.toUpperCase())) return true;
      if (cur.classList?.contains(FX_CLASS)) return true;
      const ce = cur.getAttribute('contenteditable');
      if (ce !== null && ce !== 'false') return true;
      if (cur.hasAttribute('data-gts-ignore')) return true;
    }
    return false;
  }

  private collectTexts(root: Node): Text[] {
    const out: Text[] = [];
    if (root.nodeType === Node.ELEMENT_NODE && this.shouldSkip(root as Element)) return out;
    const walker = this.doc.createTreeWalker(root, NodeFilter.SHOW_ELEMENT | NodeFilter.SHOW_TEXT, {
      acceptNode: (node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const el = node as Element;
          if (SKIP_TAGS.has(el.tagName.toUpperCase()) || el.classList.contains(FX_CLASS)) return NodeFilter.FILTER_REJECT;
          const ce = el.getAttribute('contenteditable');
          if ((ce !== null && ce !== 'false') || el.hasAttribute('data-gts-ignore')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_SKIP;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });
    let n: Node | null;
    while ((n = walker.nextNode())) out.push(n as Text);
    return out;
  }

  private processText(node: Text): number {
    const config = this.config;
    const matcher = this.matcher;
    if (!config || !matcher || this.produced.has(node)) return 0;
    const text = node.data;
    if (!text || !text.trim() || !node.parentNode) return 0;
    if (node.parentElement && this.shouldSkip(node.parentElement)) return 0;

    const ranges = matcher.find(text);
    if (!ranges.length) return 0;

    const frag = this.doc.createDocumentFragment();
    let last = 0;
    for (const [start, end] of ranges) {
      if (start > last) frag.appendChild(this.leftover(text.slice(last, start)));
      frag.appendChild(this.makeSpan(text.slice(start, end), config));
      last = end;
    }
    if (last < text.length) frag.appendChild(this.leftover(text.slice(last)));
    node.parentNode.replaceChild(frag, node);
    return ranges.length;
  }

  private leftover(s: string): Text {
    const t = this.doc.createTextNode(s);
    this.produced.add(t);
    return t;
  }

  private makeSpan(original: string, config: GlitchConfig): HTMLSpanElement {
    const span = this.doc.createElement('span');
    span.className = `${FX_CLASS} ${FX_CLASS}--${config.effect}`;
    span.setAttribute(ORIGINAL_ATTR, original);
    span.setAttribute('data-gts-effect', config.effect);
    span.setAttribute('data-gts-intensity', config.intensity);
    if (config.showOriginalOnHover) span.title = original;
    span.textContent = displayText(original, config.effect);
    return span;
  }

  private scanAds(root: Element): number {
    if (!this.config) return 0;
    let n = 0;
    const tag = (el: Element) => {
      if (el.classList.contains(AD_CLASS)) return;
      el.classList.add(AD_CLASS);
      el.setAttribute('data-gts-effect', this.config!.effect);
      n++;
    };
    if (root.matches?.(AD_SELECTOR)) tag(root);
    root.querySelectorAll?.(AD_SELECTOR).forEach(tag);
    return n;
  }
}
