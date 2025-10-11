# Tests Directory

This directory contains tests for the glitch-that-shit extension.

## Test Structure

```
tests/
├── unit/              # Unit tests for individual functions
│   ├── utils.test.js
│   └── filters.test.js
├── integration/       # Integration tests for component interaction
│   ├── content.test.js
│   └── background.test.js
└── e2e/              # End-to-end tests for full workflows
    └── filtering.test.js
```

## Running Tests

```bash
# Run all tests
npm test

# Run with watch mode
npm run test:watch

# Run with coverage
npm run test:coverage

# Run specific test file
npm test -- utils.test.js
```

## Writing Tests

### Example Unit Test

```javascript
// tests/unit/utils.test.js
const { escapeRegex, debounce } = require('../../src/shared/utils');

describe('Utils', () => {
  describe('escapeRegex', () => {
    test('should escape special regex characters', () => {
      expect(escapeRegex('test.string')).toBe('test\\.string');
      expect(escapeRegex('test*string')).toBe('test\\*string');
    });
  });

  describe('debounce', () => {
    jest.useFakeTimers();

    test('should debounce function calls', () => {
      const func = jest.fn();
      const debounced = debounce(func, 300);

      debounced();
      debounced();
      debounced();

      expect(func).not.toHaveBeenCalled();

      jest.runAllTimers();

      expect(func).toHaveBeenCalledTimes(1);
    });
  });
});
```

### Example Integration Test

```javascript
// tests/integration/content.test.js
/**
 * @jest-environment jsdom
 */

describe('Content Script', () => {
  beforeEach(() => {
    document.body.innerHTML = '<p>This is a test ad content</p>';
  });

  test('should glitch filtered words', async () => {
    // Setup mock chrome.storage
    global.chrome = {
      storage: {
        local: {
          get: jest.fn((keys, callback) => {
            callback({
              enabled: true,
              filterList: ['ad'],
              effectType: 'glitch',
            });
          }),
        },
      },
      runtime: {
        onMessage: {
          addListener: jest.fn(),
        },
      },
    };

    // Import and initialize content script
    require('../../src/content/content.js');

    // Wait for processing
    await new Promise(resolve => setTimeout(resolve, 100));

    // Check if word was glitched
    const glitched = document.querySelector('[data-glitched]');
    expect(glitched).toBeTruthy();
    expect(glitched.textContent).toBe('ad');
  });
});
```

## Test Coverage Goals

- **Unit Tests**: 80%+ coverage
- **Integration Tests**: Core features covered
- **E2E Tests**: Critical user flows

## Mocking Chrome APIs

```javascript
// Mock chrome.storage
global.chrome = {
  storage: {
    local: {
      get: jest.fn(),
      set: jest.fn(),
    },
  },
  runtime: {
    sendMessage: jest.fn(),
    onMessage: {
      addListener: jest.fn(),
    },
  },
  tabs: {
    query: jest.fn(),
    sendMessage: jest.fn(),
  },
};
```

## CI/CD Integration

Tests should run automatically on:
- Pull requests
- Commits to main
- Pre-commit hooks (via husky)

### GitHub Actions Example

```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
      - run: npm install
      - run: npm test
      - run: npm run test:coverage
```

## Test Utilities

Common test helpers can be placed in:
```
tests/helpers/
├── mockChrome.js    # Chrome API mocks
├── fixtures.js      # Test data
└── setup.js         # Test environment setup
```

## Resources

- [Jest Documentation](https://jestjs.io/)
- [Testing Library](https://testing-library.com/)
- [Chrome Extension Testing Guide](https://developer.chrome.com/docs/extensions/mv3/tut_testing/)

---

**Remember**: Good tests = reliable extension = happy users ✨

