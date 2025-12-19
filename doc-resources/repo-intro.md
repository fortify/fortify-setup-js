
## WORK IN PROGRESS

This is still work in progress and should not be used for production purposes. It requires new fcli features that have not yet been released. To test, you will need the fcli development release located here: https://github.com/fortify/fcli/releases/tag/dev_feat.ci-updates

You have two options:
1. Manually pre-install fcli from the link above, then run `npx @fortify/setup config --fcli-path=<path to pre-installed fcli>`
2. Configure `@fortify/setup` with the proper download URL, for example, for Linux, `npx @fortify/setup config --fcli-url=https://github.com/fortify/fcli/releases/download/dev_feat.ci-updates/fcli-linux.tgz`

Once you've configured the above, you can use `npx @fortify/setup env init --tools=fcli,sc-client` to bootstrap fcli and install Fortify tools, followed by `npx @fortify/setup env github` (or `shell`, `ado`, `gitlab`, etc.) to generate appropriate environment variables.

## Introduction

The `@fortify/setup` npm package provides a lightweight utility with minimal dependencies for bootstrapping [fcli](https://github.com/fortify/fcli) and running `fcli tool env` commands for initializing the Fortify tools environment and generating corresponding environment variables in any environment.

**Key Features:**

* Bootstrap fcli automatically from GitHub releases with signature verification
* Minimal runtime dependencies (tar, undici, unzipper) for secure archive handling
* Intelligent caching with CI/CD environment auto-detection
* Multi-platform support (Linux, macOS, Windows)
* Three-tier configuration (file, environment variables, CLI arguments)
* CI/CD tool cache integration (GitHub Actions, Azure DevOps, GitLab)
* Simple command structure: `configure`, `refresh-cache`, `clear-cache`, `install`
* **TypeScript library API** for building custom integrations
* **Complete examples** for GitHub Actions, Azure DevOps, and GitLab CI

**Use Cases:**

* **CI/CD Pipelines**: Automatically set up Fortify tools in GitHub Actions, Azure DevOps, GitLab CI
* **Custom Integrations**: Build platform-specific wrappers using the TypeScript API
* **Local Development**: Configure once, use cached fcli for fast repeated runs
* **Docker**: Bootstrap fcli in containerized environments
* **Air-gapped Environments**: Use pre-installed fcli or custom download locations
