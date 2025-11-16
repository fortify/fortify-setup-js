# @fortify/setup Integration Examples

This directory contains examples showing how to use the `@fortify/setup` npm module to create reusable integrations for different CI/CD platforms.

## Overview

The `@fortify/setup` package can be used in two ways:

1. **TypeScript Library** - For TypeScript-based integrations (GitHub Actions, Azure DevOps)
   - Import and call functions programmatically
   - Full control over bootstrap and action execution
   - Type-safe API with IntelliSense support

2. **CLI** - For shell-based integrations (GitLab CI, custom scripts)
   - Use `npx @fortify/setup` commands
   - Simple command-line interface
   - Works in any environment with Node.js

## Examples

### [GitHub Action](./github-action/)
TypeScript-based GitHub Action that wraps `@fortify/setup` to provide a native GitHub Actions experience with proper inputs, outputs, and error handling.

**Key Features:**
- Uses TypeScript library API (`runFortifySetup`, `runFortifyEnv`)
- Leverages `@actions/core` for inputs/outputs
- Integrates with GitHub Actions toolkit
- Example: [fortify/github-action](https://github.com/fortify/github-action)

### [Azure DevOps Task](./azure-devops-task/)
TypeScript-based Azure DevOps task that uses `@fortify/setup` to create a pipeline task for installing Fortify tools.

**Key Features:**
- Uses TypeScript library API
- Leverages `azure-pipelines-task-lib` for task inputs
- Integrates with Azure DevOps task framework
- Proper error handling and logging

### [GitLab Component](./gitlab-component/)
Shell-based GitLab CI component that uses `@fortify/setup` CLI for setting up Fortify tools.

**Key Features:**
- Uses CLI (`npx @fortify/setup`)
- Simple shell script wrapper
- Works with GitLab CI components framework
- Environment variable configuration

## When to Use Each Approach

### Use TypeScript Library API when:
- Building platform-specific integrations (GitHub Actions, Azure DevOps tasks)
- Need programmatic control over bootstrap and execution
- Want type safety and IntelliSense support
- Building complex workflows with conditional logic
- Need to integrate with platform-specific SDKs

### Use CLI when:
- Writing shell scripts or simple wrappers
- Working in environments without TypeScript tooling
- Need quick one-off integrations
- Building GitLab components or other shell-based CI tools
- Prefer declarative configuration over code

## Common Patterns

### TypeScript Library Pattern
```typescript
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';

// Install tools
await runFortifySetup({
  args: ['--sc-client-version=latest'],
  cacheEnabled: false,
  verbose: true
});

// Get environment variables
const result = await runFortifyEnv();
console.log(result.output);
```

### CLI Pattern
```bash
#!/bin/bash

# Install tools
npx @fortify/setup run --sc-client-version=latest

# Get environment variables
eval $(npx @fortify/setup env)

# Use installed tools
fcli --version
```

## Getting Started

Each example directory contains:
- `README.md` - Detailed setup and usage instructions
- Source code - Complete implementation
- `package.json` - Dependencies and build scripts (TypeScript examples)
- Configuration files - Platform-specific configuration

Choose the example that matches your target platform and follow the instructions in its README.

## Additional Resources

- [NPM Package Documentation](https://www.npmjs.com/package/@fortify/setup)
- [GitHub Repository](https://github.com/fortify/fortify-setup-js)
- [API Documentation](https://fortify.github.io/fortify-setup-js)
- [fcli Documentation](https://github.com/fortify/fcli)
