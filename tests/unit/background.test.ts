import { describe, it, expect, beforeAll, beforeEach, vi } from 'vitest';
import { CONFIG_KEY } from '../../src/config-store';
import { defaultConfig } from '../../src/glitch-config';

const local = () => (globalThis as any).__localData as Record<string, unknown>;
const c = (globalThis as any).__chromeMock;
const listener = () => ({ addListener: vi.fn() });
const tick = () => new Promise((r) => setTimeout(r, 0));

Object.assign(c.runtime, { onInstalled: listener(), onStartup: listener() });
c.runtime.onMessage = listener();
c.commands = { onCommand: listener() };
c.contextMenus = {
  onClicked: listener(),
  create: vi.fn(),
  removeAll: vi.fn((cb: () => void) => cb()),
};
c.action = {
  setBadgeText: vi.fn(async () => undefined),
  setBadgeBackgroundColor: vi.fn(async () => undefined),
};

let bg: typeof import('../../src/background');
const handler = (mock: any) => mock.addListener.mock.calls[0][0];

describe('background', () => {
  beforeAll(async () => {
    bg = await import('../../src/background');
  });
  beforeEach(() => {
    for (const k of Object.keys(local())) delete local()[k];
    c.action.setBadgeText.mockClear();
    c.contextMenus.create.mockClear();
  });

  it('onInstalled initializes config, builds menus and badge', async () => {
    local().filterList = ['legacy'];
    await handler(c.runtime.onInstalled)({ reason: 'update' });
    expect((local()[CONFIG_KEY] as any).filters).toEqual(['legacy']);
    expect(c.contextMenus.create).toHaveBeenCalledTimes(3);
    expect(c.action.setBadgeText).toHaveBeenCalledWith({ text: '' });
  });

  it('toggleEnabled flips and shows OFF badge', async () => {
    expect(await bg.toggleEnabled()).toBe(false);
    await tick();
    await tick();
    expect(c.action.setBadgeText).toHaveBeenCalledWith({ text: 'OFF' });
    expect(await bg.toggleEnabled()).toBe(true);
  });

  it('commands: toggle, cycle, settings', async () => {
    const onCommand = handler(c.commands.onCommand);
    await onCommand('cycle-effects');
    expect((local()[CONFIG_KEY] as any).effect).toBe('pixelate');
    await onCommand('toggle-extension');
    expect((local()[CONFIG_KEY] as any).enabled).toBe(false);
    await onCommand('open-settings');
    expect(c.runtime.openOptionsPage).toHaveBeenCalled();
  });

  it('toggleSite pauses and resumes a host (incl. subdomain entries)', async () => {
    expect(await bg.toggleSite('https://www.example.com/a')).toBe(true);
    expect((local()[CONFIG_KEY] as any).disabledSites).toEqual(['www.example.com']);
    expect(await bg.toggleSite('https://www.example.com/b')).toBe(false);
    expect((local()[CONFIG_KEY] as any).disabledSites).toEqual([]);
    expect(await bg.toggleSite('chrome://extensions')).toBe(null);
    expect(await bg.toggleSite(undefined)).toBe(null);
  });

  it('context menu adds selection as a filter', async () => {
    await handler(c.contextMenus.onClicked)({ menuItemId: 'gts-add-selection', selectionText: '  crypto bro ' }, { id: 1 });
    expect((local()[CONFIG_KEY] as any).filters).toContain('crypto bro');
  });

  it('hit messages set a per-tab badge; junk is ignored', async () => {
    const onMessage = handler(c.runtime.onMessage);
    onMessage({ type: 'gts:hits', count: 12 }, { tab: { id: 7 } });
    await tick();
    expect(c.action.setBadgeText).toHaveBeenCalledWith({ tabId: 7, text: '12' });
    c.action.setBadgeText.mockClear();
    onMessage({ type: 'gts:hits', count: 'lots' }, { tab: { id: 7 } });
    onMessage({ type: 'gts:hits', count: 1 }, {});
    await tick();
    expect(c.action.setBadgeText).not.toHaveBeenCalled();
  });

  it('per-tab badge reads OFF when disabled', async () => {
    local()[CONFIG_KEY] = { ...defaultConfig(), enabled: false };
    handler(c.runtime.onMessage)({ type: 'gts:hits', count: 0 }, { tab: { id: 3 } });
    await tick();
    await tick();
    expect(c.action.setBadgeText).toHaveBeenCalledWith({ tabId: 3, text: 'OFF' });
  });
});
