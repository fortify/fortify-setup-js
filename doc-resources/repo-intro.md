The `@fortify/setup` npm package provides a lightweight, zero-dependency utility for bootstrapping [fcli](https://github.com/fortify/fcli) and running the fortify-setup action in any environment.

**Key Features:**

* Bootstrap fcli automatically from GitHub releases with signature verification
* Zero runtime dependencies for minimal attack surface
* Intelligent caching with CI/CD environment auto-detection
* Multi-platform support (Linux, macOS, Windows)
* Three-tier configuration (file, environment variables, CLI arguments)
* CI/CD tool cache integration (GitHub Actions, Azure DevOps, GitLab)
* Simple command structure: `configure`, `refresh-cache`, `clear-cache`, `run`
* **TypeScript library API** for building custom integrations
* **Complete examples** for GitHub Actions, Azure DevOps, and GitLab CI

**Use Cases:**

* **CI/CD Pipelines**: Automatically set up Fortify tools in GitHub Actions, Azure DevOps, GitLab CI
* **Custom Integrations**: Build platform-specific wrappers using the TypeScript API
* **Local Development**: Configure once, use cached fcli for fast repeated runs
* **Docker**: Bootstrap fcli in containerized environments
* **Air-gapped Environments**: Use pre-installed fcli or custom download locations
