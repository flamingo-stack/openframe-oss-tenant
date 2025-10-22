# Release Notes Template

This file is a template for release notes. When running the GitHub Actions workflow, this file will be replaced with auto-generated content.

## CLI Binaries

Download the appropriate archive for your platform from the release assets.

## For Local Testing

When running GoReleaser locally, use:
```bash
goreleaser release --clean --skip=validate --skip=publish --snapshot
```

The `--snapshot` flag will skip release creation and just build the binaries.
