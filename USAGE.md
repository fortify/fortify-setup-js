
<!-- START-INCLUDE:repo-usage.md -->

# @fortify/setup - Usage Instructions

## Overview

`@fortify/setup` is a cross-platform utility that automates the setup of Fortify tools in CI/CD pipelines and local development environments by providing a wrapper around `fcli tool env` commands:

1. **Configure fcli bootstrapping** (optional) - Use the `config` command to specify custom fcli download URLs or point to a pre-installed fcli binary (must be 3.14.0+)

2. **Bootstrap fcli** - Automatically downloads and verifies fcli v3.x from GitHub (or uses configured pre-installed fcli)

3. **Initialize tools** - Use `env init` to detect, install, and configure Fortify tools (fcli, ScanCentral Client, FoD Uploader, Debricked CLI)

4. **Generate environment variables** - Use platform-specific `env` subcommands (`shell`, `github`, `ado`, `gitlab`, `powershell`) to generate tool-related environment variables and PATH updates

The bootstrapped fcli is saved to an internal cache, allowing subsequent `env` commands to reuse it without re-downloading.

## Quick Start

```bash
# Initialize tools with auto-detected versions
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto

# Generate shell environment variables
npx @fortify/setup env shell

# Or use pre-installed fcli (skip download, must be 3.14.0+)
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli
npx @fortify/setup env init --tools=sc-client:auto

# Generate GitHub Actions environment
npx @fortify/setup env github
```

## Installation

### Global (Recommended for local development)

```bash
npm install -g @fortify/setup

# Use shorter command
fortify-setup env init --tools=fcli:auto
```

### npx (No installation required)

```bash
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

### As project dependency

```bash
npm install --save-dev @fortify/setup
```

**For CLI usage:**
```json
{
  "scripts": {
    "fortify-init": "fortify-setup env init --tools=fcli:auto,sc-client:auto",
    "fortify-env": "fortify-setup env shell"
  }
}
```

**For programmatic/library usage:**
```typescript
import { runFortifyEnv } from '@fortify/setup';

// Initialize tools
await runFortifyEnv({
  args: ['init', '--tools=fcli:auto,sc-client:auto'],
  verbose: true
});

// Generate environment variables
const result = await runFortifyEnv({
  args: ['shell']
});
console.log(result.output);
```

## Commands

### `env` - Initialize tools and generate environment variables

```bash
npx @fortify/setup env <subcommand> [options]
```

Provides a unified interface to `fcli tool env` commands for both tool initialization and environment variable generation. Automatically bootstraps fcli if not available in cache or via configuration.

**Subcommands:**
- `init` - Initialize/install Fortify tools (wraps `fcli tool env init`)
- `shell` - Generate POSIX shell exports
- `powershell` (or `pwsh`) - Generate PowerShell assignments
- `github` - Append to GitHub Actions environment files
- `gitlab` - Write to a GitLab environment file
- `ado` - Generate Azure DevOps logging commands
- `expr` - Evaluate custom template expressions

**Options:**
- `--help|-h` - Show this help information
- `--fcli-help` - Show fcli tool env help

**Common init options:**
- `--tools=<tool1>[:<version>],<tool2>[:<version>],...` - Tools to initialize
  - Format: `toolname:version` where version can be:
    - Specific version: `sc-client:24.4.0`, `fcli:3.6.1`
    - Latest: `sc-client:latest`, `fcli:latest`
    - Auto-detect: `sc-client:auto`, `fcli:auto`
    - Path: `sc-client:/path/to/scancentral`
  - Available tools: `fcli`, `sc-client`, `fod-uploader`, `debricked-cli`

**Examples:**
```bash
# Initialize with auto-detected versions
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto

# Initialize with specific versions
npx @fortify/setup env init --tools=fcli:3.6.1,sc-client:24.4.0

# Initialize with latest versions
npx @fortify/setup env init --tools=fcli:latest,sc-client:latest

# Initialize with path to pre-installed tool
npx @fortify/setup env init --tools=sc-client:/opt/scancentral/bin

# Generate shell environment variables
npx @fortify/setup env shell

# Generate GitHub Actions environment
npx @fortify/setup env github

# Use in shell (bash/zsh)
source <(npx @fortify/setup env shell)
eval "$(npx @fortify/setup env shell)"

# Show general fcli tool env help
npx @fortify/setup env --fcli-help

# Show help for specific subcommand
npx @fortify/setup env init --help
npx @fortify/setup env shell --help
```

### `config` - Configure bootstrap settings

```bash
npx @fortify/setup config [options]
```

Configures how fcli is bootstrapped. Settings are saved to `~/.config/fortify/setup/config.json`.

**Options:**
- `--help|-h` - Show this help information
- `--fcli-url=<url>` - Full URL to fcli archive (platform-specific)
  - Example: `https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz`
- `--fcli-rsa-sha256-url=<url>` - Full URL to RSA SHA256 signature file
  - Default: `<fcli-url>.rsa_sha256`
- `--fcli-path=<path>` - Use pre-installed fcli binary (skip download)
  - **Must be fcli 3.14.0 or later**
- `--verify-signature` - Verify RSA signatures on downloads (default: enabled)
- `--no-verify-signature` - Skip signature verification (not recommended)
- `--reset` - Reset configuration to defaults

**Environment variables** (override config file):
- `FCLI_URL` - Override fcli archive download URL
- `FCLI_RSA_SHA256_URL` - Override RSA SHA256 signature file URL
- `FCLI_PATH` - Override fcli binary path (must be 3.14.0+)
- `FCLI_VERIFY_SIGNATURE` - Enable/disable signature verification (true|false)

**Pre-installed fcli environment variables** (checked during bootstrap):
- `FCLI` - Direct path to fcli binary (3.14.0+)
- `FCLI_CMD` - Alternative to FCLI
- `FCLI_HOME` - Directory containing bin/fcli (3.14.0+)

**Examples:**
```bash
# Use pre-installed fcli (skip downloads)
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli

# Use custom download URL (internal mirror)
npx @fortify/setup config --fcli-url=https://my-mirror.com/fcli-linux.tgz

# Disable signature verification (not recommended)
npx @fortify/setup config --no-verify-signature

# Reset to defaults
npx @fortify/setup config --reset

# View current settings
npx @fortify/setup config

# Configure via environment variables
export FCLI_PATH=/usr/local/bin/fcli
npx @fortify/setup config
```

## Bootstrap Behavior

`@fortify/setup` automatically bootstraps fcli when needed by any `env` subcommand. The bootstrap process checks for existing fcli installations before downloading.

**fcli resolution order:**

1. **Configured path** - Via config file or `FCLI_PATH` env var (must be fcli 3.14.0+)
2. **FCLI-specific environment variables** - `FCLI`, `FCLI_CMD`, or `FCLI_HOME` (must be 3.14.0+)
3. **Cached download** - Previously downloaded fcli in internal cache
4. **Download latest v3.x** - If none of the above are available

**Internal cache location:**
- Linux/Mac: `/tmp/fortify/fcli/`
- Windows: `%LOCALAPPDATA%\fortify\fcli-temp\`

## Configuration File

Configuration is saved to `~/.config/fortify/setup/config.json`:

```json
{
  "fcliUrl": "https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz",
  "fcliRsaSha256Url": "https://github.com/fortify/fcli/releases/download/v3/fcli-linux.tgz.rsa_sha256",
  "verifySignature": true
}
```

Or with pre-installed fcli:

```json
{
  "fcliPath": "/usr/local/bin/fcli",
  "verifySignature": true
}
```

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
        run: npx @fortify/setup env init --tools=fcli:auto,sc-client:24.4
      
      - name: Generate environment variables
        run: npx @fortify/setup env github >> $GITHUB_ENV
      
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
      customCommand: 'npx @fortify/setup env init --tools=fcli:auto,sc-client:auto'
  
  - script: |
      npx @fortify/setup env ado
    displayName: 'Generate environment variables'
  
  - script: |
      fcli --version
      scancentral --version
    displayName: 'Verify tool installation'
```

### GitLab CI

```yaml
fortify-scan:
  image: node:20
  script:
    - npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
    - eval "$(npx @fortify/setup env shell)"
    - fcli ssc session login --url $SSC_URL --token $SSC_TOKEN
    - fcli sc-sast scan start --publish-to SSC --upload
    - fcli ssc session logout
```

### Docker Multi-Stage Build

```dockerfile
FROM node:20-alpine AS fortify-setup
RUN npx @fortify/setup env init --tools=fcli:auto,sc-client:auto

FROM maven:3.9-eclipse-temurin-17
COPY --from=fortify-setup /tmp/fortify/fcli /tmp/fortify/fcli
RUN eval "$(npx @fortify/setup env shell)"

# Verify installation
RUN fcli --version && scancentral --version

# Build and scan application
COPY . /workspace
WORKDIR /workspace
RUN mvn clean package
RUN scancentral package -o app.zip
```

### Local Development Workflow

```bash
# One-time: Configure to use pre-installed fcli (if available)
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli

# Initialize Fortify tools
npx @fortify/setup env init --tools=fcli:auto,sc-client:24.4

# Generate and source environment variables
eval "$(npx @fortify/setup env shell)"

# Verify tools are available
fcli --version
scancentral --version

# Run scans
fcli sc-sast scan start --upload
```

### Air-Gapped / Corporate Networks

**Option 1: Use pre-installed fcli (must be 3.14.0+)**

```bash
# Install fcli 3.14.0+ manually, then configure
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli

# Initialize tools with pre-installed fcli
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

**Option 2: Custom download location**

```bash
# Configure custom internal mirror
npx @fortify/setup config \
  --fcli-url=https://internal-mirror.company.com/fortify/fcli-linux.tgz \
  --fcli-rsa-sha256-url=https://internal-mirror.company.com/fortify/fcli-linux.tgz.rsa_sha256

# Or disable signature verification (not recommended)
npx @fortify/setup config \
  --fcli-url=https://internal-mirror.company.com/fortify/fcli-linux.tgz \
  --no-verify-signature

# Initialize tools
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

**Option 3: Environment variables for CI/CD**

```bash
# Set in CI/CD pipeline configuration
export FCLI_PATH=/opt/fortify/fcli/bin/fcli
export FCLI_VERIFY_SIGNATURE=false

# Initialize tools without additional config
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

## Programmatic API

The `@fortify/setup` package exports a TypeScript API for building custom integrations.

### Basic API Usage

```typescript
import { bootstrapFcli, getEffectiveConfig } from '@fortify/setup';

// Bootstrap fcli (always re-downloads latest v3.x)
const result = await bootstrapFcli();

console.log(`Using fcli: ${result.fcliPath}`);
console.log(`Version: ${result.version}`);
console.log(`Source: ${result.source}`); // configured|preinstalled|download

// Get current configuration
const config = getEffectiveConfig();
console.log(`Verify signature: ${config.verifySignature}`);
```

### Running Actions Programmatically

```typescript
import { runFortifyEnv } from '@fortify/setup';

// Initialize tools
const initResult = await runFortifyEnv({
  args: ['init', '--tools=fcli:auto,sc-client:24.4'],
  verbose: true
});

console.log(`Exit code: ${initResult.exitCode}`);
console.log(`Fcli path: ${initResult.bootstrap.fcliPath}`);

// Generate environment variables
const envResult = await runFortifyEnv({
  args: ['shell']
});

console.log(envResult.output); // Environment variable definitions
```

### Building Platform Integrations

See the [examples directory](./examples/) for complete integration examples:

- **[GitHub Action](./examples/github-action/)** - TypeScript-based GitHub Action wrapper
- **[Azure DevOps Task](./examples/azure-devops-task/)** - TypeScript-based Azure Pipeline task
- **[GitLab Component](./examples/gitlab-component/)** - Shell-based GitLab CI component

Each example demonstrates best practices for using `@fortify/setup` in different CI/CD platforms.

## Security

### Signature Verification

By default, `@fortify/setup` verifies RSA SHA256 signatures on downloaded fcli archives using Fortify's public key. This ensures the binary hasn't been tampered with.

**To disable** (not recommended):

```bash
npx @fortify/setup config --no-verify-signature
```

### Pre-installed fcli Requirements

When using pre-installed fcli (via `--fcli-path` or environment variables), you **must** use fcli version 3.14.0 or later. This ensures compatibility with the fortify-setup and fortify-env actions.

### Supply Chain Security

- **Minimal dependencies** - Only `undici`, `tar`, and `unzipper` for cross-platform HTTP and archive handling
- **Pure Node.js implementation** - No reliance on system utilities (curl, tar, openssl)
- **Transparent bootstrap** - All downloads from official Fortify GitHub releases
- **Always latest v3.x** - Ensures latest security patches and features
- **Signature verification** - RSA SHA256 signature verification by default

## Troubleshooting

### Bootstrap fails with signature verification error

```bash
# Disable verification (not recommended)
npx @fortify/setup config --no-verify-signature

# Or specify custom signature URL
npx @fortify/setup config \
  --fcli-url=https://custom-url/fcli-linux.tgz \
  --fcli-rsa-sha256-url=https://custom-url/fcli-linux.tgz.rsa_sha256
```

### Using pre-installed fcli

```bash
# Ensure fcli is 3.14.0 or later
fcli --version  # Should show 3.14.0+

# Configure path to pre-installed fcli
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli

# Or use environment variable
export FCLI_PATH=/usr/local/bin/fcli
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

### `env` command fails

```bash
# Ensure tools are initialized first
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
npx @fortify/setup env shell

# Or configure pre-installed fcli
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli
npx @fortify/setup env shell
```

### CI/CD downloading fcli on every run

```bash
# Bootstrap downloads fcli only if not found in cache or via configuration
# To avoid downloads:
# 1. Configure pre-installed fcli: --fcli-path=/usr/local/bin/fcli
# 2. Or use FCLI_PATH environment variable
# 3. Or leverage CI/CD tool cache between runs
```

### Proxy configuration

```bash
# Set standard proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# @fortify/setup automatically uses these for downloads
npx @fortify/setup env init --tools=fcli:auto,sc-client:auto
```

## Related Projects

- **[fcli](https://github.com/fortify/fcli)** - Fortify CLI (what this package bootstraps)
- **[fcli tool env commands](https://github.com/fortify/fcli/tree/main/fcli-core/fcli-tool/src/main/java/com/fortify/cli/tool/env/cli/cmd)** - The fcli commands that @fortify/setup wraps
- **[fortify/github-action](https://github.com/fortify/github-action)** - GitHub Action wrapper for @fortify/setup

For more information, see https://fortify.github.io/fortify-setup-js.

<!-- END-INCLUDE:repo-usage.md -->


---

*[This document was auto-generated from USAGE.template.md; do not edit by hand](https://github.com/fortify/shared-doc-resources/blob/main/USAGE.md)*
