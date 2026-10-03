/**
 * Global test setup: mock Chrome extension APIs + window.matchMedia.
 * Loaded by vitest.config.ts setupFiles.
 */

import { vi } from 'vitest';

// --- Chrome storage mock ---
const storageData: Record<string, unknown> = {};
const storageListeners: Array<
  (changes: Record<string, chrome.storage.StorageChange>, area: string) => void
> = [];

// chrome.storage.local (GlitchConfig) — separate backing store, same listener list
const localData: Record<string, unknown> = {};

const chromeMock = {
  runtime: {
    sendMessage: vi.fn(async () => undefined),
    onMessage: { addListener: vi.fn() },
    openOptionsPage: vi.fn(async () => undefined),
  },
  tabs: {
    query: vi.fn(async () => []),
    sendMessage: vi.fn(async () => undefined),
  },
  storage: {
    local: {
      get: vi.fn(async (key: string | null) => {
        if (key === null) return { ...localData };
        return { [key]: localData[key] };
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) {
          const oldValue = localData[k];
          localData[k] = v;
          storageListeners.forEach(l => l({ [k]: { oldValue, newValue: v } }, 'local'));
        }
      }),
      remove: vi.fn(async (keys: string | string[]) => {
        for (const k of ([] as string[]).concat(keys)) delete localData[k];
      }),
    },
    sync: {
      get: vi.fn(async (key: string) => {
        return { [key]: storageData[key] };
      }),
      set: vi.fn(async (items: Record<string, unknown>) => {
        for (const [k, v] of Object.entries(items)) {
          const oldValue = storageData[k];
          storageData[k] = v;
          // Notify listeners
          const changes: Record<string, chrome.storage.StorageChange> = {
            [k]: { oldValue, newValue: v },
          };
          storageListeners.forEach(l => l(changes, 'sync'));
        }
      }),
    },
    onChanged: {
      addListener: vi.fn((listener: (changes: Record<string, chrome.storage.StorageChange>, area: string) => void) => {
        storageListeners.push(listener);
      }),
    },
  },
};

// Expose helpers for tests to control storage state
(globalThis as Record<string, unknown>).__chromeMock = chromeMock;
(globalThis as Record<string, unknown>).__storageData = storageData;
(globalThis as Record<string, unknown>).__localData = localData;
(globalThis as Record<string, unknown>).__storageListeners = storageListeners;

Object.defineProperty(globalThis, 'chrome', {
  value: chromeMock,
  writable: true,
  configurable: true,
});

// --- window.matchMedia mock ---
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  configurable: true,
  value: vi.fn((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});