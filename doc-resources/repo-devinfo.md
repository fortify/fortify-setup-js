## Developer Information

See [CONTRIBUTING.md](CONTRIBUTING.md) for information on how to contribute to this project.

### Development Setup

```bash
# Clone repository
git clone {{var:repo-url}}.git

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
4. Package published automatically to npm and GitHub Packages, with provenance

Before creating a release, CI installs the same pinned Node.js/npm publishing
toolchain and runs `npm publish --dry-run` for both registries. This checks package
preparation, including the `prepublishOnly` lifecycle, on ordinary PRs and pushes.
Keep the publishing versions in `.github/workflows/ci.yml` compatible when updating
them; do not use `npm@latest` only in the release path. Registry authentication and
provenance still require a real publish to validate.

**Commit types:**
- `feat`: Minor version bump
- `fix`: Patch version bump
- `feat!` or `BREAKING CHANGE`: Major version bump

#### Release Recovery

If publishing fails after release-please has created the GitHub release, simply
rerunning the job may not set `release_created` again. Relabeling the old release
PR can also fail with `Resource not accessible by integration`: after workflow
changes, `GITHUB_TOKEN` may lack permission to recreate a release at the old
commit. A fresh release PR avoids this older-commit restriction.

Only when the version has not been published to either registry, and a maintainer
explicitly approves replacing the already-public Git tag:

1. Push the workflow fix and wait for its CI checks to pass.
2. Save the release metadata and original tag SHA, then delete the failed GitHub
   release and tag.
3. Clear `autorelease: pending` and `autorelease: tagged` from the original merged
   release PR. A merged PR cannot be reopened.
4. Reset only the failed version bump in `package.json`, `package-lock.json`,
   `.release-please-manifest.json`, and `CHANGELOG.md`; retain the features and CI
   fixes. Push with a `Release-As: <failed-version>` commit footer to request the
   same version.
5. Review and merge the fresh release PR, then verify that its normal CI run
   publishes to both registries. The recreated tag will point to the new release
   commit. Each publish step also looks up the published registry metadata.

Do not use this procedure after partial publication: registries do not allow
overwriting an existing version. Prefer a new version whenever replacing the
public tag is unacceptable or package sources need changing.

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
- Two-tier configuration: env vars → runtime options
- Intelligent caching with support for persistent tool cache (GitHub Actions)
- RSA signature verification by default
- Wraps `fcli tool env` commands for unified tool management

### License

This project is licensed under the MIT License - see [LICENSE](LICENSE) for details.
