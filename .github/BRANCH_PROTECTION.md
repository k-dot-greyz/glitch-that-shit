# Branch protection for `main`

Apply these settings in **Settings → Branches → Branch protection rules** (or **Rulesets**) for `main`.

## Required status checks

Enable **Require status checks to pass before merging** and require:

| Check name | Workflow | Purpose |
|------------|----------|---------|
| `Lint, test, and build` | [ci.yml](workflows/ci.yml) | Typecheck, Vitest, Vite build |
| `Analyze (javascript-typescript)` | [codeql.yml](workflows/codeql.yml) | JS/TS security analysis |
| `Analyze (actions)` | [codeql.yml](workflows/codeql.yml) | GitHub Actions workflow security |

> Status check names must match the job `name` field in each workflow. After the first successful run on a PR, GitHub lists the exact names in the branch protection UI.

## Recommended rule set

- **Require a pull request before merging** — at least 1 approval for external contributors; optional for solo maintainers.
- **Require branches to be up to date before merging** — avoids merging stale green PRs.
- **Require conversation resolution** — keeps review threads from lingering.
- **Do not allow bypassing the above settings** — including for admins, unless you have a documented hotfix process.
- **Restrict force pushes and deletions** on `main`.

## Optional hardening

- **Require signed commits** if your team uses GPG or SSH commit signing.
- **Code scanning alerts** — in **Settings → Code security**, enable default setup and treat **Critical** and **High** CodeQL findings as merge blockers.
- **Dependabot security updates** — already enabled via `.github/dependabot.yml` when present; pair with required `dependency-review` on PRs if you add that workflow later.

## PR checklist (contributors)

Before requesting review:

```bash
npm ci
npm run lint
npm test
npm run build
```

Manual smoke test is still required for UI/DOM changes — see [CONTRIBUTING.md](../CONTRIBUTING.md).
