/**
 * Content script — runs at document_start on all URLs.
 * Loads ZenProfile from storage, applies theme, survives SPA re-renders.
 *
 * MutationObserver strategy:
 *   - Watch document.documentElement for childList + attribute mutations
 *   - If our style block gets wiped by a hostile SPA, re-inject immediately
 *   - data-zenos-sensory attribute serves as the canary: if it's gone, re-apply
 *
 * dex_id: 0x7E:0x34
 * Refs: glitch-that-shit#4
 */

import { storage } from './storage';
import { applyTheme } from './theme-registry';

const STYLE_ID = 'zenos-theme-registry';

async function init(): Promise<void> {
  // 1. Load profile and apply immediately (document_start = before render)
  const profile = await storage.getProfile();
  applyTheme(profile);

  // 2. Re-apply on storage changes (popup updates, cross-tab sync)
  storage.onChange((updated) => applyTheme(updated));

  // 3. MutationObserver — enforce zenOS supremacy on hostile DOMs
  const observer = new MutationObserver(() => {
    const styleGone = !document.getElementById(STYLE_ID);
    const attrGone  = !document.documentElement.hasAttribute('data-zenos-sensory');

    if (styleGone || attrGone) {
      // Re-fetch current profile in case it changed since init
      storage.getProfile().then(applyTheme);
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'data-zenos-sensory'],
  });
}

init();
