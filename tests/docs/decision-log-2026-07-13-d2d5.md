# Test coverage decision log — 2026-07-13 (branch d2d5)

## Context

Automation rotation on `glitch-that-shit` after CI failure on PR #16 (`Analyze (javascript-typescript)`): broken `actions/download-artifact` step with invalid YAML `merge-multiple` empty value. Parallel goal: extend security/UX test coverage for the zenOS TypeScript stack (storage → theme-registry → content/popup).

## Attack surface map

| Surface | Entry | Risk | Current mitigation | Test coverage added |
|---------|-------|------|--------------------|---------------------|
| Sync storage import | `chrome.storage.sync` | Corrupted/hostile `ZenProfile` propagates to DOM | None (gap) | `storage.security.test.ts` |
| Theme DOM write | `applyTheme()` | Unsanitized `sensoryMode` → `data-zenos-sensory` attribute injection | None (gap) | `theme-registry.security.test.ts` |
| Popup render | `renderPopup()` innerHTML | Enum-fixed buttons limit XSS; hostile stored mode skips `active` | Partial (enum labels) | `popup.security.test.ts` |
| Legacy filter config | `utils.validateConfig` | Invalid effect/intensity/filterList on import | `validateConfig` | `utils.security.test.ts` |
| Regex filters | `escapeRegex` | ReDoS / metachar injection in user filters | Escaping | `utils.security.test.ts` |
| CodeQL workflow | `.github/workflows/codeql.yml` | CI blocked, no security scans run | N/A | Removed erroneous artifact step |

## Prioritization (impact vs cost)

| Scenario | Priority | Impact | Cost | Speed |
|----------|----------|--------|------|-------|
| Hostile sync profile pass-through | P0 | High — cross-tab blast radius | Low (unit) | ~50ms |
| `validateConfig` boundary | P0 | High — legacy import path | Low | ~30ms |
| Popup UX happy path (Playwright) | P0 | High — primary user settings flow | Medium (build+preview) | ~15–30s |
| Attribute injection via `applyTheme` | P1 | Medium — documents gap for follow-up | Low | ~20ms |
| CodeQL CI fix | P0 | Unblocks security scanning | Trivial | instant |

## Files added/updated

### Added
- `tests/helpers/security-harness.ts` — constructor-injected hostile payload catalog
- `tests/unit/utils.security.test.ts`
- `tests/unit/storage.security.test.ts`
- `tests/unit/theme-registry.security.test.ts`
- `tests/unit/popup.security.test.ts`
- `tests/e2e/glitch-popup-ux.spec.ts`
- `playwright.config.ts`
- `tests/docs/decision-log-2026-07-13-d2d5.md`

### Updated
- `.github/workflows/codeql.yml` — removed invalid artifact download step (fixes PR #16 CI)
- `package.json` — `test:e2e` script, `@playwright/test` devDependency

## Follow-ups (not in this PR)

1. **Schema validation layer** — `validateZenProfile()` at storage read edge (architecture §3.4). Tests currently document pass-through behavior.
2. **Sanitize `data-zenos-sensory`** — allowlist `SensoryMode` before `setAttribute`.
3. **Background `IMPORT_CONFIG`** — legacy `background.js` accepts unvalidated config; needs harness when migrated to TS.
4. **Vitest CI workflow** — separate job for `npm test` on PRs (only CodeQL exists today).

## Validation

```bash
npm test                    # vitest unit + security suites
npm run test:e2e            # playwright (requires chromium install)
```

Playwright may fail in restricted cloud VMs without browser binaries (`npx playwright install chromium`).

## User story (Playwright P0)

> As a sensory-sensitive user, I open the extension popup, switch sensory mode, adjust OKLCH sliders, toggle accessibility flags, and reset — without errors.

Covered in `tests/e2e/glitch-popup-ux.spec.ts`.
