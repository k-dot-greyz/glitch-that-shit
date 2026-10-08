# Config on the block tree

One `GlitchConfig` covers the whole tab. The page does not grow a settings tree. Each hit in the block tree wears that config as attributes, and CSS paints from those attributes.

## Where the config lives

| Store | Key | What |
|---|---|---|
| `chrome.storage.local` | `glitchConfig` | Filters, effect, intensity, whole-word / case, hover, click-to-reveal, ad glitching, paused hostnames, master enable |
| `chrome.storage.sync` | `zenProfile` | zenOS sensory mode, colorblind mode, OKLCH rails, reduce-motion, HDR clamp |

Filter lists can outgrow sync quotas, so they stay in `local`. The sensory profile stays in `sync` so popup and content script share it. Both writes are serialized. Stored profiles are sanitized before they touch CSS or the DOM. A bad filter line is dropped with a readable error. It is not thrown into the content script.

There is no per-block or per-site filter list. Pausing a hostname turns the engine off for that host (subdomains included). Every other page uses the same list.

## What you see in the UI

The popup shows the live knobs (enabled, effect, intensity, quick-add, pause-this-site) and a count: `N filters`. It does not list the entries. **settings ⚙** opens the options page, which is the full config: one filter per line in a textarea, effect and intensity, reveal flags, paused hostnames, export / import JSON.

Export is the dehydrated config. Import validates before anything is stored.

## How a page wears it

`content.ts` loads both stores at `document_start`. One `MutationObserver` keeps the theme and the glitch engine alive as the page parses and as SPAs mutate it.

`Glitcher.scan` walks a subtree with a `TreeWalker`. It skips `script`, `style`, `textarea`, `input`, `select`, contenteditable regions, existing effect spans, and anything marked `data-gts-ignore`. A text match is replaced with a span. An opted-in ad container is tagged, not removed.

Each match span:

| On the node | Meaning |
|---|---|
| `class="gts-fx gts-fx--<effect>"` | Which effect CSS to use |
| `data-gts-effect` | Same effect name, also used when an ad container is tagged |
| `data-gts-intensity` | `subtle` (half), `medium` (1), or `extreme` (2×), via `--gts-k` |
| `data-gts-original` | The real word. Disable and restore read this, not the visible glyphs |
| `title` | Original text, only when hover-reveal is on |
| `data-gts-revealed` | Click-to-reveal is showing the original in place |

Scramble is the one effect that changes the text node. The others keep the characters and hide them with CSS. Turning glitching off unwraps every span back to `data-gts-original` and drops the injected stylesheet.

The zenOS profile is a separate style block, `#zenos-theme-registry`, plus `data-zenos-sensory` on the document. **calm** freezes animation. **glitch** cranks `--gts-k`. **high-contrast** turns every unrevealed match into a solid bar. `prefers-reduced-motion` and `forced-colors` are respected in the effect CSS.

Failed scans do not brick the tab. Set `data-gts-debug` on `<html>` and a failed subtree logs a warning.

## Checking it

```bash
npm test          # jsdom: matcher, glitcher wrap/restore, popup, options
npm run build
npm run smoke     # headless Chrome, pass/fail only
npm run e2e       # same journey, plus an invalid regex that must be dropped
```

`npm run e2e` rewrites `artifacts/e2e/<timestamp>/report.json` after every step and appends `events.jsonl`. You can read the report while the run is still going. A failed gate skips the steps that depend on it and the process still exits non-zero. A missed screenshot is a warning, not a failure.

On a real page, inspect a glitched word. You should see `span.gts-fx` with `data-gts-effect`, `data-gts-intensity`, and `data-gts-original`. The surrounding sentence text is unchanged.
