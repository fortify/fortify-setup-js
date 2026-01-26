# Contributing to @fortify/setup

## Contribution Agreement

Contributions like bug fixes and enhancements may be submitted through Pull Requests on this repository. Before we can accept 3<sup>rd</sup>-party pull requests, you will first need to sign and submit the [Contribution Agreement](https://github.com/fortify/repo-resources/raw/main/static/Open%20Source%20Contribution%20Agreement%20Jan2020v1.pdf). Please make sure to mention your GitHub username when submitting the form, to allow us to verify that the author of a pull request has accepted this agreement. 


<!-- START-INCLUDE:repo-devinfo.md -->

## Developer Information

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.

### Development Setup

```bash
# Clone repository
git clone https://github.com/fortify/fortify-setup-js.git

# Install dependencies
npm install

# Build TypeScript
npm run build

# Test CLI
node dist/cli.js --help
```

### Building and Testing

```bash
# Clean build
npm run clean && npm run build

# Run tests
npm test

# Test CLI commands locally
node dist/cli.js --help
node dist/cli.js bootstrap-config --help
node dist/cli.js env --help

# Test with specific commands
node dist/cli.js bootstrap-config --fcli-version=3.14.1
node dist/cli.js env init --tools=fcli:auto,sc-client:auto

# Install globally for testing
npm link
fortify-setup bootstrap-config --fcli-version=v3
fortify-setup env init --tools=fcli:auto
```

### Release Process

Releases are automated via [release-please](https://github.com/googleapis/release-please):

1. Commits to `main` using [Conventional Commits](https://www.conventionalcommits.org/)
2. release-please creates/updates a release PR with:
   - Version bump (based on commit types)
   - CHANGELOG.md updates
   - package.json version update
3. Merge PR to trigger release
4. npm package published automatically

**Commit types:**
- `feat`: Minor version bump
- `fix`: Patch version bump
- `feat!` or `BREAKING CHANGE`: Major version bump

### Architecture

```
src/
├── types.ts           # TypeScript interfaces
├── config.ts          # Configuration management
├── config.test.ts     # Configuration unit tests
├── bootstrap.ts       # fcli bootstrap logic
├── actions.ts         # High-level action wrappers
├── cli.ts             # CLI entry point
├── logger.ts          # Logging utilities
├── logger.test.ts     # Logger unit tests
├── utils.ts           # Utility functions
├── utils.test.ts      # Utils unit tests
├── index.ts           # Library exports
└── __tests__/         # Integration & E2E tests
    ├── bootstrap.integration.test.ts
    ├── actions.integration.test.ts
    └── e2e.test.ts
```

**Key Design Principles:**
- Bootstrap latest fcli v3.x by default to benefit from latest features & bug fixes
- Version pinning support via `FCLI_BOOTSTRAP_VERSION` (accepts with or without 'v' prefix)
- Minimal runtime dependencies (undici, tar, unzipper)
- Three-tier configuration: file → env vars → runtime options
- Intelligent caching with support for persistent tool cache (GitHub Actions)
- RSA signature verification by default
- Wraps `fcli tool env` commands for unified tool management

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

<!-- END-INCLUDE:repo-devinfo.md -->


---

*[This document was auto-generated from CONTRIBUTING.template.md; do not edit by hand](https://github.com/fortify/shared-doc-resources/blob/main/USAGE.md)*
