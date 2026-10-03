/**
 * ZenProfile — the single source of truth for a user's zenOS accessibility config.
 * Stored in chrome.storage.sync. Consumed by theme-registry, content script, popup.
 *
 * dex_id: 0x7E:0x31
 * Refs: glitch-that-shit#1 (Epic), glitch-that-shit#2
 */

export type ColorBlindMode =
  | 'none'
  | 'protanopia'   // red-weak
  | 'deuteranopia' // green-weak (most common, ~8% of men)
  | 'tritanopia';  // blue-weak

export type SensoryMode =
  | 'default'       // unmodified
  | 'calm'          // compressed chroma, reduced motion, dark default
  | 'glitch'        // GlitchWorks aesthetic — controlled chaos
  | 'high-contrast' // WCAG AAA+ rails, maximum legibility

export interface ZenProfile {
  id: string;
  sensoryMode: SensoryMode;
  colorBlindMode: ColorBlindMode;
  // OKLCH rails — all values 0.0–1.0 except baseHue (0–360)
  baseLightness: number;   // background L value (0.15 = near-black dark)
  maxChroma: number;       // max saturation (clamped further on HDR screens)
  baseHue: number;         // brand hue in degrees (270 = cyan/teal-ish)
  // engine flags
  reduceMotion: boolean;
  dynamicRangeClamp: boolean; // compress chroma on HDR/OLED screens
}

export const DEFAULT_PROFILE: ZenProfile = {
  id: 'global',
  sensoryMode: 'calm',
  colorBlindMode: 'none',
  baseLightness: 0.15,
  maxChroma: 0.05,
  baseHue: 168,        // GlitchWorks teal (#00E5A0 ≈ oklch(0.83 0.18 168))
  reduceMotion: true,
  dynamicRangeClamp: true,
};

/** Hue rotation offsets for colorblind modes.
 *  Shift away from problematic red/green confusion zones without
 *  breaking perceived brightness (OKLCH keeps L constant). */
export const COLORBLIND_HUE_OFFSETS: Record<ColorBlindMode, number> = {
  none: 0,
  protanopia: 60,    // rotate reds → oranges/yellows
  deuteranopia: 60,  // same — both red/green axis
  tritanopia: -90,   // rotate blues → purples
};

export const SENSORY_MODES: readonly SensoryMode[] = ['default', 'calm', 'glitch', 'high-contrast'];
export const COLORBLIND_MODES: readonly ColorBlindMode[] = ['none', 'protanopia', 'deuteranopia', 'tritanopia'];

/** Numeric rails enforced at the storage edge (match popup slider ranges). */
export const PROFILE_RAILS = {
  baseLightness: [0, 1],
  maxChroma: [0, 0.4],
  baseHue: [0, 360],
} as const;

const clampNum = (v: unknown, [lo, hi]: readonly [number, number], fallback: number): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : fallback;

/**
 * Coerce untrusted data (storage, sync from another device, imports) into a
 * valid ZenProfile. Unknown keys are dropped; invalid values fall back to
 * DEFAULT_PROFILE. Never throws. Guards e.g. data-zenos-sensory attribute
 * injection and NaN poisoning of the CSS variable block.
 */
export function sanitizeProfile(input: unknown): ZenProfile {
  if (typeof input !== 'object' || input === null || Array.isArray(input)) return { ...DEFAULT_PROFILE };
  const o = input as Record<string, unknown>;
  return {
    id: typeof o.id === 'string' && o.id.length <= 64 ? o.id : DEFAULT_PROFILE.id,
    sensoryMode: SENSORY_MODES.includes(o.sensoryMode as SensoryMode) ? (o.sensoryMode as SensoryMode) : DEFAULT_PROFILE.sensoryMode,
    colorBlindMode: COLORBLIND_MODES.includes(o.colorBlindMode as ColorBlindMode)
      ? (o.colorBlindMode as ColorBlindMode)
      : DEFAULT_PROFILE.colorBlindMode,
    baseLightness: clampNum(o.baseLightness, PROFILE_RAILS.baseLightness, DEFAULT_PROFILE.baseLightness),
    maxChroma: clampNum(o.maxChroma, PROFILE_RAILS.maxChroma, DEFAULT_PROFILE.maxChroma),
    baseHue: clampNum(o.baseHue, PROFILE_RAILS.baseHue, DEFAULT_PROFILE.baseHue),
    reduceMotion: typeof o.reduceMotion === 'boolean' ? o.reduceMotion : DEFAULT_PROFILE.reduceMotion,
    dynamicRangeClamp: typeof o.dynamicRangeClamp === 'boolean' ? o.dynamicRangeClamp : DEFAULT_PROFILE.dynamicRangeClamp,
  };
}
