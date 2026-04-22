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
