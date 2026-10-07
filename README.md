# glitch-that-shit

A browser extension that glitches out unwanted words, phrases, or ads with custom visual effects. 100% user-configurable, privacy-first, zenOS-inspired.

## 🌟 Features

- **Word & phrase filtering** — plain words/phrases (Unicode-aware whole-word matching) or `/regex/i` entries, validated as you type
- **7 visual effects** — glitch (RGB split), pixelate, blur, scramble, rainbow, sparkle, redact — at subtle / medium / extreme intensity
- **Reveal on demand** — hover shows the original (tooltip), click reveals it in place
- **Ad glitching (opt-in)** — well-known ad containers get visually censored, nothing is removed
- **Live on SPAs** — a single MutationObserver glitches content as it streams in; settings changes apply to open tabs instantly
- **Per-site pause** — from the popup or right-click menu; subdomains included
- **zenOS a11y engine** — OKLCH theme rails, sensory modes (calm / glitch / high-contrast), colorblind hue rotation, HDR chroma clamp, reduced-motion respected
- **Export / import** settings as JSON (validated before anything is stored)
- **Privacy-first** — no network requests, no analytics, permissions limited to `storage`, `contextMenus`, `activeTab` (+ the content script on http/https pages)
- **Cross-browser** — Chrome, Edge, Brave and other Chromium browsers; Firefox 140+

## 🚀 Installation

> Store listings are not live yet. Install from a release zip or build from source.

### Option A — release zip (no toolchain needed)

1. Download `glitch-that-shit-<version>-chrome.zip` (or `-firefox.zip`) from [Releases](https://github.com/k-dot-greyz/glitch-that-shit/releases) and unzip it.
2. **Chrome / Edge / Brave:** open `chrome://extensions` (`edge://extensions`), enable **Developer mode**, click **Load unpacked**, select the unzipped folder.
3. **Firefox 140+:** open `about:debugging#/runtime/this-firefox`, click **Load Temporary Add-on…**, select `manifest.json` inside the unzipped folder (temporary until restart — permanent installs need AMO signing).

Verify the download: `sha256sum -c glitch-that-shit-<version>-chrome.zip.sha256`.

### Option B — one-command build from source

Requires Node.js 22.12+ (or 20.19+) and git:

```bash
git clone --branch v0.3.0-rc.1 https://github.com/k-dot-greyz/glitch-that-shit.git && cd glitch-that-shit && ./scripts/install.sh
```

`scripts/install.sh` installs the exact pinned dev dependencies from `package-lock.json` (`npm ci`), runs typecheck + tests, builds `dist/chrome/`, `dist/firefox/` and matching zips, and prints the load-unpacked steps. Options: `--target chrome|firefox`, `--skip-tests`.
Without bash (e.g. Windows PowerShell): `npm ci && npm run package`.

Builds are reproducible: the same commit produces byte-identical zips (see the `.sha256` files).

## 📖 Usage

1. Click the ⚡ toolbar icon.
2. Toggle **Glitching enabled**, pick an effect and intensity.
3. Type a word, phrase or `/regex/i` and hit **+ glitch** — open tabs update immediately.
4. Untick **Active on <site>** to pause on the current site.
5. **settings ⚙** opens the full options page: bulk filter editing, whole-word / case options, hover & click-to-reveal, ad glitching, paused sites, export / import / reset.

The popup shows a filter count. The options page is the list. On the page itself, each hit is a `span.gts-fx` that wears the current effect and intensity as attributes. One config covers the tab. See [Config on the block tree](docs/config-on-the-block-tree.md).

Right-click selected text → **Glitch "…" everywhere** adds it as a filter.

### Keyboard shortcuts

| Shortcut | Action |
|----------|--------|
| Ctrl+Shift+G | Toggle glitching on/off |
| Ctrl+Shift+E | Cycle effect |
| Ctrl+Shift+F | Quick filter (opens popup) |
| Ctrl+Shift+S | Open settings |

Change them at `chrome://extensions/shortcuts` (Firefox: *Manage Extension Shortcuts* in `about:addons`). The browser may skip a suggested shortcut that collides with one it already uses.

### zenOS sensory profile

The lower half of the popup drives the OKLCH theme engine used by the effects: **calm** (default) freezes all animation, **glitch** cranks effect intensity, **high-contrast** turns every match into a solid bar. *Reduce motion* is on by default — untick it for animated glitches.

## 🛡️ Privacy & Security

- **No Data Collection**: glitch-that-shit does not collect, store, or transmit any personal data
- **Local Processing**: All filtering and effects are applied locally on your device
- **Open Source**: Full source code available for security review
- **Minimal Permissions**: `storage`, `contextMenus`, `activeTab` only

## 🤝 Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md) and [DEV_SETUP.md](DEV_SETUP.md).

```bash
npm ci
npm run lint       # tsc --noEmit
npm test           # vitest (jsdom)
npm run build      # dist/chrome, dist/firefox, zips (+ manifest validation)
npm run smoke      # headless Chrome: loads dist/chrome and checks a real page
npm run e2e        # same journey + hostile-filter ablation; report.json minted as it runs
```

Conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `chore:` …).

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

Copyright (c) 2025 k-dot-greyz (Kaspars Greizis)

## 🐛 Bug Reports & Feature Requests

Please use the [GitHub Issues](../../issues) page to:

- Report bugs
- Request new features
- Ask questions
- Share feedback

## 🎯 Roadmap

- [ ] Chrome Web Store / AMO listings (signed builds)
- [ ] Scheduled (time-based) filtering
- [ ] Per-site filter lists and custom CSS effects
- [ ] Rust/WASM `zen-core` (see [ZEN-288](docs/architecture/ZEN-288-minimal-deps-pivot.md))
- [ ] Community filter list sharing

## 💫 Inspired by zenOS Philosophy

glitch-that-shit embraces the zenOS principles of:

- **Mindful Technology**: Thoughtful interaction with digital content
- **User Agency**: You control your browsing experience
- **Digital Minimalism**: Focus on what matters, filter out noise
- **Privacy Respect**: Your data stays yours
- **Calm Computing**: Peaceful, distraction-free browsing

Transform your browsing experience with glitch-that-shit - where you control the narrative. ✨
