/**
 * Visual effect catalogue: CSS (namespaced `gts-`), display-text transforms,
 * and the ad-container selector list. Effects read the zenOS theme variables
 * from theme-registry (--zen-*) so the sensory/colorblind profile drives them.
 */

import type { EffectType } from './glitch-config';

export const EFFECT_STYLE_ID = 'gts-effects';
export const FX_CLASS = 'gts-fx';
export const AD_CLASS = 'gts-ad';

export const EFFECT_LABELS: Record<EffectType, string> = {
  glitch: 'Glitch (RGB split)',
  pixelate: 'Pixelate (8-bit blocks)',
  blur: 'Blur',
  scramble: 'Scramble (random glyphs)',
  rainbow: 'Rainbow',
  sparkle: 'Sparkle',
  redact: 'Redact (solid bar)',
};

const GLYPHS = '█▓▒░#@$%&*!?<>/\\';

/** Deterministic scramble — same word always renders the same glyphs (no flicker on rescans). */
export function scrambleText(text: string): string {
  let seed = 2166136261;
  for (let i = 0; i < text.length; i++) seed = Math.imul(seed ^ text.charCodeAt(i), 16777619);
  let out = '';
  for (const ch of text) {
    if (/\s/.test(ch)) {
      out += ch;
      continue;
    }
    seed = Math.imul(seed ^ (seed >>> 15), 2246822507) >>> 0;
    out += GLYPHS[seed % GLYPHS.length];
  }
  return out;
}

/** What the span shows for a given effect (scramble swaps glyphs; others keep text and style it). */
export function displayText(original: string, effect: EffectType): string {
  return effect === 'scramble' ? scrambleText(original) : original;
}

/**
 * Conservative ad-container selectors — visual censoring only, nothing is removed.
 * Kept small on purpose: false positives glitch real content.
 */
export const AD_SELECTORS: readonly string[] = [
  'ins.adsbygoogle',
  '[id^="google_ads_iframe"]',
  '[id^="div-gpt-ad"]',
  '[data-ad-slot]',
  '[data-ad-client]',
  '[data-google-query-id]',
  '[aria-label="Advertisement" i]',
  '[aria-label="Sponsored" i]',
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="amazon-adsystem.com"]',
];

export const EFFECTS_CSS = `
.${FX_CLASS}{display:inline;position:relative;cursor:help;border-radius:2px;
  --gts-k:1;--gts-accent:var(--zen-accent,#00e5a0);--gts-bg:var(--zen-surface,#131311);--gts-muted:var(--zen-muted,#706f6a)}
.${FX_CLASS}[data-gts-intensity="subtle"]{--gts-k:.5}
.${FX_CLASS}[data-gts-intensity="extreme"]{--gts-k:2}
.${FX_CLASS}--glitch{color:rgba(128,128,128,.25)!important;
  text-shadow:calc(3px*var(--gts-k)) 0 rgba(255,0,80,.9),calc(-3px*var(--gts-k)) 0 rgba(0,229,255,.9),0 calc(1px*var(--gts-k)) rgba(255,255,0,.5);
  filter:blur(calc(.9px*var(--gts-k)));animation:gts-jitter .35s steps(2) infinite}
.${FX_CLASS}--pixelate{color:transparent!important;text-shadow:none!important;
  background:repeating-conic-gradient(var(--gts-muted) 0 25%,var(--gts-bg) 0 50%) 0 0/calc(4px*var(--gts-k) + 2px) calc(4px*var(--gts-k) + 2px)}
.${FX_CLASS}--blur{filter:blur(calc(4px*var(--gts-k)));user-select:none}
.${FX_CLASS}--scramble{font-family:ui-monospace,monospace;color:var(--gts-accent)}
.${FX_CLASS}--rainbow{color:transparent!important;background:linear-gradient(90deg,#ff3b3b,#ffb03b,#f5ff3b,#3bff7a,#3bc8ff,#8a3bff,#ff3b3b) 0 0/200% 100%;
  -webkit-background-clip:text;background-clip:text;animation:gts-rainbow calc(3s / var(--gts-k)) linear infinite}
.${FX_CLASS}--sparkle{color:transparent!important;background:linear-gradient(45deg,#ffd700,#fff8dc,#ffd700) 0 0/200% 100%;
  -webkit-background-clip:text;background-clip:text;animation:gts-rainbow 1.5s ease-in-out infinite alternate}
.${FX_CLASS}--sparkle::after{content:"✨";font-size:.7em;vertical-align:super;-webkit-text-fill-color:initial}
.${FX_CLASS}--redact{color:transparent!important;text-shadow:none!important;background:var(--zen-text,#d4d3cf)}
.${FX_CLASS}[data-gts-revealed]{color:inherit!important;background:none!important;filter:none!important;text-shadow:none!important;
  animation:none!important;outline:1px dashed var(--gts-accent);-webkit-text-fill-color:currentColor}
.${FX_CLASS}[data-gts-revealed]::after{content:none}
@keyframes gts-jitter{0%{left:0;top:0}25%{left:calc(-1px*var(--gts-k));top:calc(1px*var(--gts-k))}50%{left:calc(1px*var(--gts-k));top:0}75%{left:0;top:calc(-1px*var(--gts-k))}}
@keyframes gts-rainbow{to{background-position:200% 0}}
.${AD_CLASS}{transition:filter .2s}
.${AD_CLASS}[data-gts-effect="blur"],.${AD_CLASS}[data-gts-effect="sparkle"]{filter:blur(8px) saturate(.4)!important}
.${AD_CLASS}[data-gts-effect="pixelate"]{filter:contrast(3) blur(3px) grayscale(1)!important}
.${AD_CLASS}[data-gts-effect="glitch"],.${AD_CLASS}[data-gts-effect="rainbow"]{filter:hue-rotate(90deg) saturate(4) blur(2px) contrast(1.6)!important;animation:gts-ad-shift .4s steps(2) infinite}
.${AD_CLASS}[data-gts-effect="redact"],.${AD_CLASS}[data-gts-effect="scramble"]{filter:brightness(0)!important}
@keyframes gts-ad-shift{50%{transform:translateX(2px) skewX(-2deg)}}
/* zenOS sensory profile hooks (data-zenos-sensory is set by theme-registry) */
[data-zenos-sensory="glitch"] .${FX_CLASS}{--gts-k:2.5}
[data-zenos-sensory="high-contrast"] .${FX_CLASS}:not([data-gts-revealed]){color:transparent!important;background:var(--zen-text,#fff)!important;
  filter:none!important;text-shadow:none!important;animation:none!important;-webkit-text-fill-color:transparent}
[data-gts-reduce-motion] .${FX_CLASS},[data-gts-reduce-motion] .${AD_CLASS},[data-zenos-sensory="calm"] .${FX_CLASS},[data-zenos-sensory="calm"] .${AD_CLASS}{animation:none!important}
@media (prefers-reduced-motion:reduce){.${FX_CLASS},.${AD_CLASS}{animation:none!important}}
@media (forced-colors:active){.${FX_CLASS}{forced-color-adjust:none;outline:2px solid CanvasText}}
`;
