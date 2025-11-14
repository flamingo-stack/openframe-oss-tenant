# CLI Migration Guide

## Overview
This guide will help you migrate the OpenFrame CLI from `openframe-oss-tenant` to a new `openframe-cli` repository while preserving git history.

## Prerequisites

1. Install `git-filter-repo`:
   ```bash
   # macOS
   brew install git-filter-repo

   # Or via pip
   pip install git-filter-repo
   ```

2. Create the new repository on GitHub:
   - Repository name: `openframe-cli`
   - Organization: `flamingo-stack`
   - URL: `https://github.com/flamingo-stack/openframe-cli`

## Migration Steps

### Step 1: Extract CLI with Git History

Run the extraction script from the parent directory:

```bash
# From openframe-oss-tenant directory
./scripts/migrate-cli.sh
```

This script will:
1. Clone the current repository to a temporary location
2. Extract only the `cli/` directory with full git history
3. Move `.goreleaser.yml` to the extracted repository
4. Restructure the directory (move cli/* to root)
5. Create a ready-to-push repository in `../openframe-cli/`

### Step 2: Update References in New CLI Repo

The migration script will automatically update:
- ✅ `go.mod` - Module path to `github.com/flamingo-stack/openframe-cli`
- ✅ `.goreleaser.yml` - Remove nested `cli/` directory references
- ✅ All Go files - Import paths and module references
- ✅ GitHub workflow references (if any moved)

Manual updates needed:
- Update `README.md` with new repository information
- Update any documentation links
- Verify `helm-values-example.yaml` references are correct

### Step 3: Push to New Repository

```bash
cd ../openframe-cli
git remote add origin https://github.com/flamingo-stack/openframe-cli.git
git push -u origin main
```

### Step 4: Update Parent Repository

Back in `openframe-oss-tenant`, the following will be updated:
1. Remove `cli/` directory
2. Update `.github/workflows/test.yml` to download CLI from new repo
3. Update `.github/workflows/release.yml` to remove CLI build steps
4. Update `.goreleaser.yml` or remove if only used for CLI
5. Update documentation to point to new CLI repository

### Step 5: Create Initial Release

In the new CLI repository:

```bash
cd ../openframe-cli
git tag v0.1.0
git push origin v0.1.0
```

This will trigger GoReleaser and create the first release with binaries.

### Step 6: Verify Integration

1. Check that the new CLI repository builds successfully
2. Verify the parent repository workflows can download the CLI
3. Test the CLI installation from the new repository

## Rollback Plan

If something goes wrong:

1. The original repository is unchanged until Step 4
2. You can delete the new `openframe-cli` repository
3. The extraction is done in a separate directory (`../openframe-cli/`)

## Post-Migration Checklist

- [ ] New CLI repository created and pushed
- [ ] CI/CD workflows passing in new repository
- [ ] First release created with binaries
- [ ] Parent repository updated and workflows passing
- [ ] Documentation updated with new repository links
- [ ] Team notified of new repository location
- [ ] Update any external references to CLI repository

## Support

If you encounter issues during migration:
1. Check the migration logs in `migration.log`
2. Verify all prerequisites are installed
3. Ensure you have proper permissions for both repositories
