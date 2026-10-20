# Tests

```
tests/
├── helpers/
│   ├── setup.ts            # chrome.* mocks (storage.sync/local, runtime, tabs) + matchMedia
│   └── raw.d.ts            # `?raw` import typing (options.html fixture)
└── unit/                   # Vitest + jsdom
    ├── glitch-config.test.ts, matcher.test.ts, effects.test.ts   # pure logic
    ├── glitcher.test.ts                                           # DOM wrap/restore engine
    ├── config-store.test.ts, storage*.test.ts                     # storage edges, write serialization
    ├── settings-bundle.test.ts                                    # export/import validation
    ├── content*.test.ts                                           # content script (theme loop + glitch integration)
    ├── background.test.ts, popup*.test.ts, options.test.ts        # extension surfaces
    ├── messages.test.ts                                           # IPC gate (§3.3)
    ├── validate-manifest.test.ts                                  # build permission/CSP checks
    └── site-profile.schema.test.ts, theme-registry.test.ts
```

```bash
npm test                 # all unit/integration tests
npm run test:coverage    # with v8 coverage
npx vitest tests/unit/matcher.test.ts   # one file, watch mode
npm run build && npm run smoke          # real headless Chrome against dist/chrome
```

Storage helpers exposed by the setup file: `globalThis.__storageData` (sync), `__localData` (local),
`__storageListeners`, `__chromeMock`.
