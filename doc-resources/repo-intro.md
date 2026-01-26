## Introduction

The `@fortify/setup` npm package provides a lightweight utility with minimal dependencies for bootstrapping [fcli](https://github.com/fortify/fcli) and running `fcli tool env` commands for initializing the Fortify tools environment and generating corresponding environment variables in any environment.

**Key Features:**

* Bootstrap fcli automatically from GitHub releases or custom URL with signature verification, or use pre-installed fcli version
* Minimal runtime dependencies (tar, undici, unzipper) for secure archive handling
* Multi-platform support (Linux, macOS, Windows)
* Three-tier configuration (file, environment variables, CLI arguments)
* CI/CD tool cache integration (GitHub Actions, Azure DevOps, GitLab)
* Simple command structure: `bootstrap-config`, `bootstrap-cache`, `env`
* **TypeScript library API** for building custom integrations
* **Complete examples** for GitHub Actions, Azure DevOps, and GitLab CI

**Use Cases:**

* **CI/CD Pipelines**: Automatically set up Fortify tools in GitHub Actions, Azure DevOps, GitLab CI
* **Custom Integrations**: Build platform-specific wrappers using the TypeScript API
* **Local Development**: Configure once, use cached fcli for fast repeated runs
* **Docker**: Bootstrap fcli in containerized environments
* **Air-gapped Environments**: Use pre-installed fcli or custom download locations
