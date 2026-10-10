# Test coverage decision log

## PR #25 — actions/setup-node 7.1.0 + `.nvmrc` (2026-10-10)

**Feat PR:** [#25](https://github.com/k-dot-greyz/glitch-that-shit/pull/25) — `chore(deps): bump actions/setup-node from 7.0.0 to 7.1.0`

**Test PR:** linked follow-up — branch `greyzxcursor/ux-security-test-coverage-1bfb` → `dependabot/github_actions/actions/setup-node-7.1.0`

### 80/20 scope

| Story ID | Impact | Implemented | Rationale |
|----------|--------|-------------|-----------|
| GT-PR25-01 | High (sec/DX) | Yes | Full SHA pin on setup-node v7.1.0; blocks floating tag supply-chain drift. |
| GT-PR25-02 | High (DX) | Yes | `node-version-file: .nvmrc` keeps CI aligned with local `nvm use` / CONTRIBUTING Node 24. |
| GT-PR25-03 | Medium (DX) | Yes | `cache: npm` must survive the bump (install time / contributor feedback). |
| GT-PR25-04 | Medium (DX) | Yes | `.nvmrc` must remain compatible with `package.json` `engines.node`. |
| GT-PR25-05 | High (DX) | Yes | Lint → test → build order unchanged after workflow edit. |
| GT-PR25-06 | High (sec) | Yes | v7.1 absolute `node-version-file` / `mise.toml` abuse paths denied in CI contract. |
| GT-PR25-07 | High (sec) | Yes | Least-privilege `permissions` on CI job token. |
| GT-PR25-08 | High (sec) | Yes | NODE_AUTH_TOKEN leak patterns + avoid private `registry-url` until needed. |
| GT-PR25-09 | High (sec) | Yes | Agentic PR-body / curl-pipe injection regression guard. |
| GT-PR25-10 | Medium (ops) | Yes | Concurrency cancel prevents stale green merges under load. |

### Deferred (open as follow-up issues)

- **Branch protection name drift** — `BRANCH_PROTECTION.md` documents `Lint, test, and build` but `ci.yml` job id is `verify` without a matching `jobs.verify.name`. Align doc or job display name in a small DX PR.
- **CodeQL action pins** — `codeql.yml` still uses `@v4` floating refs; extend harness when CodeQL pin PR lands (see test PR #22 scope).
- **Playwright CI smoke** — workflow contract stays Vitest-only; extension UX remains `npm run smoke` / `e2e` in CI steps.

### Attack surfaces considered

1. **Supply chain** — unpinned `actions/setup-node@v7.1.0` or `@main` action refs.
2. **node-version-file abuse** — absolute paths or `../` chains reading attacker-controlled version files (new in setup-node 7.1).
3. **Secret exfiltration** — `registry-url` + logging `NODE_AUTH_TOKEN` (documented behavior change in setup-node v7).
4. **Agentic workflow injection** — PR title/body echoed into `run:` steps.
