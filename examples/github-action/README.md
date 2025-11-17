# GitHub Action Example

This example shows how to create a GitHub Action using the `@fortify/setup` TypeScript library.

## Overview

This example demonstrates:
- Using `@fortify/setup` as a TypeScript library
- Integration with `@actions/core` for inputs/outputs
- Proper error handling for GitHub Actions
- Type-safe API usage

## File Structure

```
github-action/
├── README.md           # This file
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
├── action.yml          # Action metadata
└── src/
    └── index.ts        # Main action code
```

## Installation

```bash
npm install @fortify/setup @actions/core @actions/exec
npm install --save-dev typescript @types/node
```

## Implementation

See `src/index.ts` for the complete implementation. Key points:

### 1. Import the Library
```typescript
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';
import * as core from '@actions/core';
```

### 2. Get Action Inputs
```typescript
const scClientVersion = core.getInput('sc-client');
const fcliVersion = core.getInput('fcli');
const exportPath = core.getBooleanInput('export-path');
```

### 3. Run fortify-setup
```typescript
await runFortifySetup({
  args: [
    scClientVersion && `--sc-client=${scClientVersion}`,
    fcliVersion && `--fcli=${fcliVersion}`,
    exportPath && '--export-path'
  ].filter(Boolean),
  verbose: true
});
```

### 4. Generate Environment Variables
```typescript
const envResult = await runFortifyEnv({
  args: ['--format=github']
});

// Output is automatically added to GITHUB_ENV by fcli
```

## Action Configuration

The `action.yml` file defines the action metadata:

```yaml
name: 'Fortify Setup'
description: 'Install Fortify tools using @fortify/setup'
inputs:
  sc-client:
    description: 'ScanCentral Client version'
    required: false
  fcli:
    description: 'fcli version'
    required: false
    default: 'latest'
  export-path:
    description: 'Export tools to PATH'
    required: false
    default: 'true'
runs:
  using: 'node20'
  main: 'dist/index.js'
```

## Building

```bash
# Build TypeScript
npm run build

# Test locally (requires act or GitHub runner)
npm test
```

## Usage in Workflows

Once published, users can use your action:

```yaml
name: Fortify Scan
on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Fortify
        uses: your-org/fortify-setup-action@v1
        with:
          sc-client: 'latest'
          fcli: 'latest'
          export-path: true
      
      - name: Run scan
        run: |
          fcli --version
          scancentral --version
```

## Key Benefits

1. **Type Safety** - TypeScript provides compile-time type checking
2. **IntelliSense** - IDE autocomplete for all API functions
3. **Error Handling** - Proper error messages through `@actions/core`
4. **Integration** - Seamless integration with GitHub Actions toolkit
5. **Maintainability** - Easy to extend and maintain

## Real-World Example

See the official Fortify GitHub Action for a production-ready implementation:
- Repository: https://github.com/fortify/github-action
- Marketplace: https://github.com/marketplace/actions/fortify-setup

## Advanced Usage

### Custom Bootstrap Options
```typescript
await runFortifySetup({
  args: ['--sc-client=latest'],
  cacheEnabled: false,  // Disable caching in CI
  baseUrl: 'https://custom-mirror.example.com/fcli/releases',
  verifySignature: true
});
```

### Error Handling
```typescript
try {
  const result = await runFortifySetup({
    args: ['--sc-client=latest']
  });
  
  if (result.exitCode !== 0) {
    core.setFailed(`fortify-setup failed with exit code ${result.exitCode}`);
  }
} catch (error) {
  core.setFailed(error.message);
}
```

### Multiple Actions
```typescript
// Install tools
await runFortifySetup({
  args: ['--sc-client=latest']
});

// Get environment variables
const envResult = await runFortifyEnv({
  args: ['--format=github']
});

// Access bootstrap information
console.log(`Using fcli ${envResult.bootstrap.version}`);
console.log(`Source: ${envResult.bootstrap.source}`);
```

## Next Steps

1. Customize `action.yml` with your branding
2. Add additional inputs as needed
3. Implement custom logic in `src/index.ts`
4. Build and test thoroughly
5. Publish to GitHub Marketplace
