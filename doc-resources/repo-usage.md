# {{var:repo-title}} - Usage Instructions

## Quick Start

```bash
# Run with default settings (downloads latest fcli v3.x, installs tools)
npx @fortify/setup run --fcli-version=latest --sc-client-version=latest

# Configure bootstrap once for repeated use
npx @fortify/setup configure --cache-enabled
npx @fortify/setup run --fcli-version=latest
```

## Installation

### Global (Recommended for local development)

```bash
npm install -g @fortify/setup

# Use shorter command
fortify-setup run --fcli-version=latest
```

### npx (No installation required)

```bash
npx @fortify/setup run --fcli-version=latest
```

### As project dependency

```bash
npm install --save-dev @fortify/setup
```

**For CLI usage:**
```json
{
  "scripts": {
    "fortify-setup": "fortify-setup run --fcli-version=latest"
  }
}
```

**For programmatic/library usage:**
```typescript
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';

await runFortifySetup({
  args: ['--sc-client-version=latest']
});
```

## Commands

### `run` - Run fortify-setup action

```bash
npx @fortify/setup run [options]
```

Bootstraps fcli (always latest v3.x) and runs the fortify-setup action. See all options:

```bash
npx @fortify/setup run --help
```

**Common fortify-setup options:**
- `--fcli-version=<version>` - Install fcli: skip|latest|auto|preinstalled|v3.6.0
- `--sc-client-version=<version>` - Install ScanCentral Client
- `--fod-uploader-version=<version>` - Install FoD Uploader
- `--debricked-cli-version=<version>` - Install Debricked CLI
- `--export-path` - Add tool directories to PATH
- `--use-tool-cache` - Use CI/CD platform tool cache
- `--air-gapped` - Air-gapped mode (pre-installed tools only)

### `configure` - Configure bootstrap settings

```bash
npx @fortify/setup configure [options]
```

**Options:**
- `--fcli-base-url=<url>` - Custom fcli download URL (default: GitHub releases)
- `--fcli-path=<path>` - Use pre-installed fcli (skip download)
- `--cache-enabled` - Enable caching (default: true, except in CI)
- `--no-cache-enabled` - Disable caching
- `--cache-dir=<path>` - Custom cache directory
- `--verify-signature` - Verify RSA signatures (default: true)
- `--no-verify-signature` - Skip signature verification

Configuration is saved to `~/.config/fortify/setup/config.json`

### `refresh-cache` - Update cached fcli

```bash
npx @fortify/setup refresh-cache
```

Re-downloads the latest fcli v3.x release to cache.

### `clear-cache` - Clear all cached binaries

```bash
npx @fortify/setup clear-cache
```

## Bootstrap Behavior

`@fortify/setup` always bootstraps the latest fcli v3.x release for consistency and to ensure the fortify-setup action is available.

**fcli resolution order:**

1. **Configured path** - `--fcli-path` or `FCLI_PATH` env var
2. **Environment variables** - `FCLI`, `FCLI_CMD`, or `FCLI_HOME`
3. **PATH** - Checks if `fcli` command is available
4. **CI/CD tool cache** - GitHub Actions, Azure DevOps, GitLab runners
5. **Local cache** - `~/.cache/fortify/fcli` (if caching enabled)
6. **Download** - Latest v3.x from GitHub releases (verifies signature)

## Configuration

### Config File

Configuration is saved to `~/.config/fortify/setup/config.json`:

```json
{
  "baseUrl": "https://github.com/fortify/fcli/releases/download",
  "cacheEnabled": true,
  "verifySignature": true
}
```

### Environment Variables

Environment variables override config file settings:

```bash
# Bootstrap configuration
FCLI_BASE_URL=https://...    # Custom download location
FCLI_PATH=/usr/bin/fcli      # Use pre-installed fcli
FCLI_CACHE_ENABLED=true      # Enable/disable caching
FCLI_CACHE_DIR=/custom       # Custom cache directory
FCLI_VERIFY_SIGNATURE=true   # Verify RSA signatures

# Pre-installed fcli (checked before download)
FCLI=/path/to/fcli           # Direct path to fcli binary
FCLI_CMD=/path/to/fcli       # Alternative
FCLI_HOME=/path/to/fcli/dir  # Directory containing bin/fcli
```

### Caching Behavior

- **Local development**: Caching **enabled** by default (faster repeated use)
- **CI/CD**: Caching **disabled** by default (always get latest v3.x)
- **Auto-detection**: Disables cache when `CI`, `GITHUB_ACTIONS`, `TF_BUILD`, or `GITLAB_CI` env vars present

**Cache location:**
- Linux/Mac: `~/.cache/fortify/fcli`
- Windows: `%LOCALAPPDATA%\fortify\fcli-cache`

## Usage Examples

### GitHub Actions

```yaml
name: Fortify Scan

on: [push]

jobs:
  scan:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Fortify tools
        run: npx @fortify/setup run --fcli-version=latest --sc-client-version=latest
        env:
          FCLI_CACHE_ENABLED: false
      
      - name: Run SAST scan
        run: |
          fcli sc-sast session login --client-auth-token ${{ secrets.CLIENT_AUTH_TOKEN }}
          fcli sc-sast scan start --publish-to SSC --upload --sensor-version 24.4
          fcli sc-sast session logout
```

### Azure DevOps

```yaml
steps:
  - task: Npm@1
    displayName: 'Setup Fortify tools'
    inputs:
      command: 'custom'
      customCommand: 'npx @fortify/setup run --fcli-version=latest --sc-client-version=latest'
    env:
      FCLI_CACHE_ENABLED: false
```

### GitLab CI

```yaml
fortify-scan:
  script:
    - npx @fortify/setup run --fcli-version=latest --sc-client-version=latest
    - fcli ssc session login --url $SSC_URL --token $SSC_TOKEN
    - # ... scan commands
  variables:
    FCLI_CACHE_ENABLED: "false"
```

### Docker Multi-Stage Build

```dockerfile
FROM node:20-alpine AS fortify-setup
RUN npx @fortify/setup run --fcli-version=latest --sc-client-version=latest
ENV PATH="/root/.fortify/tools/fcli/bin:${PATH}"

FROM maven:3.9-eclipse-temurin-17
COPY --from=fortify-setup /root/.fortify/tools /root/.fortify/tools
ENV PATH="/root/.fortify/tools/fcli/bin:${PATH}"

# Run scan
RUN fcli --version
```

### Local Development

```bash
# First time: Configure bootstrap with caching
npx @fortify/setup configure --cache-enabled

# Daily use: Run fortify-setup (uses cached fcli v3.x)
npx @fortify/setup run --fcli-version=latest --sc-client-version=latest

# Update fcli cache to latest v3.x
npx @fortify/setup refresh-cache

# Show fortify-setup action help
npx @fortify/setup run --help
```

### Air-Gapped / Corporate Networks

**Option 1: Use pre-installed fcli**

```bash
# Install fcli v3.x manually, then configure
npx @fortify/setup configure --fcli-path=/usr/local/bin/fcli

# Run fortify-setup with pre-installed fcli
npx @fortify/setup run --fcli-version=latest
```

**Option 2: Custom download location**

```bash
# Configure custom internal mirror (must host fcli v3.x)
npx @fortify/setup configure \
  --fcli-base-url=https://internal-mirror.company.com/fortify/fcli \
  --no-verify-signature

# Run
npx @fortify/setup run --fcli-version=latest
```

**Option 3: CI/CD tool cache**

```bash
# Pre-populate runner tool cache with fcli v3.x
# Example: GitHub Actions runner tool cache structure
# $RUNNER_TOOL_CACHE/fcli/3.6.0/x64/bin/fcli

# @fortify/setup will automatically detect and use it
npx @fortify/setup run --fcli-version=latest
```

## Programmatic API

The `@fortify/setup` package exports a TypeScript API for building custom integrations.

### Basic API Usage

```typescript
import { bootstrapFcli, getEffectiveConfig } from '@fortify/setup';

// Bootstrap fcli (always latest v3.x)
const result = await bootstrapFcli({
  cacheEnabled: true
});

console.log(`Using fcli: ${result.fcliPath}`);
console.log(`Version: ${result.version}`);
console.log(`Source: ${result.source}`); // path|preinstalled|tool-cache|cache|download

// Get current configuration
const config = getEffectiveConfig();
console.log(`Cache enabled: ${config.cacheEnabled}`);
```

### Running Actions Programmatically

```typescript
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';

// Run fortify-setup action
await runFortifySetup({
  args: ['--sc-client-version=latest', '--fcli-version=latest'],
  cacheEnabled: false,
  verbose: true
});

// Get environment variables
const envResult = await runFortifyEnv({
  args: ['--format=github']
});
console.log(envResult.output);
```

### Building Platform Integrations

See the [examples directory](./examples/) for complete integration examples:

- **[GitHub Action](./examples/github-action/)** - TypeScript-based GitHub Action
- **[Azure DevOps Task](./examples/azure-devops-task/)** - TypeScript-based Azure Pipeline task
- **[GitLab Component](./examples/gitlab-component/)** - Shell-based GitLab CI component

Each example demonstrates best practices for using `@fortify/setup` in different CI/CD platforms.


## Security

### Signature Verification

By default, `@fortify/setup` verifies RSA SHA256 signatures on downloaded fcli archives using Fortify's public key. This ensures the binary hasn't been tampered with.

**To disable** (not recommended):

```bash
npx @fortify/setup configure --no-verify-signature
```

### Supply Chain Security

- **No runtime dependencies** - Zero attack surface
- **Minimal codebase** - ~800 lines of auditable code
- **Transparent bootstrap** - All downloads from official Fortify GitHub releases
- **Always v3.x** - Ensures latest security patches and features

## Troubleshooting

### Bootstrap fails with signature verification error

```bash
# Check if OpenSSL is available
openssl version

# If unavailable, disable verification (not recommended)
npx @fortify/setup configure --no-verify-signature
```

### Cache corruption

```bash
# Clear cache and re-download
npx @fortify/setup clear-cache
npx @fortify/setup refresh-cache
```

### CI/CD always downloading fcli

```bash
# This is expected behavior in CI (cache disabled by default)
# Ensures latest v3.x security patches and features
# To enable caching (not recommended for CI):
FCLI_CACHE_ENABLED=true npx @fortify/setup run --fcli-version=latest
```

## Related Projects

- **[fcli]({{var:fcli-url}})** - Fortify CLI (what this package bootstraps)
- **[fortify/setup-action](https://github.com/fortify/setup-action)** (planned) - GitHub Action wrapper

For more information, see {{var:gh-pages-url}}.
