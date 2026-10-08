# Test coverage decision log — glitch-that-shit

## 2026-10-08 — PR #23 (`glitch-rises-1e09`) follow-up

**Feat (merged):** [#23](https://github.com/k-dot-greyz/glitch-that-shit/pull/23) — TypeScript glitch engine, options/popup/background, build/install/smoke/e2e reporting.

**Test PR:** (this branch) → `main`

### Stories implemented (80/20)

| ID | User/dev story | Impact | Files |
| --- | --- | --- | --- |
| GT-PR23-01 | Popup/background/content only honor typed `gts:*` IPC; agentic strings and non-finite counts are ignored | **High** (IPC injection) | `tests/unit/pr23-glitch-rises-ux-security.test.ts` |
| GT-PR23-02 | Per-tab badge shows `999+` and never negative counts | **Med** (UX) | same |
| GT-PR23-03 | Context-menu “glitch selection” cannot append >200 chars to storage | **Med** (storage bomb) | same |
| GT-PR23-04 | Import JSON sanitizes filters; oversize/unknown schema rejected; bare `{filters}` still validated | **High** (import path) | same |
| GT-PR23-05 | Built Chrome manifest passes allow-list; hostile fixture catches extra permissions + inline script | **High** (MV3 blast radius) | same + `scripts/validate-manifest.mjs` |
| GT-PR23-06 | Content script ablates glitching when `configStore.get` throws — page text preserved | **High** (graceful degradation) | same |
| GT-PR23-07 | `gts:status` IPC cannot set tab badges (only `gts:hits` path) | **Med** (IPC separation) | same |
| GT-PR23-08 | User-supplied regex filters compile — ReDoS risk documented; no timing flake in CI | **Med** (CPU denial — follow-up) | same |

### Deferred (document as issues — low ROI / already covered)

| Topic | Reason |
| --- | --- |
| Full `scripts/e2e.mjs` browser run in CI | Covered at unit level by `e2e-report.test.ts`; headless e2e remains manual/`npm run e2e` (Firefox not in CI per CHANGELOG). |
| `scripts/build.mjs` reproducibility | Exercised by CI workflow; duplicate hash tests would be brittle across toolchains. |
| Playwright UI suite | Repo standard is Vitest + jsdom + optional smoke; no Playwright harness in tree yet. |
| Options page file-import DOM wiring | `parseBundle` + `configStore.replace` boundary tested; full `File` UI path mirrors options save tests. |

### Documentation follow-ups (GitHub issues)

1. **docs:** Add CODEOWNERS mapping (`src/`, `scripts/`, `tests/`) for review routing.
2. **test:** Optional Playwright smoke for popup/options after `npm run build` (track in dev-master submodule workflow).
3. **security:** Document expected IPC surface in `docs/architecture/` (messages + storage-only settings).
4. **security:** ReDoS guardrails for user `/regex/` filters (length caps exist; consider rejecting nested quantifiers or execution budget in matcher).
