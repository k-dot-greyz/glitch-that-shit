# ZEN-288: Minimal-Dependency Architecture Pivot

> **Status:** Investigation complete — architecture proposal (draft)  
> **Tracking:** [glitch-that-shit#13](https://github.com/k-dot-greyz/glitch-that-shit/issues/13) · [Linear ZEN-288](https://linear.app/zenos/issue/ZEN-288)  
> **Triggered by:** Dependabot PR [#7](https://github.com/k-dot-greyz/glitch-that-shit/pull/7) (vite 5.4.21 → 8.0.10)

---

## 1. Problem statement

A Dependabot PR titled *"in the npm_and_yarn group across 1 directory"* proposed bumping **one** direct dependency (`vite`) but produced a **~1,300-line `package-lock.json` diff** and pulled in a modern bundler stack (Rolldown, esbuild, dozens of transitive packages) that has **zero runtime presence** in the shipped browser extension.

That mismatch — *one declared dep, massive lockfile blast radius* — is the core concern. It is not paranoia; it is a signal that our **build-time dependency surface** has grown far beyond what a privacy-first MV3 extension actually needs.

### What we are trying to solve

| Concern | Why it matters |
|---------|----------------|
| **Dependency sprawl** | 7 direct `devDependencies` → **188 lockfile packages**. Every bump is review noise and supply-chain risk. |
| **Docs ↔ code drift** | `CONTRIBUTING.md` still describes vanilla JS + Jest + ESLint + `web-ext`. Codebase runs Vite 8 + Vitest + TypeScript + `@crxjs/vite-plugin`. |
| **Dual source tree** | Legacy `.js` files (`src/content/content.js`, `src/popup/popup.js`, etc.) coexist with new `.ts` entrypoints. ~1,274 LOC JS vs ~374 LOC TS. Unclear which is canonical. |
| **Build tooling ≠ product** | The extension's runtime is `chrome.*` APIs + DOM + CSS. OKLCH math is ~90 lines. None of that requires a 3-major-version Vite jump. |
| **Dependabot signal-to-noise** | Grouped `npm_and_yarn` bumps surface as urgent security PRs but often only affect dev/build, not the shipped artifact. |

### What we are *not* trying to solve (yet)

- Rewriting the entire extension in Rust today.
- Removing TypeScript from the extension shell (Chrome APIs and DOM are JS runtimes).
- Breaking the OKLCH theme engine or ZenProfile schema that already landed on `main`.

---

## 2. Investigation findings

### 2.1 Dependency inventory (as of `main`, 2026-07-13)

**Direct devDependencies (7):**

| Package | Role | Shipped to users? |
|---------|------|-------------------|
| `vite` | Bundler / dev server | No |
| `@crxjs/vite-plugin` | MV3 manifest + HMR glue | No |
| `typescript` | Type-check only (`noEmit: true`) | No |
| `vitest` + `@vitest/coverage-v8` | Unit tests | No |
| `jsdom` | DOM simulation in tests | No |
| `@types/chrome` | Type definitions | No |

**Transitive footprint:** 188 packages in `package-lock.json` (~2,737 lines).

**Runtime artifact:** Content script, popup, storage wrapper, theme CSS variables — all browser-native. No `node_modules` ships inside the `.crx`.

### 2.2 The Dependabot PR #7 blast radius

PR #7 changed **2 files** (`package.json`, `package-lock.json`) with:

- `vite`: `5.4.21` → `8.0.10` (three major versions)
- Lockfile: **+586 / −696 lines** for a single-version bump
- Under the hood: Rolldown replaces Rollup as Vite 8's bundler, pulling an entirely new subgraph

The PR was **merged** (and superseded on `main` by a later grouped bump to `vite@8.1.4` via PR #11). The concern remains valid: **our supply-chain review surface is decoupled from our actual product risk**.

### 2.3 Source tree split-brain

```
src/
├── content.ts          ← manifest.json points here (canonical)
├── content/content.js  ← legacy, 200+ LOC, not referenced by manifest
├── popup.ts            ← index.html entry (canonical)
├── popup/popup.js      ← legacy duplicate
├── theme-registry.ts   ← OKLCH engine (canonical)
├── storage.ts
├── site-profile.schema.ts
├── background/background.js   ← unused by current manifest
├── options/options.js         ← unused by current manifest
└── shared/utils.js            ← unused by new TS modules
```

**Finding:** ~77% of `src/` LOC is dead legacy JS. The Vite pipeline was added on top without deleting the old tree. This inflates perceived complexity and makes dependency choices feel heavier than they are.

### 2.4 Audit surface (dev-only)

`npm audit` reports vulnerabilities in transitive packages (`form-data`, `ws`, etc.) — all **dev/test tooling**, not extension runtime. Still creates alert fatigue and false urgency.

### 2.5 What actually needs "backend" logic

The computationally interesting code is small and pure:

| Module | LOC | Pure math? | Browser API? |
|--------|-----|------------|--------------|
| `site-profile.schema.ts` | ~54 | Yes (types + defaults) | No |
| `theme-registry.ts` | ~93 | Yes (OKLCH, HDR clamp) | `matchMedia` only |
| `storage.ts` | ~38 | No | `chrome.storage` |
| `content.ts` | ~47 | No | DOM + `MutationObserver` |
| `popup.ts` | ~146 | No | DOM + `chrome.storage` |

**Conclusion:** OKLCH math + schema validation are ideal **Rust/WASM** candidates. Chrome IPC and DOM glue must remain thin JS/TS — that is a platform constraint, not a choice.

---

## 3. Why the "sus reach" feeling is correct

```mermaid
flowchart LR
  subgraph shipped [Shipped to users]
    CS[content.ts]
    POP[popup.ts]
    CSS[CSS variables]
  end

  subgraph devonly [Dev-only — 188 npm packages]
    VITE[Vite 8 + Rolldown]
    CRX[@crxjs/vite-plugin]
    VITEST[Vitest + jsdom]
    TSC[TypeScript]
  end

  DEP[Dependabot bump] --> VITE
  VITE -.->|lockfile churn| AUDIT[npm audit alerts]
  VITE -.->|no path| shipped
```

Dependabot correctly bumps `vite`. But the **review burden** implies we are changing product behavior when we are only changing **how we bundle tests and dev HMR**. That is the reach mismatch.

---

## 4. Proposed architecture: "Rust core, TS shell, zero runtime deps"

### 4.1 Design principles

1. **Runtime zero-deps** — The loaded extension contains no npm packages. Only browser APIs + (optionally) a single `.wasm` blob.
2. **Rust owns pure logic** — OKLCH computation, schema validation, filter matching, JSON (de)hydration.
3. **TS is glue only** — `chrome.storage`, `MutationObserver`, popup DOM wiring. Target **<200 LOC** TS after migration.
4. **Build is explicit** — Rust CLI (`cargo xtask` or standalone `glitch-pack`) assembles the MV3 bundle. No HMR-required dev loop for production path.
5. **Dev ergonomics preserved** — Optional `vite dev` behind a feature flag during transition; not the only path.

### 4.2 Target layer diagram

```
┌─────────────────────────────────────────────────────────┐
│  Browser Extension (shipped artifact)                     │
├─────────────────────────────────────────────────────────┤
│  popup.html + popup.css                                   │
│  content.js        ← thin TS → JS glue (~50 LOC)         │
│  popup.js          ← thin TS → JS glue (~80 LOC)         │
│  zen_core.wasm     ← Rust: OKLCH, schema, validation     │
│  manifest.json                                            │
└─────────────────────────────────────────────────────────┘
         ▲                          ▲
         │ wasm-bindgen             │ hand-written or tsc --outDir
         │                          │
┌────────┴──────────┐    ┌─────────┴──────────┐
│  crates/zen-core  │    │  shell/ (TS glue)  │
│  - oklch.rs       │    │  - storage.ts      │
│  - profile.rs     │    │  - content.ts      │
│  - validate.rs    │    │  - popup.ts        │
└───────────────────┘    └────────────────────┘
         ▲
         │ cargo build --target wasm32-unknown-unknown
         │
┌────────┴──────────────────────────────────────────┐
│  tools/glitch-pack (Rust CLI)                   │
│  - compile wasm                                   │
│  - tsc shell (or skip if plain JS output)        │
│  - copy assets, rewrite manifest paths           │
│  - emit dist/ ready for Load Unpacked / web-ext  │
└──────────────────────────────────────────────────┘
```

### 4.3 Phased migration plan

#### Phase 0 — Hygiene (this PR's scope)

- [x] Document problem statement and architecture (this file)
- [ ] Re-hydrate GitHub issue #13 with structured description
- [ ] Close/reject future Dependabot major bumps until build strategy is decided
- [ ] Add `dependabot.yml` group rules: separate `dev-tooling` from `runtime` (none expected)

#### Phase 1 — Consolidate source tree (low risk)

- Delete unused legacy JS (`src/content/content.js`, `src/popup/popup.js`, `src/options/*`, `src/background/*`, `src/shared/utils.js`) after confirming manifest references
- Update `CONTRIBUTING.md` stack table to match reality (Vite/TS/Vitest today; target state documented)
- Pin `vite` to current working version; disable grouped major bumps

**Exit criteria:** Single canonical source tree, docs match code, tests green.

#### Phase 2 — Extract `zen-core` Rust crate

- Create `crates/zen-core/` with:
  - `ZenProfile` struct + JSON Schema validation
  - OKLCH variable generation (port from `theme-registry.ts`)
  - HDR chroma clamp logic
  - `wasm-bindgen` exports: `generate_theme_css(profile_json) -> string`
- Vitest tests call WASM in Node via `wasm-bindgen-test` or snapshot the Rust unit tests (`cargo test`)

**Exit criteria:** `theme-registry.ts` reduced to a 10-line WASM loader.

#### Phase 3 — Replace Vite with Rust packager

- `tools/glitch-pack` (Rust):
  - Invokes `wasm-pack build`
  - Runs `tsc` with `emit` enabled (or uses `esbuild` as optional single-binary dep inside the Rust tool — **not** in `package.json`)
  - Outputs `dist/` matching MV3 layout
- Remove `vite`, `@crxjs/vite-plugin` from `package.json`
- Dev loop: `cargo run -p glitch-pack -- dev --watch` (uses `notify` crate for rebuild)

**Exit criteria:** `npm install` no longer required for build. `package.json` removed or reduced to optional test harness only.

#### Phase 4 — Optional: eliminate `package.json` entirely

- Move Vitest → `cargo test` + `wasm-bindgen-test` + browser test via `web-ext run` from Rust CLI
- `@types/chrome` → `web_sys` / manual bindings in Rust or JSDoc in glue files
- Repository becomes **Cargo-first**; zero npm lockfile

**Exit criteria:** No `package-lock.json`. Dependabot npm group disabled or removed.

---

## 5. Decision record

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Extension runtime language | Minimal TS/JS glue | Chrome extension APIs are JS-only; fighting this adds cost |
| Pure computation | Rust → WASM | Type-safe, fast, testable without jsdom; matches dev-master Rust-first stack |
| Bundler | Remove Vite (Phase 3) | CRX packaging is copy + manifest rewrite, not a SPA build |
| Test runner | Rust tests primary; keep Vitest during Phase 1–2 | Don't block migration on rewriting 1,400 LOC of tests day one |
| Legacy JS | Delete in Phase 1 | Dead code confuses contributors and inflates review scope |
| Dependabot | Freeze major npm bumps | Until Phase 3 completes; security patches for dev tools are low priority vs. product |

---

## 6. Risk assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WASM load latency in content script | Low | Medium | WASM is <50KB; load once at `document_start` |
| `wasm-bindgen` + MV3 CSP | Medium | High | Use `wasm-unsafe-eval` only in extension pages, not content script; or compile to pure JS via `wasm2js` fallback |
| Migration breaks OKLCH tests | Medium | Medium | Port tests to Rust first; keep TS snapshots during transition |
| Contributor friction (no npm) | Medium | Low | `cargo xtask setup` one-liner; document in DEV_SETUP.md |
| crxjs HMR loss | High | Low | HMR is dev convenience; `web-ext run` reload is acceptable |

---

## 7. Immediate recommendations

1. **Do not merge** further grouped Dependabot major bumps for `vite` / `vitest` until Phase 1 lands.
2. **Approve Phase 1** as the next implementation PR — delete legacy JS, fix docs, pin tooling.
3. **Scope Phase 2** as a separate epic under ZEN-288 with `crates/zen-core` scaffold.
4. **Update issue #13** title to: `ZEN-288: Pivot build toolchain to Rust — eliminate npm dependency sprawl`

---

## 8. Open questions

- [ ] Should `zen-core` WASM run in the **content script** (page context) or only in the **popup** (extension context)? Content script CSP is stricter.
- [ ] Is `wasm2js` fallback required for Firefox MV3 parity?
- [ ] Should dev-master dex submodule docs reference this architecture doc?
- [ ] Keep a minimal `package.json` for OSS contributors who expect `npm test`, or go Cargo-only from Phase 3?

---

## Appendix A: File deletion candidates (Phase 1)

| File | Status | Action |
|------|--------|--------|
| `src/content/content.js` | Not in manifest | Delete |
| `src/content/content.css` | Orphaned? | Audit → delete or merge |
| `src/popup/popup.js` | Not in manifest | Delete |
| `src/popup/popup.html` | Not in manifest | Delete |
| `src/popup/popup.css` | Not in manifest | Delete |
| `src/options/*` | Not in manifest | Delete |
| `src/background/background.js` | Not in manifest | Delete |
| `src/shared/utils.js` | Not imported by TS | Delete |

## Appendix B: Current vs target `package.json`

**Current (7 direct deps, 188 transitive):**

```json
{
  "devDependencies": {
    "@crxjs/vite-plugin": "^2.7.1",
    "@types/chrome": "^0.0.268",
    "@vitest/coverage-v8": "^4.1.10",
    "jsdom": "^24.0.0",
    "typescript": "^5.4.0",
    "vite": "^8.1.4",
    "vitest": "^4.1.10"
  }
}
```

**Target (Phase 4):** No `package.json`. `Cargo.toml` workspace root with `zen-core`, `glitch-pack`, optional `zen-core-wasm`.
