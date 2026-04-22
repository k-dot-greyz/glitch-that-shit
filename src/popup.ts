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

async function renderPopup(): Promise<void> {
  const profile = await storage.getProfile();

  document.body.innerHTML = `
    <div class="zen-popup">
      <header>
        <span class="zen-logo">⚡</span>
        <span class="zen-title">glitch-that-shit</span>
        <button id="btn-reset" title="Reset to defaults">↺</button>
      </header>

      <section class="zen-section">
        <label class="zen-label">SENSORY MODE</label>
        <div class="zen-toggle-group" id="sensory-group">
          ${(['default','calm','glitch','high-contrast'] as SensoryMode[]).map(m => `
            <button class="zen-toggle ${profile.sensoryMode === m ? 'active' : ''}"
                    data-sensory="${m}">${m}</button>
          `).join('')}
        </div>
      </section>

      <section class="zen-section">
        <label class="zen-label">COLORBLIND MODE</label>
        <div class="zen-toggle-group" id="colorblind-group">
          ${(['none','protanopia','deuteranopia','tritanopia'] as ColorBlindMode[]).map(m => `
            <button class="zen-toggle ${profile.colorBlindMode === m ? 'active' : ''}"
                    data-colorblind="${m}">${m}</button>
          `).join('')}
        </div>
      </section>

      <section class="zen-section">
        <label class="zen-label">LIGHTNESS
          <span class="zen-val" id="val-lightness">${profile.baseLightness.toFixed(2)}</span>
        </label>
        <input type="range" id="slider-lightness" min="0.08" max="0.35" step="0.01"
               value="${profile.baseLightness}" />
      </section>

      <section class="zen-section">
        <label class="zen-label">CHROMA (saturation)
          <span class="zen-val" id="val-chroma">${profile.maxChroma.toFixed(3)}</span>
        </label>
        <input type="range" id="slider-chroma" min="0.00" max="0.18" step="0.005"
               value="${profile.maxChroma}" />
      </section>

      <section class="zen-section">
        <label class="zen-label">HUE
          <span class="zen-val" id="val-hue">${Math.round(profile.baseHue)}°</span>
        </label>
        <input type="range" id="slider-hue" min="0" max="360" step="1"
               value="${profile.baseHue}" />
      </section>

      <section class="zen-section zen-toggles">
        <label class="zen-check">
          <input type="checkbox" id="chk-motion" ${profile.reduceMotion ? 'checked' : ''} />
          Reduce motion
        </label>
        <label class="zen-check">
          <input type="checkbox" id="chk-hdr" ${profile.dynamicRangeClamp ? 'checked' : ''} />
          HDR chroma clamp
        </label>
      </section>

      <div class="zen-preview" id="preview">
        <span class="zen-preview-text">Preview</span>
      </div>
    </div>
  `;

  // Inject popup's own theme preview
  const previewStyle = document.createElement('style');
  previewStyle.id = 'popup-preview-style';
  previewStyle.textContent = generateThemeVariables(profile);
  document.head.appendChild(previewStyle);

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
    document.querySelectorAll('[data-sensory]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    update({ sensoryMode: btn.dataset.sensory as SensoryMode });
  });

  // Colorblind mode
  document.getElementById('colorblind-group')!.addEventListener('click', (e) => {
    const btn = (e.target as HTMLElement).closest('[data-colorblind]') as HTMLElement;
    if (!btn) return;
    document.querySelectorAll('[data-colorblind]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
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
