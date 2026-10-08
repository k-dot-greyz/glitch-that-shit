/**
 * Background (MV3 service worker on Chromium, event page on Firefox).
 * - install/update: initialize + migrate config
 * - keyboard commands, context menus, per-tab hit badge
 * All settings changes go through configStore → storage.onChanged → content scripts.
 */

import { configStore } from './config-store';
import { isSiteDisabled, nextEffect, normalizeHost } from './glitch-config';
import { isMessage } from './messages';

const MENU_ADD = 'gts-add-selection';
const MENU_SITE = 'gts-toggle-site';
const MENU_TOGGLE = 'gts-toggle';

export async function toggleEnabled(): Promise<boolean> {
  const c = await configStore.get();
  const { config } = await configStore.update({ enabled: !c.enabled });
  return config.enabled;
}

export async function cycleEffect(): Promise<string> {
  const c = await configStore.get();
  const { config } = await configStore.update({ effect: nextEffect(c.effect) });
  return config.effect;
}

export async function toggleSite(url: string | undefined): Promise<boolean | null> {
  const host = url ? normalizeHost(url) : null;
  if (!host) return null;
  const c = await configStore.get();
  const disabled = isSiteDisabled(host, c.disabledSites);
  const disabledSites = disabled
    ? c.disabledSites.filter((s) => !(host === s || host.endsWith(`.${s}`)))
    : [...c.disabledSites, host];
  await configStore.update({ disabledSites });
  return !disabled; // true = now disabled
}

async function refreshGlobalBadge(): Promise<void> {
  const c = await configStore.get();
  await chrome.action.setBadgeBackgroundColor({ color: c.enabled ? '#00a37a' : '#b3261e' });
  if (!c.enabled) await chrome.action.setBadgeText({ text: 'OFF' });
  else await chrome.action.setBadgeText({ text: '' });
}

function createMenus(): void {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({ id: MENU_ADD, title: 'Glitch "%s" everywhere', contexts: ['selection'] });
    chrome.contextMenus.create({ id: MENU_SITE, title: 'Pause / resume glitching on this site', contexts: ['page'] });
    chrome.contextMenus.create({ id: MENU_TOGGLE, title: 'Toggle glitch-that-shit on/off', contexts: ['page'] });
  });
}

chrome.runtime.onInstalled.addListener(async () => {
  await configStore.ensureInitialized();
  createMenus();
  await refreshGlobalBadge();
});

chrome.runtime.onStartup?.addListener(() => {
  refreshGlobalBadge().catch(() => {});
});

chrome.commands?.onCommand.addListener(async (command) => {
  switch (command) {
    case 'toggle-extension':
      await toggleEnabled();
      break;
    case 'cycle-effects':
      await cycleEffect();
      break;
    case 'open-settings':
      await chrome.runtime.openOptionsPage();
      break;
  }
});

chrome.contextMenus?.onClicked.addListener(async (info, tab) => {
  switch (info.menuItemId) {
    case MENU_ADD:
      if (info.selectionText) await configStore.addFilter(info.selectionText.trim().slice(0, 200));
      break;
    case MENU_SITE:
      await toggleSite(tab?.url);
      break;
    case MENU_TOGGLE:
      await toggleEnabled();
      break;
  }
});

chrome.runtime.onMessage.addListener((msg: unknown, sender) => {
  if (!isMessage(msg) || msg.type !== 'gts:hits') return false;
  const tabId = sender.tab?.id;
  if (tabId == null) return false;
  configStore.get().then((c) => {
    const n = Math.max(0, Math.floor(msg.count));
    const text = !c.enabled ? 'OFF' : n ? (n > 999 ? '999+' : String(n)) : '';
    chrome.action.setBadgeText({ tabId, text }).catch(() => {});
  });
  return false;
});

configStore.onChange(() => {
  refreshGlobalBadge().catch(() => {});
});
