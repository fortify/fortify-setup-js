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
rerunning the job may not set `release_created` again. For a workflow-only fix,
when the version has not been published to either registry:

1. Push the workflow fix and wait for its CI checks to pass.
2. Save the existing release metadata, then delete only the GitHub release entry.
   Preserve the release tag and its commit; do not use `--cleanup-tag`.
3. On the original merged release PR, replace `autorelease: tagged` with
   `autorelease: pending`. A merged PR cannot be reopened.
4. Rerun the **Release Please** job from the fixed workflow run, not the original
   failed run. It recreates the release using the existing tag and publishes the
   package from the release commit.
5. Verify the version is available in both registries and the release tag has not
   moved. Each publish step also looks up the published registry metadata.

Do not use this procedure blindly after partial publication: registries do not
allow overwriting an existing version. If package sources need changing, release
a new version rather than moving an existing release tag.

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
