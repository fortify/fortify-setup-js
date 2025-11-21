
<!-- START-INCLUDE:repo-usage.md -->

# @fortify/setup - Usage Instructions

## Overview

`@fortify/setup` is a cross-platform utility that automates the setup of Fortify tools in CI/CD pipelines and local development environments. It works through a multi-stage bootstrap process:

1. **Configure fcli bootstrapping** (optional) - Use the `config` command to specify custom fcli download URLs or point to a pre-installed fcli binary (must be 3.14.0+)

2. **Bootstrap latest fcli v3.x** - On every `install` command, downloads and verifies the latest fcli v3.x release from GitHub (or uses configured pre-installed fcli)

3. **Run fcli tool setup command** - Uses the bootstrapped fcli to detect, install, and configure user-requested versions of fcli and other Fortify tools (ScanCentral Client, FoD Uploader, Debricked CLI)

4. **Generate environment variables** (optional) - Use the `env` command to generate tool-related environment variables and PATH updates for installed tools

The downloaded fcli from step 2 is saved to an internal cache, allowing the `env` command to reuse it without re-downloading.

## Quick Start

```bash
# Run with default settings (downloads latest fcli v3.x, installs tools)
npx @fortify/setup install --tools=fcli,sc-client

# Use pre-installed fcli (skip download, must be 3.14.0+)
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli
npx @fortify/setup install --tools=fcli

# Generate environment variables after setup
npx @fortify/setup env shell
```

## Installation

### Global (Recommended for local development)

```bash
npm install -g @fortify/setup

# Use shorter command
fortify-setup install --fcli=latest
```

### npx (No installation required)

```bash
npx @fortify/setup install --fcli=latest
```

### As project dependency

```bash
npm install --save-dev @fortify/setup
```

**For CLI usage:**
```json
{
  "scripts": {
    "fortify-setup": "fortify-setup install --fcli=latest"
  }
}
```

**For programmatic/library usage:**
```typescript
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';

await runFortifySetup({
  args: ['--tools=sc-client']
});
```

## Commands

### `install` - Install/setup Fortify tools

```bash
npx @fortify/setup install [options]
```

Bootstraps fcli (always re-downloads latest v3.x to ensure latest version is used) and runs the fcli tool setup command to install Fortify tools. All options are passed through to the fcli tool setup command.

**Options:**
- `--help|-h` - Show this help information
- `--fcli-help` - Show fcli tool setup help

**Common tool setup options:**
- `--tools=<tools>` - Comma-separated list of tools to install (e.g., fcli,sc-client,fod-uploader)
- `--air-gapped` - Air-gapped mode (use pre-installed tools only)
- `--tool-cache-pattern=<pattern>` - Use CI/CD platform tool cache when available

**Examples:**
```bash
# Install ScanCentral Client
npx @fortify/setup install --tools=sc-client

# Install multiple tools
npx @fortify/setup install --tools=fcli,sc-client

# Air-gapped mode (pre-installed tools only)
npx @fortify/setup install --tools=sc-client --air-gapped

# Show fcli tool setup help
npx @fortify/setup install --fcli-help
```

### `env` - Generate environment variables

```bash
npx @fortify/setup env <type> [options]
```

Generates environment variable definitions for installed Fortify tools in various formats (shell, GitHub Actions, Azure DevOps, etc.). Must be run after the `install` command has executed at least once.

**Options:**
- `--help|-h` - Show this help information
- `--fcli-help` - Show fcli tool env help (fortify-setup env --fcli-help shows information on available types, fortify-setup env <type> --fcli-help shows help for that specific type)

**Supported types:**
- `shell` - Shell environment variables (default)
- `github` - GitHub Actions format
- `ado` - Azure DevOps format
- `gitlab` - GitLab CI format
- `powershell` - PowerShell format
- `expr` - Expression format

**Common options:**
- `--tools=<tools>` - Comma-separated list of tools to include (e.g., sc-client,fcli)

**Examples:**
```bash
# Generate shell format (default)
npx @fortify/setup env shell

# Generate for GitHub Actions
npx @fortify/setup env github

# Use in shell (bash/zsh)
eval "$(npx @fortify/setup env shell)"
source <(npx @fortify/setup env shell)

# Show fcli tool env help
npx @fortify/setup env shell --fcli-help
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

`@fortify/setup` always re-downloads the latest fcli v3.x on every `install` command to ensure the latest version is used. The downloaded fcli is saved to an internal cache for use by the `env` command.

**fcli resolution order:**

1. **Configured path** - Via config file or `FCLI_PATH` env var (must be fcli 3.14.0+)
2. **FCLI-specific environment variables** - `FCLI`, `FCLI_CMD`, or `FCLI_HOME` (must be 3.14.0+)
3. **Download latest v3.x** - Always re-downloads to ensure latest version is used

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
        run: npx @fortify/setup install --tools=fcli,sc-client
      
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
      customCommand: 'npx @fortify/setup install --tools=fcli,sc-client'
  
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
    - npx @fortify/setup install --tools=fcli,sc-client
    - eval "$(npx @fortify/setup env shell)"
    - fcli ssc session login --url $SSC_URL --token $SSC_TOKEN
    - fcli sc-sast scan start --publish-to SSC --upload
    - fcli ssc session logout
```

### Docker Multi-Stage Build

```dockerfile
FROM node:20-alpine AS fortify-setup
RUN npx @fortify/setup install --tools=fcli,sc-client

FROM maven:3.9-eclipse-temurin-17
COPY --from=fortify-setup /tmp/fortify/fcli /tmp/fortify/fcli
RUN eval "$(node -e 'console.log(process.env.PATH)' && npx @fortify/setup env)"

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

# Run tool setup to install tools
npx @fortify/setup install --tools=fcli,sc-client

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

# Run tool setup with pre-installed fcli
npx @fortify/setup install --tools=fcli,sc-client
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

# Run
npx @fortify/setup install --tools=fcli
```

**Option 3: Environment variables for CI/CD**

```bash
# Set in CI/CD pipeline configuration
export FCLI_PATH=/opt/fortify/fcli/bin/fcli
export FCLI_VERIFY_SIGNATURE=false

# Run without additional config
npx @fortify/setup install --tools=fcli
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
import { runFortifySetup, runFortifyEnv } from '@fortify/setup';

// Run tool setup
const setupResult = await runFortifySetup({
  args: ['--tools=sc-client,fcli'],
  verbose: true
});

console.log(`Exit code: ${setupResult.exitCode}`);
console.log(`Fcli path: ${setupResult.bootstrap.fcliPath}`);

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
npx @fortify/setup install --fcli=latest
```

### `env` command fails with "no downloaded fcli"

```bash
# The env command requires run to be executed first
npx @fortify/setup install --tools=fcli
npx @fortify/setup env

# Or configure pre-installed fcli
npx @fortify/setup config --fcli-path=/usr/local/bin/fcli
npx @fortify/setup env
```

### CI/CD always downloading fcli

```bash
# This is expected behavior
# Each run command re-downloads latest v3.x to ensure latest version is used
# Downloads are fast (~10MB) and guarantee up-to-date features and security patches
```

### Proxy configuration

```bash
# Set standard proxy environment variables
export HTTP_PROXY=http://proxy.company.com:8080
export HTTPS_PROXY=http://proxy.company.com:8080

# @fortify/setup automatically uses these for downloads
npx @fortify/setup install --fcli=latest
```

## Related Projects

- **[fcli](https://github.com/fortify/fcli)** - Fortify CLI (what this package bootstraps)
- **[fortify-setup action](https://github.com/fortify/fcli/blob/main/fcli-other/fcli-functional/src/main/resources/com/fortify/cli/ftest/app/root/action-default.yaml)** - The fcli action that @fortify/setup runs
- **[fortify/github-action](https://github.com/fortify/github-action)** - GitHub Action wrapper for @fortify/setup

For more information, see https://fortify.github.io/fortify-setup-js.

<!-- END-INCLUDE:repo-usage.md -->


---

*[This document was auto-generated from USAGE.template.md; do not edit by hand](https://github.com/fortify/shared-doc-resources/blob/main/USAGE.md)*
