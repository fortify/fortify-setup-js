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
    sc-client:
      default: ''
      description: 'ScanCentral Client version to install'
    fcli:
      default: 'latest'
      description: 'fcli version to install'
    fod-uploader:
      default: ''
      description: 'FoD Uploader version to install'
    debricked-cli:
      default: ''
      description: 'Debricked CLI version to install'
    export-path:
      default: 'true'
      description: 'Add installed tools to PATH'
---

fortify-setup:
  image: node:20-alpine
  script:
    - |
      # Install @fortify/setup
      npm install -g @fortify/setup
      
      # Build arguments
      ARGS=""
      
      if [ -n "$[[ inputs.sc-client ]]" ]; then
        ARGS="$ARGS --sc-client=$[[ inputs.sc-client ]]"
      fi
      
      if [ -n "$[[ inputs.fcli ]]" ]; then
        ARGS="$ARGS --fcli=$[[ inputs.fcli ]]"
      fi
      
      if [ -n "$[[ inputs.fod-uploader ]]" ]; then
        ARGS="$ARGS --fod-uploader=$[[ inputs.fod-uploader ]]"
      fi
      
      if [ -n "$[[ inputs.debricked-cli ]]" ]; then
        ARGS="$ARGS --debricked-cli=$[[ inputs.debricked-cli ]]"
      fi
      
      if [ "$[[ inputs.export-path ]]" = "true" ]; then
        ARGS="$ARGS --export-path"
      fi
      
      # Run fortify-setup
      fortify-setup run $ARGS
      
      # Generate environment variables
      fortify-setup env >> $CI_ENV
```

## Shell Script Approach

For more complex setups, use a dedicated shell script:

```bash
#!/bin/bash
# scripts/setup.sh

set -e

# Install @fortify/setup globally
npm install -g @fortify/setup

# Configure environment
export FCLI_CACHE_ENABLED=false  # Disable caching in CI

# Run fortify-setup with arguments
fortify-setup run \
  --sc-client="${SC_CLIENT_VERSION:-latest}" \
  --fcli="${FCLI_VERSION:-latest}" \
  --export-path

# Generate and source environment variables
eval "$(fortify-setup env)"

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
    sc-client: 'latest'
    fcli: 'latest'

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
    - fortify-setup run --sc-client=latest --fcli=latest
    - fortify-setup env >> fortify.env
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
    SC_CLIENT_VERSION: 'latest'
    FCLI_VERSION: 'latest'
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
    - fortify-setup run --sc-client=latest
    - eval "$(fortify-setup env)"

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
    - fortify-setup configure --fcli-path=/usr/local/bin/fcli
    
    # Install tools from internal mirror
    - fortify-setup run \
        --sc-client=latest \
        --air-gapped
```

### Caching for Faster Builds

```yaml
fortify-setup:
  image: node:20-alpine
  script:
    - npm install -g @fortify/setup
    - fortify-setup run --sc-client=latest
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
eval "$(fortify-setup env)"

# Or use dotenv artifacts
fortify-setup env >> fortify.env
# Then use in job: needs: [...], dependencies: [...]
```

### Permission denied
```bash
# Install globally with proper permissions
npm install -g @fortify/setup

# Or use npx (no install required)
npx @fortify/setup run --sc-client=latest
```

## Next Steps

1. Customize `template.yml` for your needs
2. Add shell scripts for complex logic
3. Test in GitLab CI pipeline
4. Publish component to GitLab
5. Document for your team
