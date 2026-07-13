/**
 * Tests for src/popup.ts
 * Covers: renderPopup DOM output, button/slider/checkbox interaction, reset flow.
 *
 * Strategy: vi.mock storage and theme-registry; import popup.ts to trigger
 * renderPopup() at module level, then test the resulting DOM.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZenProfile } from '../../src/site-profile.schema';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';

// ─── Mock declarations ────────────────────────────────────────────────────────

const mockGetProfile = vi.fn<() => Promise<ZenProfile>>();
const mockSetProfile = vi.fn<(patch: Partial<ZenProfile>) => Promise<void>>();
const mockResetProfile = vi.fn<() => Promise<void>>();
const mockOnChange = vi.fn<(cb: (p: ZenProfile) => void) => void>();
const mockGenerateThemeVariables = vi.fn<(p: ZenProfile) => string>(() => ':root {}');

vi.mock('../../src/storage', () => ({
  storage: {
    getProfile: mockGetProfile,
    setProfile: mockSetProfile,
    resetProfile: mockResetProfile,
    onChange: mockOnChange,
  },
}));

vi.mock('../../src/theme-registry', () => ({
  generateThemeVariables: mockGenerateThemeVariables,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadPopup(profile: ZenProfile = DEFAULT_PROFILE) {
  vi.resetModules();
  vi.mock('../../src/storage', () => ({
    storage: {
      getProfile: mockGetProfile,
      setProfile: mockSetProfile,
      resetProfile: mockResetProfile,
      onChange: mockOnChange,
    },
  }));
  vi.mock('../../src/theme-registry', () => ({
    generateThemeVariables: mockGenerateThemeVariables,
  }));

  mockGetProfile.mockResolvedValue(profile);
  mockSetProfile.mockResolvedValue(undefined);
  mockResetProfile.mockResolvedValue(undefined);

  await import('../../src/popup');
  // Flush async tasks
  await new Promise(r => setTimeout(r, 0));
}

// ─── DOM structure ────────────────────────────────────────────────────────────

describe('renderPopup — DOM structure', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
  });

  it('renders the .zen-popup container', async () => {
    await loadPopup();
    expect(document.querySelector('.zen-popup')).not.toBeNull();
  });

  it('renders all four sensory mode buttons', async () => {
    await loadPopup();
    const btns = document.querySelectorAll('[data-sensory]');
    expect(btns).toHaveLength(4);
    const modes = Array.from(btns).map(b => (b as HTMLElement).dataset.sensory);
    expect(modes).toContain('default');
    expect(modes).toContain('calm');
    expect(modes).toContain('glitch');
    expect(modes).toContain('high-contrast');
  });

  it('renders all four colorblind mode buttons', async () => {
    await loadPopup();
    const btns = document.querySelectorAll('[data-colorblind]');
    expect(btns).toHaveLength(4);
    const modes = Array.from(btns).map(b => (b as HTMLElement).dataset.colorblind);
    expect(modes).toContain('none');
    expect(modes).toContain('protanopia');
    expect(modes).toContain('deuteranopia');
    expect(modes).toContain('tritanopia');
  });

  it('renders lightness, chroma, and hue sliders', async () => {
    await loadPopup();
    expect(document.getElementById('slider-lightness')).not.toBeNull();
    expect(document.getElementById('slider-chroma')).not.toBeNull();
    expect(document.getElementById('slider-hue')).not.toBeNull();
  });

  it('renders reduce-motion and HDR checkboxes', async () => {
    await loadPopup();
    expect(document.getElementById('chk-motion')).not.toBeNull();
    expect(document.getElementById('chk-hdr')).not.toBeNull();
  });

  it('renders the reset button', async () => {
    await loadPopup();
    expect(document.getElementById('btn-reset')).not.toBeNull();
  });

  it('renders the preview div', async () => {
    await loadPopup();
    expect(document.getElementById('preview')).not.toBeNull();
  });

  it('marks current sensoryMode button as active', async () => {
    await loadPopup(makeProfile({ sensoryMode: 'glitch' }));
    const activeBtn = document.querySelector('.zen-toggle.active[data-sensory]') as HTMLElement;
    expect(activeBtn).not.toBeNull();
    expect(activeBtn.dataset.sensory).toBe('glitch');
  });

  it('marks current colorBlindMode button as active', async () => {
    await loadPopup(makeProfile({ colorBlindMode: 'tritanopia' }));
    const activeBtn = document.querySelector('.zen-toggle.active[data-colorblind]') as HTMLElement;
    expect(activeBtn).not.toBeNull();
    expect(activeBtn.dataset.colorblind).toBe('tritanopia');
  });

  it('slider values match the profile values', async () => {
    const profile = makeProfile({ baseLightness: 0.25, maxChroma: 0.10, baseHue: 240 });
    await loadPopup(profile);
    expect((document.getElementById('slider-lightness') as HTMLInputElement).value).toBe('0.25');
    expect((document.getElementById('slider-chroma') as HTMLInputElement).value).toBe('0.1');
    expect((document.getElementById('slider-hue') as HTMLInputElement).value).toBe('240');
  });

  it('reduce-motion checkbox reflects profile.reduceMotion', async () => {
    await loadPopup(makeProfile({ reduceMotion: true }));
    expect((document.getElementById('chk-motion') as HTMLInputElement).checked).toBe(true);

    document.body.innerHTML = '';
    vi.clearAllMocks();
    await loadPopup(makeProfile({ reduceMotion: false }));
    expect((document.getElementById('chk-motion') as HTMLInputElement).checked).toBe(false);
  });

  it('injects popup-preview-style element into head', async () => {
    await loadPopup();
    expect(document.getElementById('popup-preview-style')).not.toBeNull();
  });

  it('calls generateThemeVariables for the preview style', async () => {
    await loadPopup();
    expect(mockGenerateThemeVariables).toHaveBeenCalled();
  });
});

// ─── Sensory mode interaction ─────────────────────────────────────────────────

describe('renderPopup — sensory mode toggle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking a sensory button calls storage.setProfile with the sensoryMode', async () => {
    const glitchBtn = document.querySelector('[data-sensory="glitch"]') as HTMLElement;
    glitchBtn.click();
    await Promise.resolve();
    expect(mockSetProfile).toHaveBeenCalledWith(expect.objectContaining({ sensoryMode: 'glitch' }));
  });

  it('clicking a sensory button makes it active and removes active from others', async () => {
    const glitchBtn = document.querySelector('[data-sensory="glitch"]') as HTMLElement;
    glitchBtn.click();
    await Promise.resolve();

    expect(glitchBtn.classList.contains('active')).toBe(true);
    document.querySelectorAll('[data-sensory]').forEach(b => {
      if ((b as HTMLElement).dataset.sensory !== 'glitch') {
        expect(b.classList.contains('active')).toBe(false);
      }
    });
  });

  it('clicking the sensory group container with no button target does nothing', async () => {
    const group = document.getElementById('sensory-group')!;
    group.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    // setProfile is only called once — from initial renderPopup update call, not this click
    const setProfileCallsAfterRender = mockSetProfile.mock.calls.length;
    group.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    await Promise.resolve();
    expect(mockSetProfile.mock.calls.length).toBe(setProfileCallsAfterRender);
  });
});

// ─── Colorblind mode interaction ──────────────────────────────────────────────

describe('renderPopup — colorblind mode toggle', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking a colorblind button calls storage.setProfile with colorBlindMode', async () => {
    const btn = document.querySelector('[data-colorblind="protanopia"]') as HTMLElement;
    btn.click();
    await Promise.resolve();
    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ colorBlindMode: 'protanopia' })
    );
  });

  it('clicking a colorblind button adds active class to it', async () => {
    const btn = document.querySelector('[data-colorblind="deuteranopia"]') as HTMLElement;
    btn.click();
    await Promise.resolve();
    expect(btn.classList.contains('active')).toBe(true);
  });

  it('clicking a colorblind button removes active from sibling buttons', async () => {
    const btn = document.querySelector('[data-colorblind="tritanopia"]') as HTMLElement;
    btn.click();
    await Promise.resolve();
    document.querySelectorAll('[data-colorblind]').forEach(b => {
      if ((b as HTMLElement).dataset.colorblind !== 'tritanopia') {
        expect(b.classList.contains('active')).toBe(false);
      }
    });
  });
});

// ─── Slider interactions ──────────────────────────────────────────────────────

describe('renderPopup — sliders', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('lightness slider input updates the val-lightness display', async () => {
    const slider = document.getElementById('slider-lightness') as HTMLInputElement;
    const display = document.getElementById('val-lightness')!;

    slider.value = '0.22';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(display.textContent).toBe('0.22');
  });

  it('lightness slider input calls setProfile with baseLightness', async () => {
    const slider = document.getElementById('slider-lightness') as HTMLInputElement;
    slider.value = '0.22';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ baseLightness: 0.22 })
    );
  });

  it('chroma slider input updates the val-chroma display with 3 decimal places', async () => {
    const slider = document.getElementById('slider-chroma') as HTMLInputElement;
    const display = document.getElementById('val-chroma')!;

    slider.value = '0.075';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(display.textContent).toBe('0.075');
  });

  it('chroma slider input calls setProfile with maxChroma', async () => {
    const slider = document.getElementById('slider-chroma') as HTMLInputElement;
    slider.value = '0.075';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ maxChroma: 0.075 })
    );
  });

  it('hue slider input updates the val-hue display with degree symbol', async () => {
    const slider = document.getElementById('slider-hue') as HTMLInputElement;
    const display = document.getElementById('val-hue')!;

    slider.value = '200';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(display.textContent).toBe('200°');
  });

  it('hue slider input calls setProfile with baseHue', async () => {
    const slider = document.getElementById('slider-hue') as HTMLInputElement;
    slider.value = '200';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ baseHue: 200 })
    );
  });

  it('hue display rounds float values', async () => {
    const slider = document.getElementById('slider-hue') as HTMLInputElement;
    const display = document.getElementById('val-hue')!;

    slider.value = '179.7';
    slider.dispatchEvent(new Event('input'));
    await Promise.resolve();

    expect(display.textContent).toBe('180°');
  });
});

// ─── Checkbox interactions ────────────────────────────────────────────────────

describe('renderPopup — checkboxes', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('unchecking reduce-motion calls setProfile with reduceMotion: false', async () => {
    const chk = document.getElementById('chk-motion') as HTMLInputElement;
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ reduceMotion: false })
    );
  });

  it('checking reduce-motion calls setProfile with reduceMotion: true', async () => {
    const chk = document.getElementById('chk-motion') as HTMLInputElement;
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ reduceMotion: true })
    );
  });

  it('unchecking HDR clamp calls setProfile with dynamicRangeClamp: false', async () => {
    const chk = document.getElementById('chk-hdr') as HTMLInputElement;
    chk.checked = false;
    chk.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ dynamicRangeClamp: false })
    );
  });

  it('checking HDR clamp calls setProfile with dynamicRangeClamp: true', async () => {
    const chk = document.getElementById('chk-hdr') as HTMLInputElement;
    chk.checked = true;
    chk.dispatchEvent(new Event('change'));
    await Promise.resolve();

    expect(mockSetProfile).toHaveBeenCalledWith(
      expect.objectContaining({ dynamicRangeClamp: true })
    );
  });
});

// ─── Reset button ─────────────────────────────────────────────────────────────

describe('renderPopup — reset button', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    mockSetProfile.mockResolvedValue(undefined);
    mockResetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('clicking reset calls storage.resetProfile', async () => {
    const btn = document.getElementById('btn-reset')!;
    btn.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockResetProfile).toHaveBeenCalledOnce();
  });

  it('clicking reset triggers a re-render (getProfile called again)', async () => {
    const callsBefore = mockGetProfile.mock.calls.length;
    const btn = document.getElementById('btn-reset')!;
    btn.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockGetProfile.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

// ─── Preview style updates ────────────────────────────────────────────────────

describe('renderPopup — preview style', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
    mockSetProfile.mockResolvedValue(undefined);
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    await loadPopup();
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
  });

  it('after slider change, popup-preview-style is updated', async () => {
    const newCss = ':root { --zen-bg: oklch(0.20 0 180); }';
    mockGenerateThemeVariables.mockReturnValueOnce(newCss);
    mockGetProfile.mockResolvedValueOnce({ ...DEFAULT_PROFILE, baseLightness: 0.20 });

    const slider = document.getElementById('slider-lightness') as HTMLInputElement;
    slider.value = '0.20';
    slider.dispatchEvent(new Event('input'));
    await new Promise(r => setTimeout(r, 0));

    const styleEl = document.getElementById('popup-preview-style') as HTMLStyleElement;
    expect(styleEl).not.toBeNull();
    expect(mockGenerateThemeVariables).toHaveBeenCalledTimes(2); // initial + update
  });
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeProfile(overrides: Partial<ZenProfile> = {}): ZenProfile {
  return { ...DEFAULT_PROFILE, ...overrides };
}