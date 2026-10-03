# Development setup

## Requirements

- Node.js **22.12+** (CI uses 24; 20.19+ also works) and npm
- Chrome/Chromium (for `npm run smoke`), optionally Firefox 140+

## Commands

| Command | What it does |
|---------|--------------|
| `./scripts/install.sh` | One-shot: `npm ci` → typecheck → tests → build → print load instructions |
| `npm ci` | Install the exact pinned devDependencies |
| `npm run lint` / `npm run typecheck` | `tsc --noEmit` (strict) |
| `npm test` | Vitest unit + integration tests (jsdom, chrome.* mocked in `tests/helpers/setup.ts`) |
| `npm run test:coverage` | Same, with v8 coverage |
| `npm run build` | `dist/chrome/`, `dist/firefox/`, `dist/*.zip` + `.sha256` (manifests validated) |
| `npm run build:chrome` / `build:firefox` | Single target |
| `npm run validate:manifest` | Re-run manifest checks on `dist/` |
| `npm run smoke` | Headless Chrome via CDP: loads `dist/chrome`, checks glitching, popup, options, live updates |
| `npm run package` | `verify` + `build` |

Firefox lint (not a dependency, pinned on use): `npx web-ext@10.7.0 lint --source-dir dist/firefox`.

## Layout

```
manifest.json            source manifest (Chromium flavour); build derives the Firefox one
src/
  content.ts             content script: zenOS theme + glitch engine, one MutationObserver
  background.ts          service worker / event page: install+migration, commands, menus, badge
  popup.ts / popup.html  toolbar popup (filters + zenOS sensory profile)
  options.ts / .html     full settings page, export/import
  glitch-config.ts       GlitchConfig schema, validation, filter parsing, legacy migration
  matcher.ts             literal/regex filter matching (pure)
  glitcher.ts            DOM wrap/restore engine
  effects.ts             effect CSS, scramble, ad selectors
  config-store.ts        chrome.storage.local wrapper (serialized writes)
  storage.ts             chrome.storage.sync ZenProfile wrapper (serialized writes)
  site-profile.schema.ts ZenProfile schema + sanitizer
  theme-registry.ts      OKLCH theme engine
  settings-bundle.ts     export/import format
  messages.ts            typed runtime messages
scripts/
  build.mjs              Vite (IIFE per entry) + static copy + manifest per target + deterministic zip
  validate-manifest.mjs  offline MV3 checks
  smoke.mjs              zero-dependency CDP smoke test
  install.sh             one-command installer
```

## Dev loop

There is no HMR: run `npm run build:chrome`, then hit the reload ↻ button on the extension card in
`chrome://extensions` (and reload the page). Content scripts only run on `http(s)` pages.

Debug logging for failed scans: set `data-gts-debug` on the page's `<html>` element.
