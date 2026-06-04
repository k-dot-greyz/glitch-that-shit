# Contributing to glitch-that-shit 🎨

Thank you for helping build **glitch-that-shit** — a privacy-first, Manifest V3 browser extension that applies configurable visual effects to unwanted words, phrases, and ad-like content instead of silently removing it.

This repository is public OSS and is also linked from [dev-master](https://github.com/k-dot-greyz/dev-master) as submodule **`dex/09-repos/glitch-that-shit`**.

---

## 📂 Repository layout (what belongs here)

| Path | Purpose |
|------|---------|
| [manifest.json](manifest.json) | MV3 extension manifest (permissions, content scripts, commands) |
| [package.json](package.json) | Node tooling: Jest, ESLint, Prettier, `web-ext` scripts |
| [src/content/](src/content/) | Content scripts + page-level CSS (`content.js`, `content.css`) |
| [src/background/](src/background/) | Service worker (`background.js`) |
| [src/popup/](src/popup/) | Toolbar popup UI (HTML/CSS/JS) |
| [src/options/](src/options/) | Full settings page (HTML/CSS/JS) |
| [src/shared/](src/shared/) | Shared utilities (e.g. [utils.js](src/shared/utils.js)) |
| [assets/](assets/) | Extension icons and static assets |
| [scripts/setup.js](scripts/setup.js) | Dev environment bootstrap and validation |
| [tests/](tests/) | Jest tests (see [tests/README.md](tests/README.md) for intended layout) |
| [README.md](README.md) | User-facing overview and quick install |
| [DEV_SETUP.md](DEV_SETUP.md) | Product-facing developer setup guide |
| [DEV_SETUP_CHEAT_SHEET.md](DEV_SETUP_CHEAT_SHEET.md) | Quick command reference for contributors |

**Quick try (requires Node.js ≥16 and a Chromium or Firefox browser):**

```bash
npm run setup && npm install
npm run validate
# Chrome/Edge: chrome://extensions → Developer mode → Load unpacked → repo root
# Firefox: npm run dev:firefox   # or load manifest via about:debugging
```

---

## 🛠️ Stack & runtime

| Layer | Technology |
|-------|------------|
| Extension platform | [Chrome Extensions Manifest V3](https://developer.chrome.com/docs/extensions/mv3/) (Chromium, Edge, Brave) |
| Firefox workflow | [web-ext](https://extensionworkshop.com/documentation/develop/web-ext-command-reference/) (`npm run dev:firefox`, `npm run package:firefox`) |
| Language | Vanilla **JavaScript** (ES2021+), HTML, CSS — no bundler required for local dev |
| Storage / IPC | `chrome.storage`, `chrome.runtime` messaging between content, background, popup, and options |
| Tooling | **Node.js** ≥16, **npm** ≥8 |
| Test runner | **Jest** + **jsdom** (`testEnvironment: jsdom` in `package.json`) |
| Lint / format | **ESLint** (airbnb-base + webextensions env), **Prettier** |
| Git hooks | **Husky** (optional; `npm run precommit` mirrors CI-style checks) |

---

## 🌌 1. The Prime Directive: Pure code here, monorepo guides in dev-master

### ⚠️ The boundary violation rule

**Do not commit dev-master–internal documentation, fork-only notes, or monorepo orchestration guides into this repository.**

* **Why?** This repo is modular public OSS. Files such as `SUBMODULE_MANAGEMENT.md`, agent session notebooks, private fork runbooks, or zenOS superproject SOPs belong in the superproject, not here.
* **Allowed here:** Extension source under `src/`, `manifest.json`, assets, tests, and **product-facing** docs (`README.md`, `DEV_SETUP.md`, `DEV_SETUP_CHEAT_SHEET.md`, `CONTRIBUTING.md`, `LICENSE`).
* **Belongs in dev-master:** Internal guides and monorepo standards → [`dev-master/dex/03-docs/guides/`](https://github.com/k-dot-greyz/dev-master/tree/main/dex/03-docs/guides/) (see [Submodule Contributing Workflow](https://github.com/k-dot-greyz/dev-master/blob/main/dex/03-docs/guides/SUBMODULE_CONTRIBUTING_WORKFLOW.md)).

---

## 🔄 2. The fork-and-PR workflow

### Step 1: Configure remotes

```bash
git remote -v

# If upstream is missing, add the canonical repository
git remote add upstream https://github.com/k-dot-greyz/glitch-that-shit.git
```

### Step 2: Create a clean feature branch

Branch from the latest default branch (`main`). Use conventional prefixes (`feat/`, `fix/`, `docs/`, `chore/`, `refactor/`):

```bash
git fetch upstream
git checkout -b feat/your-feature-name upstream/main
# examples: docs/add-contributing-workflow, feat/oklch-glitch-palette
```

### Step 3: Implement pure code changes

* No `.env`, API keys, or personal filter lists committed.
* No monorepo-only markdown or agent RAM files.
* Minimize `manifest.json` permissions; justify new host or content permissions in the PR.
* Follow the **GlitchWorks Agnostic Architecture Protocol** (Section 3).

### Step 4: Run quality gates (Section 4)

### Step 5: Commit and push

```bash
git commit -m "feat(content): add scramble effect intensity slider"
git push -u origin HEAD
```

### Step 6: Open a pull request

```bash
gh pr create --repo k-dot-greyz/glitch-that-shit --base main \
  --title "feat(content): add scramble effect intensity slider" \
  --body "$(cat <<'EOF'
## Summary
- …

## Test plan
- [ ] `npm run validate`
- [ ] `npm run lint` && `npm run format:check`
- [ ] `npm test`
- [ ] Manual: load unpacked in Chrome + smoke on 2–3 sites
EOF
)"
```

> **Note:** If `origin` already points at `k-dot-greyz/glitch-that-shit`, push your branch to `origin` and open the PR the same way. Add a personal fork as `origin` only when you need to contribute from a non-canonical clone.

---

## 🏛️ 3. GlitchWorks Agnostic Architecture Protocol (`/architecture-base`)

All development in this repository must adhere to the **GlitchWorks Agnostic Architecture Protocol** so content filtering, effects, and settings stay decoupled from any single browser UI or deployment context.

### 3.1. Zero hardcoding (dynamic state configuration)

* **Rule:** No magic strings, fixed effect names, or hardcoded DOM selectors in domain logic without a configuration source.
* **Application:** User filters, effect types, intensity, and site rules live in `chrome.storage` (or injected config at init). Content scripts read settings through a small config facade — not scattered `localStorage` keys or inline literals.

### 3.2. Polymorphism by default (interface-driven contracts)

* **Rule:** Depend on abstractions, not concretions.
* **Application:** Effect rendering, filter matching, and storage access should be swappable (e.g. a `applyEffect(node, effectConfig)` contract and a `matchFilters(text, rules)` helper in `src/shared/`). Tests can substitute mocks without loading the full extension UI.

### 3.3. Open piping (strict inter-process communication)

* **Rule:** Cross-context communication uses typed message payloads, not shared mutable globals.
* **Application:** Background, content, popup, and options pages communicate via `chrome.runtime.sendMessage` / `onMessage` with explicit action names and JSON-serializable payloads. Popup and keyboard commands should trigger the same handlers as programmatic messages.

### 3.4. Boundary validation (the “hostile edge”)

* **Rule:** Never trust page DOM, user-entered regex, or imported JSON until validated.
* **Application:** Validate filter lists, regex patterns, and import bundles at the options/background edge before persisting. Reject malformed patterns with user-visible errors instead of throwing in the content script on every page.

### 3.5. State hydration and dehydration

* **Rule:** Settings and session toggles must export and restore cleanly.
* **Application:** Support export/import of filter + effect configuration as JSON. On load, hydrate `chrome.storage` from a validated snapshot; on disable or uninstall paths, avoid leaving orphaned content-script artifacts (`data-glitched`, injected nodes).

### 3.6. Graceful degradation (predictable failure)

* **Rule:** A broken filter or DOM edge case must not brick the tab.
* **Application:** Wrap DOM mutation and regex application in try/catch; fall back to “no effect” and optional debug logging. If `chrome.storage` is unavailable, default to safe off state rather than partially applied filters.

### 3.7. Agnostic telemetry and observability

* **Rule:** Core logic must not assume a particular logging sink.
* **Application:** Use a thin debug/logger helper gated by a user “debug mode” flag. No analytics SDKs; no network exfiltration of page content. Structured messages go to `console` only when explicitly enabled.

---

## ✅ 4. Local quality gates and verification

Run from the repository root after `npm run setup && npm install`:

| Command | Purpose |
|---------|---------|
| `npm run validate` | Environment and repo layout check (`scripts/setup.js --validate-only`) |
| `npm run lint` | ESLint on `src/**/*.js` |
| `npm run lint:fix` | Auto-fix ESLint issues where possible |
| `npm run format:check` | Prettier check for `src/**/*.{js,css,html}` |
| `npm run format` | Apply Prettier formatting |
| `npm test` | Jest unit/integration tests |
| `npm run test:coverage` | Jest with coverage thresholds (see `package.json`) |
| `npm run precommit` | Lint + format check + tests (pre-push habit) |
| `npm run dev:firefox` | Temporary Firefox add-on via `web-ext` |
| `npm run package:firefox` | Build Firefox artifact under `dist/` |

**Manual extension smoke (required for UI/DOM changes):**

1. Load unpacked at repo root (Chromium) or use `npm run dev:firefox`.
2. Enable the extension, add a test filter word, confirm effect on a simple HTML page and one “real” site.
3. Open options and popup; verify settings persist after reload.
4. Check extension service worker and page consoles for errors.

> **Build scripts:** `package.json` may define `build` / `package:chrome` targets as the packaging story matures. If a script is missing locally, treat `validate` + lint + test + manual load as the source of truth until the build pipeline lands.

---

## 📋 5. Pre-commit submodule audit checklist

1. **Misplaced files** — `git status`. Any new markdown describing **dev-master** workflows, submodule bump SOPs, or agent session notes? Move them to `dev-master/dex/03-docs/guides/` and unstage here.
2. **Diff scope** — `git diff --name-status upstream/main`. Revert unrelated files with `git restore <file>`.
3. **Diff noise** — No drive-by formatting, debug `console.log`, or commented-out experiments in the PR.
4. **Privacy** — No new network permissions or external requests without explicit PR justification.
5. **Manifest** — Permission changes called out in the PR description.

---

## 🛠️ 6. How to clean up history after a boundary leak

```bash
git reset --soft upstream/main
# Move monorepo-only docs out of this repo into dev-master/dex/03-docs/guides/
git restore <unwanted-file>
git commit -m "feat: clean feature commit"
git push origin your-branch-name --force
```

Use force-push only on **your** feature branch, not on shared `main`.

---

## 📝 7. Coding standards

### JavaScript and extension practices

* ES6+ (`const`/`let`, async/await); avoid `var`.
* Keep content scripts lean — they run on every matched page.
* Prefer `chrome.storage.local` / `sync` APIs over ad-hoc `window` globals.
* Comment non-obvious DOM or regex edge cases; avoid narrating obvious code.
* UI changes: include screenshots or GIFs in the PR.

### Conventional commits

* `feat` — new feature
* `fix` — bug fix
* `docs` — documentation
* `style` — formatting only
* `refactor` — behavior-preserving refactor
* `perf` — performance
* `test` — tests
* `chore` — tooling / maintenance

Example: `feat(popup): add effect intensity preset buttons`

### After merge (dev-master consumers)

If you develop inside the monorepo, bump the submodule pointer from the superproject root with [`dex/04-scripts/bump-submodule.sh`](https://github.com/k-dot-greyz/dev-master/blob/main/dex/04-scripts/bump-submodule.sh) after your PR merges — do not land superproject-only docs inside this repo.

---

## 🐛 Issues, security, and conduct

* **Bugs / features:** [GitHub Issues](https://github.com/k-dot-greyz/glitch-that-shit/issues) — include browser + version, steps to reproduce, and console output.
* **Security:** Report vulnerabilities privately; do not open public issues for exploitable details.
* **Conduct:** Be respectful and inclusive; harassment and malicious code are not tolerated.

### Additional resources

* [DEV_SETUP.md](DEV_SETUP.md) — full environment setup
* [DEV_SETUP_CHEAT_SHEET.md](DEV_SETUP_CHEAT_SHEET.md) — command cheat sheet
* [Chrome extension docs (MV3)](https://developer.chrome.com/docs/extensions/mv3/)

---

**Inspired by zenOS principles:** Mindful technology, user agency, privacy-first browsing, and calm computing. 🧘⚡
