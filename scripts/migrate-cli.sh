#!/bin/bash
set -e

# OpenFrame CLI Migration Script
# This script extracts the CLI directory from openframe-oss-tenant
# to a new repository while preserving git history

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PARENT_DIR="$(dirname "$SCRIPT_DIR")"
NEW_REPO_DIR="$PARENT_DIR/../openframe-cli"
TEMP_REPO_DIR="$PARENT_DIR/../openframe-cli-temp"

echo "🦩 OpenFrame CLI Migration Script"
echo "=================================="
echo ""

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v git &> /dev/null; then
    echo "❌ Error: git is not installed"
    exit 1
fi

if ! command -v git-filter-repo &> /dev/null; then
    echo "❌ Error: git-filter-repo is not installed"
    echo "Install with: brew install git-filter-repo"
    echo "Or: pip install git-filter-repo"
    exit 1
fi

if [ -d "$NEW_REPO_DIR" ]; then
    echo "❌ Error: Target directory already exists: $NEW_REPO_DIR"
    echo "Please remove it first or choose a different location"
    exit 1
fi

echo "✅ Prerequisites check passed"
echo ""

# Clone to temporary directory
echo "📦 Cloning repository to temporary location..."
git clone "$PARENT_DIR" "$TEMP_REPO_DIR"
cd "$TEMP_REPO_DIR"
echo "✅ Repository cloned"
echo ""

# Extract cli directory with history
echo "🔧 Extracting CLI directory with git history..."
git filter-repo --path cli/ --path-rename cli/: --force
echo "✅ CLI directory extracted"
echo ""

# Move .goreleaser.yml from parent if it exists
echo "📝 Setting up CLI-specific files..."
if [ -f "$PARENT_DIR/.goreleaser.yml" ]; then
    cp "$PARENT_DIR/.goreleaser.yml" .goreleaser.yml.temp
fi

# Copy the updated .goreleaser.yml from cli if it exists
if [ -f ".goreleaser.yml" ]; then
    echo "✅ GoReleaser config already in place"
else
    if [ -f ".goreleaser.yml.temp" ]; then
        mv .goreleaser.yml.temp .goreleaser.yml
        echo "✅ GoReleaser config copied"
    fi
fi

# Clean up temp file
rm -f .goreleaser.yml.temp

echo ""

# Update README for new repo
echo "📄 Creating CLI-specific README..."
cat > README.md << 'EOF'
# OpenFrame CLI

A modern CLI tool for managing OpenFrame Kubernetes clusters and development workflows.

## Installation

### From Release

Download the latest release for your platform:

```bash
# macOS (ARM64)
curl -L https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli_darwin_arm64.tar.gz | tar xz
sudo mv openframe /usr/local/bin/

# macOS (Intel)
curl -L https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli_darwin_amd64.tar.gz | tar xz
sudo mv openframe /usr/local/bin/

# Linux (AMD64)
curl -L https://github.com/flamingo-stack/openframe-cli/releases/latest/download/openframe-cli_linux_amd64.tar.gz | tar xz
sudo mv openframe /usr/local/bin/

# Windows (AMD64)
# Download from: https://github.com/flamingo-stack/openframe-cli/releases/latest
```

### From Source

```bash
git clone https://github.com/flamingo-stack/openframe-cli.git
cd openframe-cli
go build -o openframe .
```

## Quick Start

```bash
# Create a cluster
openframe cluster create

# List clusters
openframe cluster list

# Check cluster status
openframe cluster status

# Bootstrap OpenFrame on cluster
openframe bootstrap --deployment-mode=oss-tenant

# Get help
openframe --help
```

## Features

- 🎯 Interactive cluster creation with guided wizard
- ⚡ K3d cluster management for local development
- 📊 Real-time cluster status and monitoring
- 🔧 Smart system detection and configuration
- 🛠 Developer-friendly commands and clear output
- 📦 Chart installation and ArgoCD management
- 🚀 Development workflow tools (Skaffold, Telepresence)

## Documentation

For detailed documentation, see the [OpenFrame documentation](https://github.com/flamingo-stack/openframe-oss-tenant/tree/main/docs).

## Commands

### Cluster Management

- `openframe cluster create` - Create a new K3d cluster
- `openframe cluster list` - List all clusters
- `openframe cluster status` - Show cluster details
- `openframe cluster delete` - Delete a cluster
- `openframe cluster start` - Start a stopped cluster
- `openframe cluster cleanup` - Clean up cluster resources

### Chart Management

- `openframe chart install` - Install Helm charts and ArgoCD
- `openframe bootstrap` - Bootstrap full OpenFrame installation

### Development

- `openframe dev scaffold` - Run Skaffold for service development
- `openframe dev intercept` - Intercept service traffic with Telepresence

## Contributing

Contributions are welcome! Please see the [contributing guidelines](https://github.com/flamingo-stack/openframe-oss-tenant/blob/main/CONTRIBUTING.md).

## License

This project is licensed under the MIT License - see the LICENSE file for details.
EOF

echo "✅ README created"
echo ""

# Move to final location
echo "🚚 Moving to final location..."
cd "$PARENT_DIR/.."
mv "$TEMP_REPO_DIR" "$NEW_REPO_DIR"
echo "✅ Moved to: $NEW_REPO_DIR"
echo ""

# Initialize for new remote
echo "🔗 Preparing for new remote..."
cd "$NEW_REPO_DIR"
git remote remove origin 2>/dev/null || true
echo "✅ Old remote removed"
echo ""

# Summary
echo "✅ Migration Complete!"
echo ""
echo "📍 New repository location: $NEW_REPO_DIR"
echo ""
echo "Next steps:"
echo "1. Review the extracted repository"
echo "2. Create new GitHub repository: github.com/flamingo-stack/openframe-cli"
echo "3. Push to new repository:"
echo "   cd $NEW_REPO_DIR"
echo "   git remote add origin https://github.com/flamingo-stack/openframe-cli.git"
echo "   git push -u origin main"
echo ""
echo "4. Create initial release:"
echo "   git tag v0.1.0"
echo "   git push origin v0.1.0"
echo ""
