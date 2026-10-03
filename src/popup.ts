/**
 * Popup UI — Vanilla TS.
 * OKLCH sliders, sensory mode, colorblind profile selector.
 * Writes to chrome.storage.sync → content script picks up onChange.
 *
 * dex_id: 0x7E:0x35
 * Refs: glitch-that-shit#5
 */

import { storage } from './storage';
import { ZenProfile, DEFAULT_PROFILE, SensoryMode, ColorBlindMode } from './site-profile.schema';
import { generateThemeVariables } from './theme-registry';
import { configStore } from './config-store';
import { EFFECTS, INTENSITIES, EffectType, Intensity, GlitchConfig, isSiteDisabled, normalizeHost } from './glitch-config';
import { EFFECT_LABELS } from './effects';
import type { StatusResponse } from './messages';

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: Partial<HTMLElementTagNameMap[K]> & Record<string, unknown> = {},
  children: (Node | string)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  Object.assign(node, props);
  node.append(...children);
  return node;
}

async function activeTab(): Promise<{ id?: number; url?: string } | null> {
  try {
    const [tab] = (await chrome.tabs?.query({ active: true, currentWindow: true })) ?? [];
    return tab ?? null;
  } catch {
    return null;
  }
}

/** Filter controls (enable, effect, intensity, quick-add, per-site pause). Built with DOM APIs — no user data in innerHTML. */
export async function renderGlitchSection(root: HTMLElement): Promise<void> {
  let config: GlitchConfig = await configStore.get();
  const tab = await activeTab();
  const host = tab?.url ? normalizeHost(tab.url) : null;

  const enabled = el('input', { type: 'checkbox', id: 'chk-enabled', checked: config.enabled });
  const effect = el('select', { id: 'sel-effect', className: 'gts-select' },
    EFFECTS.map((e) => el('option', { value: e, selected: e === config.effect }, [EFFECT_LABELS[e]])));
  const intensity = el('select', { id: 'sel-intensity', className: 'gts-select' },
    INTENSITIES.map((i) => el('option', { value: i, selected: i === config.intensity }, [i])));
  const input = el('input', { type: 'text', id: 'inp-filter', className: 'gts-input', placeholder: 'word, phrase or /regex/i', maxLength: 200 });
  const add = el('button', { id: 'btn-add-filter', className: 'gts-btn', type: 'submit' }, ['+ glitch']);
  const msg = el('div', { id: 'filter-msg', className: 'gts-msg', role: 'status' });
  const form = el('form', { id: 'form-add-filter', className: 'gts-row' }, [input, add]);
  const site = el('input', { type: 'checkbox', id: 'chk-site', disabled: !host, checked: !!host && !isSiteDisabled(host, config.disabledSites) });
  const hits = el('span', { id: 'val-hits', className: 'zen-val' }, ['–']);
  const settings = el('button', { id: 'btn-settings', className: 'gts-btn', type: 'button' }, ['settings ⚙']);

  root.replaceChildren(
    el('label', { className: 'zen-check gts-master' }, [enabled, ' Glitching enabled']),
    el('div', { className: 'gts-row' }, [effect, intensity]),
    form,
    msg,
    el('div', { className: 'gts-row gts-between' }, [
      el('label', { className: 'zen-check' }, [site, ` Active on ${host ?? 'this page'}`]),
      el('span', { className: 'gts-count' }, ['hits on page: ', hits]),
    ]),
    el('div', { className: 'gts-row gts-between' }, [
      el('span', { className: 'gts-count', id: 'val-filter-count' }, [`${config.filters.length} filters`]),
      settings,
    ]),
  );

  const save = async (patch: Partial<GlitchConfig>) => {
    const res = await configStore.update(patch);
    config = res.config;
    document.getElementById('val-filter-count')!.textContent = `${config.filters.length} filters`;
    return res;
  };

  enabled.addEventListener('change', () => save({ enabled: enabled.checked }));
  effect.addEventListener('change', () => save({ effect: effect.value as EffectType }));
  intensity.addEventListener('change', () => save({ intensity: intensity.value as Intensity }));
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const value = input.value.trim();
    if (!value) return;
    const before = config.filters.length;
    const res = await save({ filters: [...config.filters, value] });
    if (res.config.filters.length > before) {
      msg.textContent = `added “${value}”`;
      msg.dataset.kind = 'ok';
      input.value = '';
    } else {
      msg.textContent = res.errors[0]?.replace(/^filter "[^"]*": /, '') ?? 'already in your list';
      msg.dataset.kind = 'error';
    }
  });
  site.addEventListener('change', () => {
    if (!host) return;
    const rest = config.disabledSites.filter((s) => !(host === s || host.endsWith(`.${s}`)));
    save({ disabledSites: site.checked ? rest : [...rest, host] });
  });
  settings.addEventListener('click', () => chrome.runtime?.openOptionsPage?.());

  if (tab?.id != null) {
    try {
      chrome.tabs
        ?.sendMessage(tab.id, { type: 'gts:status' })
        ?.then((r: StatusResponse | undefined) => {
          if (r) hits.textContent = String(r.hits);
        })
        ?.catch(() => {});
    } catch {
      /* no content script on this page (chrome://, store pages) */
    }
  }
}

/** Static markup only — every dynamic value is applied through DOM properties in hydrate(). */
const POPUP_TEMPLATE = `
    <div class="zen-popup">
      <header>
        <span class="zen-logo">⚡</span>
        <span class="zen-title">glitch-that-shit</span>
        <button id="btn-reset" title="Reset zenOS profile to defaults">↺</button>
      </header>

      <section class="zen-section gts-section" id="glitch-section" aria-label="Filtering"></section>

      <div class="zen-label">zenOS sensory profile</div>

      <section class="zen-section">
        <label class="zen-label">SENSORY MODE</label>
        <div class="zen-toggle-group" id="sensory-group">
          <button class="zen-toggle" data-sensory="default">default</button>
          <button class="zen-toggle" data-sensory="calm">calm</button>
          <button class="zen-toggle" data-sensory="glitch">glitch</button>
          <button class="zen-toggle" data-sensory="high-contrast">high-contrast</button>
        </div>
      </section>

      <section class="zen-section">
        <label class="zen-label">COLORBLIND MODE</label>
        <div class="zen-toggle-group" id="colorblind-group">
          <button class="zen-toggle" data-colorblind="none">none</button>
          <button class="zen-toggle" data-colorblind="protanopia">protanopia</button>
          <button class="zen-toggle" data-colorblind="deuteranopia">deuteranopia</button>
          <button class="zen-toggle" data-colorblind="tritanopia">tritanopia</button>
        </div>
      </section>

      <section class="zen-section">
        <label class="zen-label" for="slider-lightness">LIGHTNESS
          <span class="zen-val" id="val-lightness"></span>
        </label>
        <input type="range" id="slider-lightness" min="0.08" max="0.35" step="0.01" />
      </section>

      <section class="zen-section">
        <label class="zen-label" for="slider-chroma">CHROMA (saturation)
          <span class="zen-val" id="val-chroma"></span>
        </label>
        <input type="range" id="slider-chroma" min="0.00" max="0.18" step="0.005" />
      </section>

      <section class="zen-section">
        <label class="zen-label" for="slider-hue">HUE
          <span class="zen-val" id="val-hue"></span>
        </label>
        <input type="range" id="slider-hue" min="0" max="360" step="1" />
      </section>

      <section class="zen-section zen-toggles">
        <label class="zen-check">
          <input type="checkbox" id="chk-motion" />
          Reduce motion
        </label>
        <label class="zen-check">
          <input type="checkbox" id="chk-hdr" />
          HDR chroma clamp
        </label>
      </section>

      <div class="zen-preview" id="preview">
        <span class="zen-preview-text">Preview</span>
      </div>
    </div>
`;

function hydrate(profile: ZenProfile): void {
  document.querySelectorAll<HTMLElement>('[data-sensory]').forEach((b) => {
    b.classList.toggle('active', b.dataset.sensory === profile.sensoryMode);
    b.setAttribute('aria-pressed', String(b.dataset.sensory === profile.sensoryMode));
  });
  document.querySelectorAll<HTMLElement>('[data-colorblind]').forEach((b) => {
    b.classList.toggle('active', b.dataset.colorblind === profile.colorBlindMode);
    b.setAttribute('aria-pressed', String(b.dataset.colorblind === profile.colorBlindMode));
  });
  const setRange = (id: string, v: number) => {
    const input = document.getElementById(id) as HTMLInputElement;
    input.value = String(v);
    input.setAttribute('value', String(v));
  };
  setRange('slider-lightness', profile.baseLightness);
  setRange('slider-chroma', profile.maxChroma);
  setRange('slider-hue', profile.baseHue);
  document.getElementById('val-lightness')!.textContent = profile.baseLightness.toFixed(2);
  document.getElementById('val-chroma')!.textContent = profile.maxChroma.toFixed(3);
  document.getElementById('val-hue')!.textContent = `${Math.round(profile.baseHue)}°`;
  (document.getElementById('chk-motion') as HTMLInputElement).checked = profile.reduceMotion;
  (document.getElementById('chk-hdr') as HTMLInputElement).checked = profile.dynamicRangeClamp;
}

async function renderPopup(): Promise<void> {
  const profile = await storage.getProfile();

  // Parsed inert (DOMParser doesn't run scripts) from a static string, then adopted.
  document.body.replaceChildren(...new DOMParser().parseFromString(POPUP_TEMPLATE, 'text/html').body.childNodes);
  hydrate(profile);

  // Inject popup's own theme preview — reuse existing element to avoid cascade poisoning on re-render.
  // If renderPopup() is called again (e.g. reset), a second element with the same ID would be
  // appended AFTER the first. getElementById() would still return the first (earlier in DOM),
  // but the browser's cascade gives the second element priority — so preview updates would apply
  // to the wrong element and appear frozen at the stale values.
  let previewStyle = document.getElementById('popup-preview-style') as HTMLStyleElement | null;
  if (!previewStyle) {
    previewStyle = document.createElement('style');
    previewStyle.id = 'popup-preview-style';
    document.head.appendChild(previewStyle);
  }
  previewStyle.textContent = generateThemeVariables(profile);

  renderGlitchSection(document.getElementById('glitch-section')!).catch(() => {});

  // Wire controls
  const update = async (patch: Partial<ZenProfile>) => {
    await storage.setProfile(patch);
    const updated = await storage.getProfile();
    const s = document.getElementById('popup-preview-style') as HTMLStyleElement;
    if (s) s.textContent = generateThemeVariables(updated);
  };

  // Sensory mode
  document.getElementById('sensory-group')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-sensory]') as HTMLElement;
    if (!btn) return;
    document.querySelectorAll('[data-sensory]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    update({ sensoryMode: btn.dataset.sensory as SensoryMode });
  });

  // Colorblind mode
  document.getElementById('colorblind-group')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-colorblind]') as HTMLElement;
    if (!btn) return;
    document.querySelectorAll('[data-colorblind]').forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed', 'false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    update({ colorBlindMode: btn.dataset.colorblind as ColorBlindMode });
  });

  // Sliders
  const bindSlider = (id: string, key: keyof ZenProfile, valId: string, fmt: (n: number) => string) => {
    document.getElementById(id)!.addEventListener('input', (e) => {
      const val = parseFloat((e.target as HTMLInputElement).value);
      document.getElementById(valId)!.textContent = fmt(val);
      update({ [key]: val });
    });
  };
  bindSlider('slider-lightness', 'baseLightness', 'val-lightness', n => n.toFixed(2));
  bindSlider('slider-chroma',    'maxChroma',     'val-chroma',    n => n.toFixed(3));
  bindSlider('slider-hue',       'baseHue',       'val-hue',       n => `${Math.round(n)}°`);

  // Checkboxes
  document.getElementById('chk-motion')!.addEventListener('change', (e) => {
    update({ reduceMotion: (e.target as HTMLInputElement).checked });
  });
  document.getElementById('chk-hdr')!.addEventListener('change', (e) => {
    update({ dynamicRangeClamp: (e.target as HTMLInputElement).checked });
  });

  // Reset
  document.getElementById('btn-reset')!.addEventListener('click', async () => {
    await storage.resetProfile();
    renderPopup(); // re-render with defaults
  });
}

renderPopup();
