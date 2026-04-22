/**
 * Tests for src/content.ts
 * Covers: init() bootstrap, storage.onChange wiring, MutationObserver re-injection.
 *
 * Strategy: vi.mock storage and theme-registry so the module's side-effectful
 * init() call is fully controllable. Each test re-imports the module via
 * vi.resetModules() to get a fresh init() execution.
 *
 * MutationObserver tests use a fake MO implementation that captures the callback
 * without actually observing the DOM — this avoids uncaught exceptions from real
 * DOM mutations triggering the actual observer inside jsdom.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ZenProfile } from '../../src/site-profile.schema';
import { DEFAULT_PROFILE } from '../../src/site-profile.schema';

// ─── Mock declarations ────────────────────────────────────────────────────────

const mockGetProfile = vi.fn<() => Promise<ZenProfile>>();
const mockSetProfile = vi.fn<(patch: Partial<ZenProfile>) => Promise<void>>();
const mockResetProfile = vi.fn<() => Promise<void>>();
const mockOnChange = vi.fn<(cb: (p: ZenProfile) => void) => void>();
const mockApplyTheme = vi.fn<(p: ZenProfile) => void>();

vi.mock('../../src/storage', () => ({
  storage: {
    getProfile: mockGetProfile,
    setProfile: mockSetProfile,
    resetProfile: mockResetProfile,
    onChange: mockOnChange,
  },
}));

vi.mock('../../src/theme-registry', () => ({
  applyTheme: mockApplyTheme,
}));

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function loadContentScript() {
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
    applyTheme: mockApplyTheme,
  }));
  await import('../../src/content');
  await new Promise(r => setTimeout(r, 0));
}

// ─── init() bootstrap ─────────────────────────────────────────────────────────

describe('content script — init()', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    mockOnChange.mockImplementation(() => {});
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  afterEach(() => {
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  it('calls storage.getProfile on startup', async () => {
    await loadContentScript();
    expect(mockGetProfile).toHaveBeenCalledOnce();
  });

  it('calls applyTheme with the loaded profile on startup', async () => {
    await loadContentScript();
    expect(mockApplyTheme).toHaveBeenCalledWith(DEFAULT_PROFILE);
  });

  it('calls storage.onChange to register a change listener', async () => {
    await loadContentScript();
    expect(mockOnChange).toHaveBeenCalledOnce();
  });

  it('onChange callback calls applyTheme when invoked', async () => {
    let registeredCallback: ((p: ZenProfile) => void) | null = null;
    mockOnChange.mockImplementation((cb) => { registeredCallback = cb; });

    await loadContentScript();

    expect(registeredCallback).not.toBeNull();
    const updatedProfile: ZenProfile = { ...DEFAULT_PROFILE, sensoryMode: 'glitch' };
    registeredCallback!(updatedProfile);

    expect(mockApplyTheme).toHaveBeenCalledWith(updatedProfile);
  });

  it('applies the profile returned by getProfile, not a hardcoded default', async () => {
    const customProfile: ZenProfile = { ...DEFAULT_PROFILE, sensoryMode: 'high-contrast', baseHue: 45 };
    mockGetProfile.mockResolvedValue(customProfile);

    await loadContentScript();

    expect(mockApplyTheme).toHaveBeenCalledWith(customProfile);
  });
});

// ─── MutationObserver re-injection ───────────────────────────────────────────

describe('content script — MutationObserver re-injection', () => {
  // Captured state from the fake MutationObserver
  let capturedCallback: MutationCallback | null = null;
  let capturedObserveTarget: Node | null = null;
  let capturedObserveOptions: MutationObserverInit | null = null;

  // Fake MutationObserver that captures init args but never actually observes
  class FakeMutationObserver {
    constructor(cb: MutationCallback) {
      capturedCallback = cb;
    }
    observe(target: Node, options?: MutationObserverInit) {
      capturedObserveTarget = target;
      capturedObserveOptions = options ?? null;
    }
    disconnect() {}
    takeRecords(): MutationRecord[] { return []; }
  }

  beforeEach(() => {
    vi.clearAllMocks();
    mockGetProfile.mockResolvedValue(DEFAULT_PROFILE);
    mockOnChange.mockImplementation(() => {});
    capturedCallback = null;
    capturedObserveTarget = null;
    capturedObserveOptions = null;

    // Replace global MutationObserver with our fake
    vi.stubGlobal('MutationObserver', FakeMutationObserver);

    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    document.getElementById('zenos-theme-registry')?.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  it('sets up a MutationObserver on document.documentElement', async () => {
    await loadContentScript();
    expect(capturedObserveTarget).toBe(document.documentElement);
  });

  it('observes with childList, subtree, and attributes flags', async () => {
    await loadContentScript();
    expect(capturedObserveOptions).toMatchObject({
      childList: true,
      subtree: true,
      attributes: true,
    });
  });

  it('observes the data-zenos-sensory attribute filter', async () => {
    await loadContentScript();
    expect(capturedObserveOptions?.attributeFilter).toContain('data-zenos-sensory');
  });

  it('observes the style and class attribute filters', async () => {
    await loadContentScript();
    expect(capturedObserveOptions?.attributeFilter).toContain('style');
    expect(capturedObserveOptions?.attributeFilter).toContain('class');
  });

  it('re-fetches profile when style element is absent', async () => {
    await loadContentScript();
    const callsBefore = mockGetProfile.mock.calls.length;

    // Simulate: style gone, attribute present
    // (do NOT touch DOM — just control document state via inline setup)
    // No zenos-theme-registry exists (we removed it in beforeEach),
    // and no data-zenos-sensory attribute — so both are gone.
    // Invoke callback directly:
    capturedCallback!([], {} as MutationObserver);
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetProfile.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('re-fetches profile when data-zenos-sensory attribute is absent', async () => {
    // Add style element but no attribute
    const styleEl = document.createElement('style');
    styleEl.id = 'zenos-theme-registry';
    document.head.appendChild(styleEl);
    // No data-zenos-sensory attribute

    await loadContentScript();
    const callsBefore = mockGetProfile.mock.calls.length;

    capturedCallback!([], {} as MutationObserver);
    await new Promise(r => setTimeout(r, 0));

    expect(mockGetProfile.mock.calls.length).toBeGreaterThan(callsBefore);

    styleEl.remove();
  });

  it('does NOT re-fetch when both style element and attribute are present', async () => {
    // Setup: both present
    const styleEl = document.createElement('style');
    styleEl.id = 'zenos-theme-registry';
    document.head.appendChild(styleEl);
    document.documentElement.setAttribute('data-zenos-sensory', 'calm');

    await loadContentScript();
    const callsBefore = mockGetProfile.mock.calls.length;

    capturedCallback!([], {} as MutationObserver);
    await new Promise(r => setTimeout(r, 0));

    // No extra call
    expect(mockGetProfile.mock.calls.length).toBe(callsBefore);

    styleEl.remove();
    document.documentElement.removeAttribute('data-zenos-sensory');
  });

  it('calls applyTheme with the re-fetched profile after re-injection', async () => {
    const newProfile: ZenProfile = { ...DEFAULT_PROFILE, sensoryMode: 'glitch' };
    // First call: startup; second call: after observer fires
    mockGetProfile
      .mockResolvedValueOnce(DEFAULT_PROFILE)
      .mockResolvedValueOnce(newProfile);

    await loadContentScript();

    // Trigger re-injection (style absent, attribute absent)
    capturedCallback!([], {} as MutationObserver);
    await new Promise(r => setTimeout(r, 0));

    // applyTheme should have been called twice: startup + re-injection
    expect(mockApplyTheme).toHaveBeenCalledTimes(2);
    expect(mockApplyTheme).toHaveBeenLastCalledWith(newProfile);
  });
});