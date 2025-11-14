# CLI Migration Summary

## Status: Ready for Execution

All preparation work is complete. The CLI is ready to be migrated to `github.com/flamingo-stack/openframe-cli`.

## What Was Done

### 1. CLI Code Updates ✅
- Updated `go.mod` module path: `github.com/flamingo-stack/openframe-cli`
- Updated all import paths across 134 Go files
- Fixed internal path references (`../` → `.`)
- Created CLI-specific `.goreleaser.yml` configuration

### 2. CI/CD Setup ✅
- Created `.github/workflows/test.yml` for automated testing
- Created `.github/workflows/release.yml` for GoReleaser integration
- Both workflows are ready to run in the new repository

### 3. Migration Tools ✅
- `scripts/migrate-cli.sh` - Extracts CLI with git history
- `scripts/cleanup-parent-repo.sh` - Cleans up parent repository
- `MIGRATION_GUIDE.md` - Detailed migration documentation

### 4. Commits ✅
- **Commit 4e09c8e1**: "Prepare CLI for migration to standalone repository"
- All changes committed to `main` branch

## How to Execute the Migration

### Phase 1: Extract CLI to New Repository

1. **Create the new GitHub repository**:
   ```bash
   # On GitHub, create: github.com/flamingo-stack/openframe-cli
   # Settings: Public repository, no README/License/gitignore
   ```

2. **Run the extraction script**:
   ```bash
   cd /Users/oleksii/Documents/openframe-oss-tenant
   ./scripts/migrate-cli.sh
   ```

   This will:
   - Clone current repo to temporary location
   - Extract `cli/` directory with full git history
   - Restructure directory (move cli/* to root)
   - Create ready-to-push repo at `../openframe-cli/`

3. **Review the extracted repository**:
   ```bash
   cd ../openframe-cli
   ls -la
   git log --oneline  # Verify history is preserved
   ```

4. **Push to new repository**:
   ```bash
   git remote add origin https://github.com/flamingo-stack/openframe-cli.git
   git push -u origin main
   ```

5. **Create initial release**:
   ```bash
   git tag v0.1.0
   git push origin v0.1.0
   ```

   This will trigger GoReleaser and create binaries for all platforms.

### Phase 2: Update Parent Repository

1. **Verify CLI repository is working**:
   - Check that GitHub Actions workflows passed
   - Verify release v0.1.0 was created with binaries
   - Test downloading and running the CLI

2. **Run the cleanup script**:
   ```bash
   cd /Users/oleksii/Documents/openframe-oss-tenant
   ./scripts/cleanup-parent-repo.sh
   ```

   This will:
   - Remove `cli/` directory
   - Remove/update `.goreleaser.yml`
   - Update GitHub workflows to download CLI from new repo
   - Update documentation

3. **Review and commit changes**:
   ```bash
   git status  # Review what changed
   git add -A
   git commit -m "Remove CLI, migrate to standalone repository

   The OpenFrame CLI has been migrated to:
   https://github.com/flamingo-stack/openframe-cli

   Changes:
   - Removed cli/ directory
   - Updated workflows to download CLI from new repository
   - Updated documentation with new CLI location
   "
   git push origin main
   ```

### Phase 3: Verify Integration

1. **Test parent repository workflows**:
   - Push a change to trigger CI
   - Verify it can download CLI from new repository

2. **Test CLI functionality**:
   ```bash
   # Install from new repository
   curl -fL "https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli_darwin_arm64.tar.gz" | tar -xz
   ./openframe --version
   ./openframe cluster create --help
   ```

3. **Update team and documentation**:
   - Notify team of new CLI repository location
   - Update any external documentation
   - Update installation instructions

## Files Changed in Parent Repo (Already Committed)

```
cli/                              # All files updated with new module path
├── .github/workflows/            # New CI/CD workflows (will move to new repo)
├── .goreleaser.yml              # CLI-specific config (will move to new repo)
├── go.mod                       # Updated module path
├── cmd/                         # All import paths updated
├── internal/                    # All import paths updated
└── tests/                       # All import paths updated

MIGRATION_GUIDE.md               # New: Detailed migration guide
scripts/migrate-cli.sh           # New: Extraction script
scripts/cleanup-parent-repo.sh   # New: Cleanup script
```

## Files That Will Be Removed from Parent Repo (Phase 2)

```
cli/                    # Entire directory
.goreleaser.yml        # If CLI-specific only
```

## Files That Will Be Updated in Parent Repo (Phase 2)

```
.github/workflows/test.yml       # Download CLI from new repo
.github/workflows/release.yml    # Remove CLI build steps
CLAUDE.md                        # Add CLI repository reference
README.md                        # Update CLI installation instructions
```

## Rollback Plan

If something goes wrong:

### Before Phase 2:
- Simply delete the new `openframe-cli` repository
- The parent repository is unchanged
- Revert commits if needed: `git revert 4e09c8e1`

### After Phase 2:
- Restore from backups created by cleanup script
- Revert cleanup commit
- Re-extract CLI if needed

## Important Notes

1. **Git History**: The extraction preserves full git history for the CLI
2. **Module Path**: Already updated to `github.com/flamingo-stack/openframe-cli`
3. **No Breaking Changes**: Parent repo will download CLI from new location
4. **Testing**: Test the new CLI repository before cleaning up parent repo
5. **Timing**: Phase 1 and Phase 2 should be done in quick succession

## Next Immediate Steps

**You should do these in order:**

1. ✅ Create GitHub repository: `flamingo-stack/openframe-cli`
2. ✅ Run `./scripts/migrate-cli.sh`
3. ✅ Push to new repository
4. ✅ Create v0.1.0 release
5. ✅ Wait for release to build (5-10 minutes)
6. ✅ Test CLI installation from new repo
7. ✅ Run `./scripts/cleanup-parent-repo.sh`
8. ✅ Commit and push parent repo changes

## Support

If you encounter issues:
- Check `migration.log` (created by scripts)
- Verify git-filter-repo is installed
- Ensure you have push permissions to both repositories
- Review the MIGRATION_GUIDE.md for detailed troubleshooting

## Success Criteria

✅ New CLI repository:
- Has full git history
- CI/CD workflows passing
- Release v0.1.0 created with binaries
- Can be installed and run successfully

✅ Parent repository:
- CLI directory removed
- Workflows updated and passing
- Documentation updated
- Can download and use CLI from new repo

---

**Migration prepared by**: Claude Code
**Date**: 2025-11-14
**Status**: Ready for execution ✅
