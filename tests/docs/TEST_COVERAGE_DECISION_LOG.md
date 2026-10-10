# Test coverage decision log

## PR #27 — actions/checkout v4 → v7 (CodeQL) (2026-10-10)

**Feat PR:** [#27](https://github.com/k-dot-greyz/glitch-that-shit/pull/27) — Dependabot `chore(deps): bump actions/checkout from 4 to 7` (CodeQL step only; `ci.yml` already on v7.0.1 SHA pin).

**Test PR:** linked follow-up — branch `greyzxcursor/ux-security-test-coverage-dc65` → `dependabot/github_actions/actions/checkout-7`

### 80/20 scope

| Story ID | Impact | Implemented | Rationale |
|----------|--------|-------------|-----------|
| GT-PR27-01 | High (DX) | Yes | CodeQL must use v7 so security scans run on the same action generation as CI. |
| GT-PR27-02 | High (DX/sec) | Yes | Primary CI stays commit-pinned for reproducible, reviewable supply chain. |
| GT-PR27-03 | Medium (DX) | Yes | Dependabot group coherence — no mixed checkout majors across workflows. |
| GT-PR27-04 | High (sec) | Yes | Sad-path guard: v4/v3 checkout regression after intentional bump. |
| GT-PR27-05 | High (sec) | Yes | `persist-credentials: true` widens PAT exposure if a later step is compromised. |
| GT-PR27-06 | High (sec) | Yes | Least-privilege `contents: read` on CI while checkout runs. |
| GT-PR27-07 | High (sec) | Yes | Agentic PR-body / curl-pipe patterns in workflow YAML. |
| GT-PR27-08 | Medium (sec) | Yes | Ablation: checkout-only change must not drop Actions language from CodeQL matrix. |

### Deferred (follow-up issues)

- **Pin CodeQL checkout to full SHA** — mirror `ci.yml` v7.0.1 pin when Dependabot opens the grouped actions PR; extend GT-PR27-02 parity test.
- **PR #16 contract bundle** — open [#22](https://github.com/k-dot-greyz/glitch-that-shit/pull/22) still carries broader CI/CodeQL/branch-protection stories; merge or rebase after #27 lands to avoid duplicate harness drift.
- **`.github/CODEOWNERS`** — not present; add owners + routing test when file lands.
- **Branch protection job name `Lint, test, and build`** — `ci.yml` job id is `verify` without a display `name:`; align doc or job name in a separate DX PR.

### Attack surfaces considered

1. **Action tag hijack** — floating `@v7` on CodeQL vs SHA pin on CI; mitigated by denylist + pin test on primary gate.
2. **Credential persistence** — malicious workflow adding `persist-credentials: true` after checkout.
3. **Workflow instruction injection** — untrusted PR fields interpolated into `run:` (agentic abuse).
