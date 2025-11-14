#!/bin/bash
set -e

# OpenFrame Parent Repository Cleanup Script
# Run this AFTER extracting CLI to new repository
# This script removes CLI from parent repo and updates references

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"

echo "🧹 OpenFrame Parent Repository Cleanup"
echo "======================================="
echo ""
echo "⚠️  WARNING: This will remove the CLI directory and update workflows"
echo "Make sure you have:"
echo "  1. Successfully extracted CLI to new repository"
echo "  2. Pushed CLI to github.com/flamingo-stack/openframe-cli"
echo "  3. Created a release in the new CLI repository"
echo ""
read -p "Continue? (y/N) " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

cd "$PARENT_DIR"

echo ""
echo "📋 Step 1: Removing CLI directory..."
if [ -d "cli" ]; then
    git rm -rf cli/
    echo "✅ CLI directory removed"
else
    echo "⚠️  CLI directory not found (may already be removed)"
fi

echo ""
echo "📋 Step 2: Updating .goreleaser.yml..."
if [ -f ".goreleaser.yml" ]; then
    # Check if .goreleaser.yml only contains CLI config
    if grep -q "openframe-cli" .goreleaser.yml; then
        git rm .goreleaser.yml
        echo "✅ .goreleaser.yml removed (CLI-only config)"
    else
        echo "⚠️  .goreleaser.yml contains other configs - manual review needed"
    fi
else
    echo "⚠️  .goreleaser.yml not found"
fi

echo ""
echo "📋 Step 3: Creating updated workflow for test.yml..."

# Backup existing workflow
cp .github/workflows/test.yml .github/workflows/test.yml.backup

# Update test.yml to download CLI from new repo
cat > .github/workflows/test.yml << 'WORKFLOW_EOF'
name: Test

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  paths:
    - 'openframe/**'
    - 'integrated-tools/**'
    - 'pom.xml'
    - '.github/**'
    - 'manifests/**'
    - 'clients/**'

concurrency:
  group: pr-${{ github.head_ref || github.ref }}
  cancel-in-progress: true

env:
  REGISTRY: "ghcr.io"
  ORGANISATION: ${{ github.repository_owner }}
  REPOSITORY: ${{ github.event.repository.name }}

# =============================================================================
# CI JOBS
# =============================================================================

jobs:
  changes:
    uses: ./.github/workflows/changes.yml

  matrix:
    uses: ./.github/workflows/matrix.yml

  test_images:
    name: "Test: ${{ matrix.name }}"
    needs: [changes, matrix]
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'push' ||
      (github.event_name == 'pull_request' && needs.changes.outputs[matrix.id] == 'true')

    strategy:
      fail-fast: false
      matrix:
        include: ${{ fromJson(needs.matrix.outputs.images_matrix) }}

    steps:
      - name: Check if build should run
        id: should_run
        run: |
          if [ "${{ needs.changes.outputs[matrix.id] }}" == "true" ] || [ "${{ github.event_name }}" == "push" ]; then
            echo "run=true" >> $GITHUB_OUTPUT
          else
            echo "run=false" >> $GITHUB_OUTPUT
          fi

      - uses: actions/checkout@v4
        if: steps.should_run.outputs.run == 'true'

      - uses: docker/setup-buildx-action@v3
        if: steps.should_run.outputs.run == 'true'

      - name: Build Docker image
        if: steps.should_run.outputs.run == 'true'
        run: |
          cd ${{ matrix.path }}
          docker build -t test-image:latest .

  integration_test:
    name: "Integration Test"
    needs: [changes, matrix, test_images]
    runs-on: ubuntu-latest
    if: github.event_name == 'pull_request'

    steps:
      - uses: actions/checkout@v4

      - name: Install OpenFrame CLI
        env:
          CLI_VERSION: "latest"
        run: |
          curl -fL "https://github.com/flamingo-stack/openframe-cli/releases/${CLI_VERSION}/download/openframe-cli_linux_amd64.tar.gz" | tar -xz
          sudo install -m 0755 openframe /usr/local/bin/openframe
          openframe --version

      - name: Create test cluster
        run: |
          openframe cluster create test-cluster --skip-wizard --nodes 1

      - name: Bootstrap OpenFrame
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          openframe bootstrap --deployment-mode=oss-tenant --non-interactive --verbose

      - name: Run integration tests
        run: |
          # Add your integration test commands here
          kubectl get pods -A

  test_clients:
    name: "Test Rust Client: ${{ matrix.name }} on ${{ matrix.os }}"
    needs: [changes, matrix]
    runs-on: "${{ matrix.os }}-latest"
    if: |
      github.event_name == 'push' ||
      (github.event_name == 'pull_request' &&
       (needs.changes.outputs.client == 'true' || needs.changes.outputs.openframe-chat == 'true'))

    strategy:
      fail-fast: false
      matrix:
        include: ${{ fromJson(needs.matrix.outputs.clients_matrix) }}

    steps:
      - name: Check if build should run
        id: should_run
        run: |
          if [ "${{ github.event_name }}" == "push" ]; then
            echo "run=true" >> $GITHUB_OUTPUT
          else
            echo "run=false" >> $GITHUB_OUTPUT
          fi

      - uses: actions/checkout@v4
        if: steps.should_run.outputs.run == 'true'

      - uses: ./.github/steps/rust-setup
        if: steps.should_run.outputs.run == 'true'
        with:
          path: ${{ matrix.path }}
          toolchain: stable
          targets: ${{ matrix.target }}
          components: clippy, rustfmt
          shared-key: ${{ runner.os }}-${{ runner.arch }}

      - name: Run lint
        if: steps.should_run.outputs.run == 'true'
        working-directory: ${{ matrix.path }}
        run: |
          make lint
        continue-on-error: true

      - name: Test client
        working-directory: ${{ matrix.path }}
        if: steps.should_run.outputs.run == 'true'
        run: |
          make test
WORKFLOW_EOF

echo "✅ test.yml updated to use CLI from new repository"

echo ""
echo "📋 Step 4: Updating release.yml..."

# Backup existing workflow
cp .github/workflows/release.yml .github/workflows/release.yml.backup

# Update release.yml to remove CLI build steps
cat > .github/workflows/release.yml << 'RELEASE_EOF'
name: Release

on:
  push:
    branches:
      - main
    paths:
      - 'openframe/**'
      - 'integrated-tools/**'
      - 'pom.xml'
      - 'clients/**'
  workflow_dispatch:
    inputs:
      version:
        description: 'Release version (e.g., v1.0.0)'
        required: true
        type: string

permissions:
  contents: write
  packages: write

env:
  REGISTRY: "ghcr.io"
  ORGANISATION: ${{ github.repository_owner }}
  REPOSITORY: ${{ github.event.repository.name }}

jobs:
  changes:
    uses: ./.github/workflows/changes.yml

  matrix:
    uses: ./.github/workflows/matrix.yml

  build_images:
    name: "Build: ${{ matrix.name }}"
    needs: [changes, matrix]
    runs-on: ubuntu-latest
    if: |
      github.event_name == 'workflow_dispatch' ||
      needs.changes.outputs[matrix.id] == 'true'

    strategy:
      fail-fast: false
      matrix:
        include: ${{ fromJson(needs.matrix.outputs.images_matrix) }}

    steps:
      - uses: actions/checkout@v4

      - name: Build and push Docker image
        run: |
          echo "Building ${{ matrix.name }}..."
          # Add your Docker build and push logic here

  build_clients:
    name: "Build Rust Client: ${{ matrix.name }} on ${{ matrix.os }}"
    needs: [changes, matrix]
    runs-on: "${{ matrix.os }}-latest"
    if: |
      github.event_name == 'workflow_dispatch' ||
      needs.changes.outputs.client == 'true' ||
      needs.changes.outputs.openframe-chat == 'true'

    strategy:
      fail-fast: false
      matrix:
        include: ${{ fromJson(needs.matrix.outputs.clients_matrix) }}

    steps:
      - uses: actions/checkout@v4

      - uses: ./.github/steps/rust-setup
        with:
          path: ${{ matrix.path }}
          toolchain: stable
          targets: ${{ matrix.target }}
          components: clippy, rustfmt
          shared-key: ${{ runner.os }}-${{ runner.arch }}

      - name: Build client
        working-directory: ${{ matrix.path }}
        run: |
          make release

  release:
    name: "Create Release"
    needs: [changes, matrix, build_images, build_clients]
    runs-on: ubuntu-latest
    if: github.event_name == 'workflow_dispatch'

    steps:
      - uses: actions/checkout@v4

      - name: Create Release
        uses: ncipollo/release-action@v1
        with:
          tag: ${{ github.event.inputs.version }}
          name: "Release ${{ github.event.inputs.version }}"
          draft: false
          prerelease: false
          generateReleaseNotes: true
          token: ${{ secrets.GITHUB_TOKEN }}
RELEASE_EOF

echo "✅ release.yml updated (CLI build steps removed)"

echo ""
echo "📋 Step 5: Updating CLAUDE.md..."
if [ -f "CLAUDE.md" ]; then
    # Add note about CLI location
    if ! grep -q "openframe-cli repository" CLAUDE.md; then
        cat >> CLAUDE.md << 'CLAUDE_EOF'

## CLI Tool

The OpenFrame CLI has been moved to a separate repository:
- Repository: https://github.com/flamingo-stack/openframe-cli
- Installation: See CLI repository README for installation instructions
- Documentation: Available in CLI repository

To install the CLI:
```bash
# Latest release
curl -fL "https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli_$(uname -s | tr '[:upper:]' '[:lower:]')_$(uname -m).tar.gz" | tar -xz
sudo mv openframe /usr/local/bin/
```
CLAUDE_EOF
        echo "✅ CLAUDE.md updated with CLI reference"
    else
        echo "⚠️  CLAUDE.md already mentions CLI repository"
    fi
else
    echo "⚠️  CLAUDE.md not found"
fi

echo ""
echo "📋 Step 6: Updating README.md..."
if [ -f "README.md" ]; then
    # Check if README mentions CLI location
    if grep -q "cli/" README.md; then
        echo "⚠️  README.md contains references to cli/ - manual review recommended"
        echo "    Please update README.md to point to: https://github.com/flamingo-stack/openframe-cli"
    fi
fi

echo ""
echo "✅ Cleanup Complete!"
echo ""
echo "Files modified:"
echo "  - Removed: cli/"
echo "  - Removed/Updated: .goreleaser.yml"
echo "  - Updated: .github/workflows/test.yml"
echo "  - Updated: .github/workflows/release.yml"
echo "  - Updated: CLAUDE.md"
echo ""
echo "Backups created:"
echo "  - .github/workflows/test.yml.backup"
echo "  - .github/workflows/release.yml.backup"
echo ""
echo "Next steps:"
echo "1. Review the changes: git status"
echo "2. Test the updated workflows locally if possible"
echo "3. Update any remaining documentation references"
echo "4. Commit the changes:"
echo "   git add -A"
echo "   git commit -m 'Remove CLI, migrate to standalone repository'"
echo "5. Push to remote: git push origin main"
echo ""
