# Test coverage decision log — glitch-that-shit

## 2026-10-10 — PR #26 (`upload-artifact` 7.0.2)

**Feat (Dependabot):** [#26](https://github.com/k-dot-greyz/glitch-that-shit/pull/26) — bump `actions/upload-artifact` 7.0.1 → 7.0.2 (pinned SHA).

**Test PR:** (linked follow-up) — branch `greyzxcursor/ux-security-test-coverage-ea41` → `dependabot/github_actions/actions/upload-artifact-7.0.2`

### Stories implemented (80/20)

| ID | User/dev story | Impact | Files |
| --- | --- | --- | --- |
| GT-PR26-01 | Dependabot pin lands as full commit SHA + comment `v7.0.2` | **High** (supply chain) | `tests/unit/upload-artifact-pr26-ux-security.test.ts` |
| GT-PR26-02 | Failed CI still uploads e2e artifacts (`if: always()` after `npm run e2e`) | **High** (DX debug) | same |
| GT-PR26-03 | Downloadable bundle includes `artifacts/e2e/`, `dist/*.zip`, `dist/*.sha256` | **Med** (release UX) | same |
| GT-PR26-04 | Empty/missing paths warn — job does not fail when e2e ablates early | **High** (graceful ablation) | same |
| GT-PR26-05 | No floating `@v7` / bare semver action refs | **High** (supply chain) | same |
| GT-PR26-06 | Artifact paths denylist blocks `.env`, `.npmrc`, repo root, `node_modules` | **High** (secret exfil) | same + `tests/helpers/ci-workflow-harness.ts` |
| GT-PR26-07 | Workflow token stays `contents: read` | **Med** (token scope) | same |
| GT-PR26-08 | No curl-pipe / PR-body-in-shell / `write-all` injection patterns | **Med** (workflow takeover) | same |

### Attack surfaces considered

1. **Compromised action ref** — floating tags or shortened SHAs; mitigated by full SHA pin test.
2. **Artifact exfiltration** — broad `path:` globs uploading secrets; mitigated by scoped paths + denylist.
3. **Failed-run blind spots** — removing `if: always()` hides e2e `report.json` on red builds; mitigated by ordering + always guard.

### Deferred (document as follow-up issues)

| Topic | Reason |
| --- | --- |
| Full PR #16 CI/CodeQL contract suite on `main` | Overlaps [#22](https://github.com/k-dot-greyz/glitch-that-shit/pull/22); current `ci.yml` job naming drift vs `BRANCH_PROTECTION.md` needs a docs PR first. |
| `dependency-review` workflow | Not in tree; add contract tests when workflow lands. |
| Playwright GitHub Actions UI | Out of repo scope; Vitest YAML contracts match house rules (`tests/README.md`). |

### Documentation follow-ups (GitHub issues)

1. **docs:** Align `BRANCH_PROTECTION.md` check name with `ci.yml` job `name` (today GitHub shows `verify`, doc lists `Lint, test, and build`).
2. **ci:** Document expected e2e artifact layout in `DEV_SETUP.md` (links to `scripts/e2e.mjs` header).
