/**
 * OKLCH theme engine.
 * Computes CSS custom properties from ZenProfile.
 * Handles HDR detection, chroma clamping, colorblind hue rotation.
 *
 * Why OKLCH:
 *   - Perceptually uniform: Lightness (L) behaves as the human eye expects
 *   - Lock L rails → always passes WCAG contrast regardless of hue/chroma
 *   - Shift H for colorblind profiles without breaking perceived brightness
 *   - Clamp C on HDR screens to prevent halation/bloom on OLEDs
 *
 * dex_id: 0x7E:0x33
 * Refs: glitch-that-shit#3
 */

import { ZenProfile, COLORBLIND_HUE_OFFSETS } from './site-profile.schema';

const STYLE_ID = 'zenos-theme-registry';

/** Detect HDR/wide-gamut display capability. */
function isHDRDisplay(): boolean {
  return (
    window.matchMedia('(dynamic-range: high)').matches ||
    window.matchMedia('(color-gamut: p3)').matches
  );
}

/** Active chroma: clamp further on HDR screens to prevent bloom. */
function resolveChroma(profile: ZenProfile): number {
  if (profile.dynamicRangeClamp && isHDRDisplay()) {
    return Math.min(profile.maxChroma, 0.03);
  }
  return profile.maxChroma;
}

/** Apply colorblind hue rotation. */
function resolveHue(profile: ZenProfile): number {
  return (
    (profile.baseHue + COLORBLIND_HUE_OFFSETS[profile.colorBlindMode] + 360) % 360
  );
}

/** Generate the full CSS variable block. */
export function generateThemeVariables(profile: ZenProfile): string {
  const C = resolveChroma(profile);
  const H = resolveHue(profile);
  const L = profile.baseLightness;

  // L rails — WCAG contrast guaranteed by keeping text ≥0.65L above bg
  const bgColor      = `oklch(${L} ${C} ${H})`;
  const surfaceColor = `oklch(${L + 0.04} ${C} ${H})`;
  const textColor    = `oklch(${Math.min(L + 0.70, 0.95)} ${C * 0.4} ${H})`;
  const mutedColor   = `oklch(${Math.min(L + 0.45, 0.75)} ${C * 0.3} ${H})`;
  const accentColor  = `oklch(${Math.min(L + 0.55, 0.83)} ${Math.min(C * 3, 0.18)} ${H})`;
  const borderColor  = `oklch(${L + 0.12} ${C * 0.6} ${H})`;

  const transition = profile.reduceMotion
    ? '0s'
    : 'all 0.25s cubic-bezier(0.16, 1, 0.3, 1)';

  return `
:root, [data-zenos-sensory] {
  --zen-bg:         ${bgColor};
  --zen-surface:    ${surfaceColor};
  --zen-text:       ${textColor};
  --zen-muted:      ${mutedColor};
  --zen-accent:     ${accentColor};
  --zen-border:     ${borderColor};
  --zen-transition: ${transition};
}`;
}

/** Inject or update the zenOS theme style element. */
export function applyTheme(profile: ZenProfile): void {
  let styleEl = document.getElementById(STYLE_ID) as HTMLStyleElement | null;
  if (!styleEl) {
    styleEl = document.createElement('style');
    styleEl.id = STYLE_ID;
    document.head.appendChild(styleEl);
  }
  styleEl.textContent = generateThemeVariables(profile);
  document.documentElement.setAttribute(
    'data-zenos-sensory',
    profile.sensoryMode
  );
}

/** Remove zenOS theme — restore page defaults. */
export function removeTheme(): void {
  document.getElementById(STYLE_ID)?.remove();
  document.documentElement.removeAttribute('data-zenos-sensory');
}
