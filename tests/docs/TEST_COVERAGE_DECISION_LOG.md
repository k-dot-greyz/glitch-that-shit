# Test coverage decision log

## PR #21 — esbuild packager + ZEN-288 pins (merged)

**Feat:** https://github.com/k-dot-greyz/glitch-that-shit/pull/21  
**Test PR:** (this branch)  
**Stories:** `GT-PR21-*` in `tests/unit/pr21-zen288-esbuild-ux-security.test.ts`

| Story | Impact | Rationale |
|-------|--------|-----------|
| GT-PR21-01 | **High** | Wrong packager = wrong shipped artifact shape (ESM chunks vs IIFE). |
| GT-PR21-02 | **Medium** | Node/CI drift breaks `npm ci` for contributors on LTS floors. |
| GT-PR21-03 | **Medium** | Dependabot noise / accidental esbuild major = supply-chain review miss. |
| GT-PR21-04–05 | **High** | MV3 requires per-entry IIFE; denylist catches dev-tool leakage into `dist/`. |
| GT-PR21-06–07 | **High (security)** | `--target` path traversal wrote outside `dist/`; fixed via allowlist + tests. |
| GT-PR21-08 | **Medium** | Version skew between manifest and package breaks store review trust. |
| GT-PR21-09–10 | **Low–Medium** | Firefox derivation + import-without-CLI guard regression gates. |

### Attack surface (predicted)

| Vector | Test |
|--------|------|
| Malicious/automation-injected `--target` with `../` segments | GT-PR21-06, GT-PR21-07 |
| Toolchain dep smuggled into extension bundle | GT-PR21-05 denylist |
| Typosquat / major bump on esbuild without intentional PR | GT-PR21-03 |

### Documentation follow-ups (issues)

- [ ] ZEN-288 Phase 3b: document supported `--target` values in `DEV_SETUP.md` (allowlist).
- [ ] Optional: lockfile package count budget check in CI (regression vs 188 baseline in architecture doc).

### Out of scope (80/20)

- Full `npm run build` reproducibility (already covered by CI job).
- Vitest/Vite peer resolution graph — dev-only, no shipped blast radius.
