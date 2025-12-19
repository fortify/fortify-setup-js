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
import { runFortifyEnv } from '@fortify/setup';
import * as core from '@actions/core';
```

### 2. Get Action Inputs
```typescript
const tools = core.getInput('tools') || 'fcli:auto,sc-client:auto';
```

### 3. Initialize Tools
```typescript
await runFortifyEnv({
  args: ['init', `--tools=${tools}`],
  verbose: true
});
```

### 4. Generate Environment Variables
```typescript
const envResult = await runFortifyEnv({
  args: ['github']
});

// Output is automatically appended to GITHUB_ENV by fcli
```

## Action Configuration

The `action.yml` file defines the action metadata:

```yaml
name: 'Fortify Setup'
description: 'Initialize Fortify tools using @fortify/setup'
inputs:
  tools:
    description: 'Comma-separated list of tools with versions (e.g., fcli:auto,sc-client:24.4)'
    required: false
    default: 'fcli:auto,sc-client:auto'
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
          tools: 'fcli:auto,sc-client:24.4'
      
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

### Custom Tool Initialization
```typescript
await runFortifyEnv({
  args: ['init', '--tools=fcli:3.6.1,sc-client:24.4.0'],
  verbose: true
});
```

### Error Handling
```typescript
try {
  const result = await runFortifyEnv({
    args: ['init', '--tools=fcli:auto,sc-client:latest']
  });
  
  if (result.exitCode !== 0) {
    core.setFailed(`Tool initialization failed with exit code ${result.exitCode}`);
  }
} catch (error) {
  core.setFailed(error.message);
}
```

### Complete Workflow
```typescript
// Initialize tools
await runFortifyEnv({
  args: ['init', '--tools=fcli:auto,sc-client:latest']
});

// Generate environment variables
const envResult = await runFortifyEnv({
  args: ['github']
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
