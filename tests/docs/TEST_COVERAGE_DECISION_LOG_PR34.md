# Test coverage decision log — PR #34 (`release/rc1-2`)

**Feat PR:** [#34](https://github.com/k-dot-greyz/glitch-that-shit/pull/34) — 0.3.0-rc.1 TypeScript/MV3 engine rebase  
**Test PR:** (this branch → `release/rc1-2`)

## 80/20 scope

Existing suite already covers pure modules (`glitch-config`, `matcher`, `glitcher`, `config-store`, surfaces). This pass targets **trust boundaries** added or tightened in rc1 without duplicating snapshot/cosmetic tests.

| ID | Story (Vitest) | Happy / Sad | Impact | Security vector |
|----|----------------|-------------|--------|-----------------|
| GTS-PR34-MSG-1 | `messages.test.ts` — `isMessage` accepts `gts:hits` / `gts:status` | Happy | **M** | — |
| GTS-PR34-MSG-2 | Rejects malformed IPC (missing count, NaN, wrong `type`, injection-ish extras) | Sad | **H** | Fake runtime messages from compromised content scripts or agentic “sendMessage” payloads |
| GTS-PR34-MFT-1 | `validate-manifest.test.ts` — allow-list permissions, no `host_permissions` | Sad | **H** | Permission creep / broad host access in shipped MV3 bundle |
| GTS-PR34-MFT-2 | Inline & remote `<script>` in extension pages fail validation | Sad | **H** | XSS in popup/options → extension origin |
| GTS-PR34-BND-1 | Future `schema`, typosquat `app`, `__proto__` on import | Sad | **H** | Malicious settings JSON / confused-deputy import |
| GTS-PR34-BG-1 | Context menu selection truncated to 200 chars | Sad | **M** | Selection stuffing → storage quota / filter cap bypass attempts |
| GTS-PR34-MCH-1 | Matcher caps `exec` loop at 10k matches per pattern | Sad | **M** | Runaway match loops on hostile page text |
| GTS-PR34-OPT-1 | Options file import hydrates sanitized config | Happy+Sad | **H** | Import file as primary UX path for settings (§3.5) |

## Deferred (low leverage / already covered)

- Full `smoke.mjs` / Playwright in CI (manual `npm run smoke` documented; headless in CI).
- Per-effect pixel tests (cosmetic).
- Re-testing `migrateLegacy` beyond `config-store` / `glitch-config` (already covered).
- Catastrophic backtracking ReDoS (engine-level; rely on `parseFilterEntry` + match cap, no slow-path unit test).

## Documentation follow-up

- [ ] Issue: document `isMessage` contract in `docs/architecture/` (typed IPC table).
- [ ] Issue: add `validate-manifest` failures to CONTRIBUTING §4 troubleshooting.
