# GitLab CI Component Example

This example shows how to create a GitLab CI component using the `@fortify/setup` CLI.

## Overview

This example demonstrates:
- Using `@fortify/setup` as a CLI tool in shell scripts
- Integration with GitLab CI components framework
- Environment variable configuration
- Simple shell-based approach

## File Structure

```
gitlab-component/
├── README.md           # This file
├── template.yml        # GitLab component template
└── scripts/
    └── setup.sh        # Setup script
```

## Component Template

GitLab components use a `template.yml` file to define the component:

```yaml
spec:
  inputs:
    tools:
      default: 'fcli:auto,sc-client:auto'
      description: 'Comma-separated list of tools with versions (e.g., fcli:auto,sc-client:24.4)'
---

fortify-setup:
  image: node:20-alpine
  script:
    - |
      # Install @fortify/setup
      npm install -g @fortify/setup
      
      # Initialize tools
      fortify-setup env init --tools="$[[ inputs.tools ]]"
      
      # Generate environment variables
      fortify-setup env shell >> $CI_ENV
```

## Shell Script Approach

For more complex setups, use a dedicated shell script:

```bash
#!/bin/bash
# scripts/setup.sh

set -e

# Install @fortify/setup globally
npm install -g @fortify/setup

# Initialize tools with versions
fortify-setup env init --tools="${TOOLS:-fcli:auto,sc-client:auto}"

# Generate and source environment variables
eval "$(fortify-setup env shell)"

# Verify installation
fcli --version
scancentral --version || echo "ScanCentral Client not installed"
```

## Usage in GitLab CI Pipelines

### Using Component (Recommended)

```yaml
include:
  - component: gitlab.com/your-org/fortify-setup@v1

stages:
  - setup
  - scan

setup-fortify:
  stage: setup
  extends: fortify-setup
  inputs:
    tools: 'fcli:auto,sc-client:24.4'

fortify-scan:
  stage: scan
  needs: [setup-fortify]
  script:
    - fcli --version
    - scancentral --version
    # Run your scan commands
```

### Direct Script Usage

```yaml
fortify-setup:
  image: node:20-alpine
  stage: setup
  script:
    - npm install -g @fortify/setup
    - fortify-setup env init --tools=fcli:auto,sc-client:auto
    - fortify-setup env shell >> fortify.env
  artifacts:
    reports:
      dotenv: fortify.env

fortify-scan:
  image: node:20-alpine
  stage: scan
  needs: [fortify-setup]
  script:
    - fcli --version
    - scancentral --version
    # Run your scan commands
```

### Using Shell Script

```yaml
fortify-setup:
  image: node:20-alpine
  stage: setup
  before_script:
    - apk add --no-cache bash
  script:
    - bash ./scripts/setup.sh
  variables:
    TOOLS: 'fcli:auto,sc-client:24.4'
```

## Key Benefits

1. **Simplicity** - No TypeScript compilation required
2. **Flexibility** - Easy to customize with shell scripts
3. **Portability** - Works in any environment with Node.js
4. **Low Overhead** - Direct CLI usage without extra dependencies
5. **Easy Debugging** - Straightforward shell script logic

## Environment Variables

Configure behavior via environment variables:

```yaml
variables:
  # Bootstrap configuration
  FCLI_CACHE_ENABLED: "false"
  FCLI_BASE_URL: "https://custom-mirror.example.com/fcli"
  
  # Tool versions
  SC_CLIENT_VERSION: "latest"
  FCLI_VERSION: "latest"
```

## Advanced Usage

### Multi-Stage Pipeline

```yaml
.fortify-setup:
  image: node:20-alpine
  before_script:
    - npm install -g @fortify/setup
    - fortify-setup env init --tools=fcli:auto,sc-client:auto
    - eval "$(fortify-setup env shell)"

sast-scan:
  extends: .fortify-setup
  stage: scan
  script:
    - fcli sc-sast session login --client-auth-token $SC_TOKEN
    - fcli sc-sast scan start --publish-to SSC
    - fcli sc-sast session logout

dast-scan:
  extends: .fortify-setup
  stage: scan
  script:
    - fcli fod session login --api-key $FOD_API_KEY
    - fcli fod dast scan start
    - fcli fod session logout
```

### Air-Gapped Environment

```yaml
fortify-setup:
  image: node:20-alpine
  script:
    - npm install -g @fortify/setup
    
    # Use pre-installed fcli
    - fortify-setup config --fcli-path=/usr/local/bin/fcli
    
    # Initialize tools
    - fortify-setup env init --tools=fcli:auto,sc-client:auto
```

### Caching for Faster Builds

```yaml
fortify-setup:
  image: node:20-alpine
  script:
    - npm install -g @fortify/setup
    - fortify-setup env init --tools=fcli:auto,sc-client:auto
  cache:
    key: fortify-tools
    paths:
      - .cache/fortify/
```

## Publishing Component

1. Create a GitLab project for your component
2. Add `template.yml` to the root
3. Tag a release: `git tag v1.0.0 && git push --tags`
4. Users can reference: `component: gitlab.com/your-org/fortify-setup@v1`

## Comparison with TypeScript Approach

### Use CLI when:
- ✅ Building GitLab components
- ✅ Writing simple shell scripts
- ✅ No TypeScript tooling available
- ✅ Prefer declarative YAML configuration

### Use TypeScript when:
- ✅ Building GitHub Actions or Azure DevOps tasks
- ✅ Need programmatic control
- ✅ Want type safety and IntelliSense
- ✅ Complex conditional logic required

## Troubleshooting

### fcli not found after setup
```bash
# Make sure to source the environment
eval "$(fortify-setup env shell)"

# Or use dotenv artifacts
fortify-setup env shell >> fortify.env
# Then use in job: needs: [...], dependencies: [...]
```

### Permission denied
```bash
# Install globally with proper permissions
npm install -g @fortify/setup

# Or use npx (no install required)
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

## Next Steps

1. Customize `template.yml` for your needs
2. Add shell scripts for complex logic
3. Test in GitLab CI pipeline
4. Publish component to GitLab
5. Document for your team
