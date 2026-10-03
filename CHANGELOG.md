# Changelog

All notable changes to this project are documented here. Format: [Keep a Changelog](https://keepachangelog.com/en/1.1.0/); versions follow SemVer (pre-releases as `-rc.N`; the browser manifest carries `version` 0.3.0 + `version_name` 0.3.0-rc.1).

## [0.3.0-rc.1] — 2026-10-04

First release candidate: the word/phrase glitch engine is back, now on the TypeScript + zenOS stack, with a real build and installer.

### Added
- **Glitch engine** (`content.ts`, `glitcher.ts`, `matcher.ts`): wraps filtered words/phrases in effect spans as the page parses (document_start) and as SPAs mutate it; exact restore on disable; skips inputs, editors, scripts and `data-gts-ignore` regions.
- **Filters**: plain words/phrases with Unicode-aware whole-word matching (or substring), `/regex/i|u` entries; validation with readable errors (invalid / empty-matching regexes rejected, 500 × 200-char caps).
- **Effects**: glitch, pixelate, blur, scramble, rainbow, sparkle, redact × subtle/medium/extreme; hover tooltip and click-to-reveal; wired to the zenOS theme (calm = static, glitch = louder, high-contrast = solid bars, reduce-motion respected).
- **Ad glitching** (opt-in): visual censoring of well-known ad containers.
- **Per-site pause** (popup toggle, context menu); global on/off; per-tab hit badge.
- **Background worker**: install/update initialization with v0.1 settings migration, keyboard commands (Ctrl+Shift+G toggle, +E cycle effect, +F quick filter popup, +S settings), context menus.
- **Popup** filter controls (enable, effect, intensity, quick-add, site toggle, hits) above the existing zenOS sensory controls.
- **Options page**: bulk filter editing, matching options, paused sites, export/import JSON (validated, accepts v0.1 exports), reset.
- **Build & install**: `scripts/build.mjs` (Chrome + Firefox targets, deterministic zips + sha256, manifest validation), `scripts/install.sh` one-command installer, `scripts/smoke.mjs` zero-dependency headless Chrome smoke test, CI workflow (typecheck, tests, build, reproducibility, web-ext lint, smoke).
- Firefox 140+ support (derived manifest with gecko id, `background.scripts`, data-collection declaration "none").

### Fixed
- `storage.setProfile` lost updates on rapid input — writes are now serialized (supersedes #17 / #18).
- `storage.onChange` crashed the content script when sync data was cleared (`newValue` undefined).
- Stored/synced profiles are sanitized (enum + numeric rails) before reaching CSS or DOM attributes.
- Theme injection no longer throws when `<head>` doesn't exist yet at `document_start`.

### Changed
- Removed `@crxjs/vite-plugin` and `vite.config.ts`; Vite is used only as a bundler from `scripts/build.mjs` (ZEN-288 direction, −300 lockfile lines). Dev dependencies pinned to exact versions; `npm audit fix` applied (remaining: 1 moderate, dev-only vitest advisory).
- Removed the dead legacy JS tree (`src/content|popup|options|background|shared/*.js`), `scripts/setup.js` and `DEV_SETUP_CHEAT_SHEET.md`; docs updated to the real stack.
- Permissions: dropped `scripting`; added `contextMenus`. Content script limited to `http(s)` pages.
- Popup markup is static and parsed inert; dynamic values are applied via DOM properties (web-ext lint clean).

### Known limitations
- No signed `.crx` / AMO-signed `.xpi` (needs store accounts/keys); Firefox install is temporary via about:debugging.
- Scheduled filtering, per-site filter lists and custom CSS effects (README roadmap) are not implemented.
- Pages whose framework owns the exact text nodes we replace (some React/Vue apps) may re-render the original text; it gets re-glitched on the next mutation.
- Firefox build is lint-verified but not smoke-tested in a real Firefox in CI.

## [0.2.0]
- OKLCH a11y engine, ZenProfile schema, storage wrapper, popup sensory controls, Vite + CRXJS scaffold.
