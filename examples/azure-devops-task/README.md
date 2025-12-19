# Azure DevOps Task Example

This example shows how to create an Azure DevOps task using the `@fortify/setup` TypeScript library.

## Overview

This example demonstrates:
- Using `@fortify/setup` as a TypeScript library
- Integration with `azure-pipelines-task-lib` for task inputs
- Proper error handling for Azure DevOps tasks
- Type-safe API usage

## File Structure

```
azure-devops-task/
├── README.md           # This file
├── package.json        # Dependencies
├── tsconfig.json       # TypeScript configuration
├── task.json           # Task metadata
└── src/
    └── index.ts        # Main task code
```

## Installation

```bash
npm install @fortify/setup azure-pipelines-task-lib
npm install --save-dev typescript @types/node
```

## Implementation

See `src/index.ts` for the complete implementation. Key points:

### 1. Import the Library
```typescript
import { runFortifyEnv } from '@fortify/setup';
import * as tl from 'azure-pipelines-task-lib/task';
```

### 2. Get Task Inputs
```typescript
const tools = tl.getInput('tools', false) || 'fcli:auto,sc-client:auto';
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
  args: ['ado']
});

// Output uses Azure DevOps logging commands to set pipeline variables
```

## Task Configuration

The `task.json` file defines the task metadata:

```json
{
  "id": "unique-guid-here",
  "name": "FortifySetup",
  "friendlyName": "Fortify Setup",
  "description": "Install Fortify tools using @fortify/setup",
  "helpMarkDown": "Install Fortify tools for security scanning",
  "category": "Utility",
  "author": "Fortify",
  "version": {
    "Major": 1,
    "Minor": 0,
    "Patch": 0
  },
  "instanceNameFormat": "Initialize Fortify Tools",
  "inputs": [
    {
      "name": "tools",
      "type": "string",
      "label": "Tools to Initialize",
      "defaultValue": "fcli:auto,sc-client:auto",
      "required": false,
      "helpMarkDown": "Comma-separated list of tools with versions (e.g., fcli:auto,sc-client:24.4)"
    }
  ],
  "execution": {
    "Node20": {
      "target": "dist/index.js"
    }
  }
}
```

## Building

```bash
# Build TypeScript
npm run build

# Create task extension (requires tfx-cli)
tfx extension create --manifest-globs vss-extension.json
```

## Usage in Pipelines

Once published, users can use your task:

```yaml
steps:
- task: FortifySetup@1
  displayName: 'Initialize Fortify Tools'
  inputs:
    tools: 'fcli:auto,sc-client:24.4'

- script: |
    fcli --version
    scancentral --version
  displayName: 'Verify installation'
```

## Key Benefits

1. **Type Safety** - TypeScript provides compile-time type checking
2. **IntelliSense** - IDE autocomplete for all API functions
3. **Error Handling** - Proper error messages through task lib
4. **Integration** - Seamless integration with Azure DevOps
5. **Reusability** - Easy to share across projects and teams

## Extension Manifest

Create a `vss-extension.json` for publishing to the marketplace:

```json
{
  "manifestVersion": 1,
  "id": "fortify-setup",
  "name": "Fortify Setup",
  "version": "1.0.0",
  "publisher": "your-publisher",
  "targets": [
    {
      "id": "Microsoft.VisualStudio.Services"
    }
  ],
  "description": "Install Fortify tools for security scanning",
  "categories": ["Azure Pipelines"],
  "icons": {
    "default": "images/icon.png"
  },
  "files": [
    {
      "path": "FortifySetup"
    }
  ],
  "contributions": [
    {
      "id": "fortify-setup-task",
      "type": "ms.vss-distributed-task.task",
      "targets": ["ms.vss-distributed-task.tasks"],
      "properties": {
        "name": "FortifySetup"
      }
    }
  ]
}
```

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
    tl.setResult(tl.TaskResult.Failed, 
      `Tool initialization failed with exit code ${result.exitCode}`);
  }
} catch (error) {
  tl.setResult(tl.TaskResult.Failed, error.message);
}
```

### Setting Pipeline Variables
```typescript
// Set pipeline variables for downstream tasks
tl.setVariable('FCLI_VERSION', envResult.bootstrap.version);
tl.setVariable('FCLI_PATH', envResult.bootstrap.fcliPath);
```

## Publishing

1. Install tfx-cli: `npm install -g tfx-cli`
2. Create publisher: `tfx extension publisher create`
3. Build and package: `npm run build && tfx extension create`
4. Publish: `tfx extension publish --manifest-globs vss-extension.json`

## Next Steps

1. Generate a unique GUID for `task.json`
2. Customize task inputs and outputs
3. Create extension icons and branding
4. Build and test thoroughly
5. Publish to Azure DevOps marketplace
