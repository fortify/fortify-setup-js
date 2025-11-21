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
cd setup

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

# Test commands
node dist/cli.js configure --cache-enabled
node dist/cli.js install --help
node dist/cli.js install --fcli=latest

# Install globally for testing
npm link
fortify-setup install --fcli=latest
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
├── types.ts       # TypeScript interfaces
├── config.ts      # Configuration management
├── bootstrap.ts   # Bootstrap logic (always v3.x)
├── cli.ts         # CLI entry point
└── index.ts       # Library exports
```

**Key Design Principles:**
- Always bootstrap latest fcli v3.x for consistency
- Zero runtime dependencies
- Three-tier configuration (file, env, args)
- Intelligent caching with CI/CD detection
- RSA signature verification by default

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.

<!-- END-INCLUDE:repo-devinfo.md -->


---

*[This document was auto-generated from CONTRIBUTING.template.md; do not edit by hand](https://github.com/fortify/shared-doc-resources/blob/main/USAGE.md)*
