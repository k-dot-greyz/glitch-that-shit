/**
 * Content script — runs at document_start on all URLs.
 *
 * 1. zenOS theme: loads ZenProfile, applies OKLCH theme variables, survives
 *    hostile SPA re-renders (style block + data-zenos-sensory canary).
 * 2. Glitch engine: wraps filtered words/phrases (and optionally ad
 *    containers) in effect spans as the page parses and as SPAs mutate it.
 *
 * One MutationObserver drives both.
 *
 * dex_id: 0x7E:0x34
 * Refs: glitch-that-shit#4
 */

import { storage } from './storage';
import { applyTheme } from './theme-registry';
import { configStore } from './config-store';
import { GlitchConfig, isSiteDisabled } from './glitch-config';
import { compileMatcher } from './matcher';
import { Glitcher } from './glitcher';
import { FX_CLASS } from './effects';
import { isMessage, StatusResponse } from './messages';

const STYLE_ID = 'zenos-theme-registry';

const glitcher = new Glitcher(document);
let config: GlitchConfig | null = null;
let hitTimer: ReturnType<typeof setTimeout> | undefined;

function host(): string {
  try {
    return location.hostname;
  } catch {
    return '';
  }
}

function reportHits(): void {
  clearTimeout(hitTimer);
  hitTimer = setTimeout(() => {
    try {
      chrome.runtime?.sendMessage?.({ type: 'gts:hits', count: glitcher.hitCount })?.catch?.(() => {});
    } catch {
      /* extension reloaded / context invalidated */
    }
  }, 250);
}

/** (Re)build the glitch engine from config: restore page, then rescan. */
function refreshGlitch(next: GlitchConfig | null): void {
  config = next;
  glitcher.restore();
  const on = !!next && next.enabled && !isSiteDisabled(host(), next.disabledSites);
  if (!on || !next) {
    glitcher.configure(null, null);
    reportHits();
    return;
  }
  glitcher.configure(next, compileMatcher(next));
  glitcher.ensureStyles();
  glitcher.scan(document.body ?? document.documentElement);
  reportHits();
}

function onClick(e: MouseEvent): void {
  if (!config?.clickToReveal) return;
  const target = e.target as Element | null;
  const span = target?.closest?.(`.${FX_CLASS}`) as HTMLElement | null;
  if (!span || span.hasAttribute('data-gts-revealed')) return;
  e.preventDefault();
  e.stopPropagation();
  glitcher.toggleReveal(span);
}

async function init(): Promise<void> {
  // 1. Load profile and apply immediately (document_start = before render)
  const profile = await storage.getProfile();
  applyTheme(profile);

  // 2. Re-apply on storage changes (popup updates, cross-tab sync)
  storage.onChange((updated) => applyTheme(updated));

  // 3. Glitch engine
  try {
    refreshGlitch(await configStore.get());
    configStore.onChange((c) => refreshGlitch(c));
  } catch {
    refreshGlitch(null); // graceful degradation: no effects, page untouched
  }
  document.addEventListener('click', onClick, true);
  const rescanWhenParsed = () => {
    if (glitcher.active) {
      glitcher.ensureStyles();
      glitcher.scan(document.body);
      reportHits();
    }
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', rescanWhenParsed, { once: true });

  // 4. MutationObserver — enforce zenOS supremacy on hostile DOMs + glitch new content
  const observer = new MutationObserver((mutations) => {
    const styleGone = !document.getElementById(STYLE_ID);
    const attrGone  = !document.documentElement.hasAttribute('data-zenos-sensory');

    if (styleGone || attrGone) {
      // Re-fetch current profile in case it changed since init
      storage.getProfile().then(applyTheme);
    }

    if (!glitcher.active || !mutations?.length) return;
    let found = 0;
    for (const m of mutations) {
      if (m.type === 'childList') {
        m.addedNodes.forEach((n) => (found += glitcher.scan(n)));
      } else if (m.type === 'characterData') {
        if (m.target.nodeType === Node.TEXT_NODE) found += glitcher.rescanText(m.target as Text);
      }
    }
    if (found) {
      glitcher.ensureStyles();
      reportHits();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true,
    characterData: true,
    attributes: true,
    attributeFilter: ['style', 'class', 'data-zenos-sensory'],
  });

  // 5. Popup status queries
  chrome.runtime?.onMessage?.addListener((msg: unknown, _sender: unknown, sendResponse: (r: StatusResponse) => void) => {
    if (!isMessage(msg) || msg.type !== 'gts:status') return false;
    sendResponse({ hits: glitcher.hitCount, active: glitcher.active, host: host() });
    return false;
  });
}

init();
