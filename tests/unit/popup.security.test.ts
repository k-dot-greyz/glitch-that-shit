/**
 * Security boundary tests for src/popup.ts
 * Attack surface: slider NaN/overflow, storage-driven re-render, reset under corruption.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZenProfile } from '../../src/site-profile.schema';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';
import { SecurityHarness } from '../helpers/security-harness';

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

async function loadPopup(profile: ZenProfile) {
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
  await new Promise(r => setTimeout(r, 0));
}

describe('popup — hostile profile rendering (SecurityHarness)', () => {
  const harness = new SecurityHarness();

  beforeEach(() => {
    vi.clearAllMocks();
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
  });

  afterEach(() => {
    document.body.innerHTML = '';
    document.head.querySelectorAll('#popup-preview-style').forEach(e => e.remove());
  });

  it('renders only enum sensory buttons even when stored mode is hostile', async () => {
    const hostile = harness.corruptProfile({
      sensoryMode: harness.catalog.attributeInjectionSensoryModes[0] as never,
    });
    await loadPopup(hostile);

    const labels = Array.from(document.querySelectorAll('[data-sensory]'))
      .map(b => (b as HTMLElement).dataset.sensory);
    expect(labels).toEqual(['default', 'calm', 'glitch', 'high-contrast']);
    expect(document.querySelector('.zen-popup')?.innerHTML).not.toContain('<script>');
  });

  it('does not mark any sensory button active when stored mode is not in enum', async () => {
    const hostile = harness.corruptProfile({
      sensoryMode: harness.catalog.attributeInjectionSensoryModes[1] as never,
    });
    await loadPopup(hostile);
    expect(document.querySelectorAll('[data-sensory].active')).toHaveLength(0);
  });

  it.each(harness.catalog.numericEdgeValues)(
    'slider input with hostile baseLightness %s calls setProfile without throwing',
    async (value) => {
      await loadPopup(DEFAULT_PROFILE);
      const slider = document.getElementById('slider-lightness') as HTMLInputElement;
      slider.value = String(value);
      expect(() => slider.dispatchEvent(new Event('input'))).not.toThrow();
      await Promise.resolve();
      expect(mockSetProfile).toHaveBeenCalled();
    },
  );

  it('reset still invokes storage.resetProfile when profile is corrupted', async () => {
    await loadPopup(
      harness.corruptProfile({
        sensoryMode: harness.catalog.agenticInstructionStrings[0] as never,
      }),
    );
    document.getElementById('btn-reset')!.click();
    await new Promise(r => setTimeout(r, 0));
    expect(mockResetProfile).toHaveBeenCalledOnce();
  });

  it('clicking sensory group padding does not call setProfile with hostile dataset', async () => {
    await loadPopup(DEFAULT_PROFILE);
    const callsBefore = mockSetProfile.mock.calls.length;
    const group = document.getElementById('sensory-group')!;
    group.dispatchEvent(new MouseEvent('click', { bubbles: true, target: group }));
    await Promise.resolve();
    expect(mockSetProfile.mock.calls.length).toBe(callsBefore);
  });
});
