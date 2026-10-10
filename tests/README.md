# Tests

```
tests/
├── helpers/
│   ├── setup.ts            # chrome.* mocks (storage.sync/local, runtime, tabs) + matchMedia
│   ├── ci-workflow-harness.ts  # parse .github/workflows for contract tests
│   └── raw.d.ts            # `?raw` import typing (options.html fixture)
└── unit/                   # Vitest + jsdom
    ├── glitch-config.test.ts, matcher.test.ts, effects.test.ts   # pure logic
    ├── glitcher.test.ts                                           # DOM wrap/restore engine
    ├── config-store.test.ts, storage*.test.ts                     # storage edges, write serialization
    ├── settings-bundle.test.ts                                    # export/import validation
    ├── content*.test.ts                                           # content script (theme loop + glitch integration)
    ├── background.test.ts, popup*.test.ts, options.test.ts        # extension surfaces
    ├── build.test.ts                                                  # esbuild IIFE packager
    ├── setup-node-pr25-ux-security.test.ts                          # CI setup-node 7.1 / .nvmrc contract
    └── site-profile.schema.test.ts, theme-registry.test.ts
```

```bash
npm test                 # all unit/integration tests
npm run test:coverage    # with v8 coverage
npx vitest tests/unit/matcher.test.ts   # one file, watch mode
npm run build && npm run smoke          # real headless Chrome against dist/chrome
npm run e2e                              # e2e + ablation; artifacts/e2e/<time>/report.json

What a hit looks like in the page tree: [docs/config-on-the-block-tree.md](../docs/config-on-the-block-tree.md).
```

Storage helpers exposed by the setup file: `globalThis.__storageData` (sync), `__localData` (local),
`__storageListeners`, `__chromeMock`.
