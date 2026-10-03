/**
 * Options page — full filter/effect/site management, export/import, reset.
 */

import { configStore } from './config-store';
import { storage } from './storage';
import { applyTheme } from './theme-registry';
import { EFFECTS, INTENSITIES, GlitchConfig, EffectType, Intensity, parseFilterEntry, normalizeHost } from './glitch-config';
import { EFFECT_LABELS, EFFECTS_CSS, EFFECT_STYLE_ID, FX_CLASS, displayText } from './effects';
import { createBundle, parseBundle } from './settings-bundle';

export const COMMON_AD_WORDS = ['ad', 'ads', 'advertisement', 'advertising', 'sponsored', 'sponsor', 'promoted', 'promotion', 'paid partnership'];

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const BOOL_KEYS = ['enabled', 'caseSensitive', 'wholeWord', 'showOriginalOnHover', 'clickToReveal', 'glitchAds'] as const;

const lines = (s: string) => s.split('\n').map((l) => l.trim()).filter(Boolean);

function status(text: string): void {
  $('status').textContent = text;
}

/** Per-line validation feedback for the filter textarea. */
export function filterErrors(text: string): string[] {
  return lines(text).flatMap((line, i) => {
    const r = parseFilterEntry(line);
    return r.ok ? [] : [`line ${i + 1} (“${line.slice(0, 30)}”): ${r.error}`];
  });
}

function readForm(): Partial<GlitchConfig> {
  const patch: Partial<GlitchConfig> = {
    filters: lines($<HTMLTextAreaElement>('filters').value),
    disabledSites: lines($<HTMLTextAreaElement>('disabledSites').value),
    effect: $<HTMLSelectElement>('effect').value as EffectType,
    intensity: $<HTMLSelectElement>('intensity').value as Intensity,
  };
  for (const k of BOOL_KEYS) patch[k] = $<HTMLInputElement>(k).checked;
  return patch;
}

function fillForm(c: GlitchConfig): void {
  $<HTMLTextAreaElement>('filters').value = c.filters.join('\n');
  $<HTMLTextAreaElement>('disabledSites').value = c.disabledSites.join('\n');
  $<HTMLSelectElement>('effect').value = c.effect;
  $<HTMLSelectElement>('intensity').value = c.intensity;
  for (const k of BOOL_KEYS) $<HTMLInputElement>(k).checked = c[k];
  $('errors').textContent = '';
  updatePreview();
}

function updatePreview(): void {
  const span = $('preview-word');
  const effect = $<HTMLSelectElement>('effect').value as EffectType;
  span.className = `${FX_CLASS} ${FX_CLASS}--${effect}`;
  span.setAttribute('data-gts-intensity', $<HTMLSelectElement>('intensity').value);
  span.removeAttribute('data-gts-revealed');
  span.textContent = displayText('sponsored', effect);
}

async function save(): Promise<void> {
  const errs = filterErrors($<HTMLTextAreaElement>('filters').value);
  const badSites = lines($<HTMLTextAreaElement>('disabledSites').value).filter((s) => !normalizeHost(s));
  const { config, errors } = await configStore.update(readForm());
  const all = [...errs, ...badSites.map((s) => `site “${s}” is not a hostname`)];
  fillForm(config);
  if (all.length) $('errors').textContent = `Skipped invalid entries:\n${all.join('\n')}`;
  status(errors.length ? `Saved with ${errors.length} skipped entr${errors.length === 1 ? 'y' : 'ies'}` : 'Saved ✓');
}

async function exportSettings(): Promise<void> {
  const bundle = createBundle(await configStore.get(), await storage.getProfile());
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `glitch-that-shit-settings-${bundle.exportedAt.slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  status('Exported ✓');
}

async function importSettings(file: File): Promise<void> {
  const parsed = parseBundle(await file.text());
  if (!parsed.ok) {
    status(`Import failed: ${parsed.error}`);
    return;
  }
  const { config } = await configStore.replace(parsed.config);
  if (parsed.profile) await storage.setProfile(parsed.profile);
  fillForm(config);
  status(parsed.warnings.length ? `Imported with ${parsed.warnings.length} skipped entries` : 'Imported ✓');
  if (parsed.warnings.length) $('errors').textContent = parsed.warnings.join('\n');
}

export async function initOptions(): Promise<void> {
  const style = document.createElement('style');
  style.id = EFFECT_STYLE_ID;
  style.textContent = EFFECTS_CSS;
  document.head.appendChild(style);

  $<HTMLSelectElement>('effect').append(...EFFECTS.map((e) => new Option(EFFECT_LABELS[e], e)));
  $<HTMLSelectElement>('intensity').append(...INTENSITIES.map((i) => new Option(i, i)));

  applyTheme(await storage.getProfile());
  storage.onChange(applyTheme);
  fillForm(await configStore.get());

  for (const k of BOOL_KEYS) $(k).addEventListener('change', save);
  $('effect').addEventListener('change', save);
  $('intensity').addEventListener('change', save);
  $('filters').addEventListener('input', () => {
    const errs = filterErrors($<HTMLTextAreaElement>('filters').value);
    $('errors').textContent = errs.join('\n');
  });
  $('filters').addEventListener('blur', save);
  $('disabledSites').addEventListener('blur', save);
  $('btn-save').addEventListener('click', save);
  $('btn-add-ads').addEventListener('click', () => {
    const ta = $<HTMLTextAreaElement>('filters');
    ta.value = [...new Set([...lines(ta.value), ...COMMON_AD_WORDS])].join('\n');
    save();
  });
  $('btn-export').addEventListener('click', exportSettings);
  $('btn-import').addEventListener('click', () => $<HTMLInputElement>('file-import').click());
  $<HTMLInputElement>('file-import').addEventListener('change', (e) => {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) importSettings(f);
  });
  $('btn-reset').addEventListener('click', async () => {
    if (!confirm('Reset filters, effects and paused sites to defaults?')) return;
    fillForm(await configStore.reset());
    status('Reset to defaults ✓');
  });
  $('preview-word').addEventListener('click', (e) => {
    const s = e.currentTarget as HTMLElement;
    if (s.hasAttribute('data-gts-revealed')) updatePreview();
    else {
      s.setAttribute('data-gts-revealed', '');
      s.textContent = 'sponsored';
    }
  });
  configStore.onChange((c) => {
    if (!document.activeElement || !['filters', 'disabledSites'].includes(document.activeElement.id)) fillForm(c);
  });
}

if (document.getElementById('filters')) initOptions();
