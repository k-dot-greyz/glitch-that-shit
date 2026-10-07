# Test coverage decision log

## PR #16 — CI, CodeQL, branch protection (2026-10-07)

**Feat merged:** [#16](https://github.com/k-dot-greyz/glitch-that-shit/pull/16) — `fix(ci): add CI workflow, CodeQL scanning, and branch protection guide`

**Test PR:** (linked follow-up) — branch `greyzxcursor/ux-security-test-coverage-0699`

### 80/20 scope

| Story ID | Impact | Implemented | Rationale |
|----------|--------|-------------|-----------|
| GT-PR16-01 | High (DX) | Yes | Contributors need predictable CI triggers on `main` only. |
| GT-PR16-02 | High (DX) | Yes | Local `npm run lint` / `npm test` / `npm run build` must match CI order. |
| GT-PR16-03 | High (DX) | Yes | Branch protection UI breaks when job `name` ≠ documented checks. |
| GT-PR16-05 | High (sec) | Yes | CI token scope; blocks secret/write escalation via workflow. |
| GT-PR16-06 | High (sec) | Yes | CodeQL SARIF upload needs `security-events: write` only. |
| GT-PR16-07 | Medium (sec) | Yes | Actions language analysis catches malicious workflow edits. |
| GT-PR16-08 | High (sec) | Yes | Regression guard for removed broken `download-artifact` in CodeQL. |
| GT-PR16-09 | High (sec) | Yes | Agentic PR-body injection + curl-pipe patterns in workflows. |
| GT-PR16-10 | Medium (ops) | Yes | Concurrency cancel avoids stale green merges. |
| GT-PR16-11 | Medium (sec) | Yes | Weekly schedule = ongoing exposure detection. |

### Deferred (document as follow-up issues)

- **Playwright e2e** for GitHub branch-protection UI — not automatable in extension repo without API fixtures; manual hPanel step in `BRANCH_PROTECTION.md`.
- **`dependency-review` workflow** — mentioned as optional in branch protection doc; add contract tests when workflow lands.
- **CODEOWNERS file** — repo has no `.github/CODEOWNERS` yet; add owners + review routing test when file exists.
- **CONTRIBUTING.md drift** — still references Jest; align docs in a separate `docs/` PR (no production behavior change in this test PR).

### Attack surfaces considered

1. **Workflow takeover** — unpinned actions, `write-all`, PR body echoed into `run:`.
2. **Broken CodeQL path** — artifact download without upload (fixed in #16); denylist regression test.
3. **False merge confidence** — status check name mismatch between workflows and protection doc.
