# Testing Guide

This project uses [Vitest](https://vitest.dev/) for automated testing with multiple test layers.

## Running Tests

```bash
# Run unit tests only (fast, default for npm test)
npm test

# Run unit tests in watch mode
npm run test:watch

# Run unit tests with coverage
npm run test:coverage

# Run unit tests only (explicit)
npm run test:unit

# Run integration tests (slower, tests function interaction)
npm run test:integration

# Run end-to-end tests (downloads real fcli, very slow)
npm run test:e2e

# Run ALL tests including E2E
npm run test:all
```

## Test Structure

### Unit Tests (Colocated)
Tests are colocated with source files using the `.test.ts` extension:

- `src/utils.test.ts` - Utility functions (URL validation, CLI argument parsing, error formatting) - 21 tests
- `src/config.test.ts` - Configuration management (loading, saving, environment variables) - 29 tests
- `src/logger.test.ts` - Logger creation and verbosity modes - 8 tests

### Integration Tests (`src/__tests__/`)
Integration tests verify module interactions without full mocking:

- `src/__tests__/bootstrap.integration.test.ts` - Bootstrap utilities and platform detection
- `src/__tests__/actions.integration.test.ts` - Action functions and cache management

### End-to-End Tests (`src/__tests__/e2e.test.ts`)
E2E tests download real fcli and test complete workflows:

- **Skipped by default** via `SKIP_E2E=1` (included in `npm test`)
- Downloads actual fcli from GitHub releases
- Tests signature verification
- Tests cache management
- Tests error scenarios (invalid URLs, bad signatures)
- Run explicitly with `npm run test:e2e`

## Coverage

Unit test coverage:
- ✅ `utils.ts` - 100% coverage
- ✅ `config.ts` - 100% coverage  
- ✅ `logger.ts` - 100% coverage

Integration modules (`bootstrap.ts`, `actions.ts`) are tested via integration/E2E tests rather than mocked unit tests.

## Writing Tests

### Test File Naming

- Test files should be named `*.test.ts`
- Place test files alongside the source files they test

### Test Structure

```typescript
import { describe, it, expect, vi } from 'vitest';
import { myFunction } from './myModule.js';

describe('myFunction', () => {
  it('should do something expected', () => {
    const result = myFunction('input');
    expect(result).toBe('expected output');
  });
});
```

### Mocking

Use Vitest's mocking capabilities for isolating units:

```typescript
import { vi } from 'vitest';

// Mock modules
vi.mock('fs');
vi.mock('os');

// Mock implementations
vi.mocked(os.platform).mockReturnValue('linux');
```

### Best Practices

1. **Test behavior, not implementation** - Focus on what the function does, not how it does it
2. **One assertion per test** - Keep tests focused and easy to understand
3. **Descriptive test names** - Use "should..." format for clarity
4. **Arrange-Act-Assert** - Structure tests with setup, execution, and verification
5. **Mock external dependencies** - Isolate units from file system, network, etc.

## CI/CD Integration

The project uses GitHub Actions with a multi-stage pipeline:

**1. Unit Tests** (ubuntu-latest, ~1min)
```yaml
- run: npm ci
- run: npm run test:unit
- run: npm run test:coverage
```

**2. Build** (ubuntu-latest, ~1min)
```yaml
- run: npm ci
- run: npm run build
```

**3. Integration/E2E Tests** (matrix: Linux/Windows/macOS, ~5-10min per platform)
```yaml
strategy:
  matrix:
    os: [ubuntu-latest, windows-2022, macos-latest]
steps:
  - run: npm ci
  - run: npm run test:integration
  - run: npm run test:e2e  # Actually downloads fcli
```

All tests must pass on all platforms before release.

## Test Statistics

- **Total tests:** ~75+ across all test files
- **Unit tests:** 58 tests (100% coverage for utils/config/logger)
- **Integration tests:** ~10 tests (platform detection, env vars, cache)
- **E2E tests:** 14 tests (real fcli download, bootstrap, actions)
- **Execution time:**
  - Unit: <1 second
  - Integration: ~1-2 seconds
  - E2E: 30-60 seconds (downloads ~10MB fcli binary)

## Future Improvements

Consider adding:
- Performance benchmarks for bootstrap operations
- Snapshot testing for CLI output formatting
- Contract tests for fcli action YAML schema
- Load testing for concurrent bootstrap operations
