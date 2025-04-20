#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Setting up build environment...${NC}"

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Cargo is not installed. Please install Rust first: https://rustup.rs${NC}"
    exit 1
fi

# Check if Velopack CLI is installed
if ! command -v vpk &> /dev/null; then
    echo "Velopack CLI not found, installing..."
    # Download and install Velopack CLI
    VELOPACK_VERSION="0.0.1053"
    curl -L -o vpk.tar.gz "https://github.com/velopack/velopack/releases/download/v${VELOPACK_VERSION}/vpk-osx-x64.tar.gz"
    tar xzf vpk.tar.gz
    chmod +x vpk
    sudo mv vpk /usr/local/bin/
    rm vpk.tar.gz
fi

echo -e "${BLUE}Building OpenFrame Agent package...${NC}"

# Build the release version
echo -e "${BLUE}Building release version...${NC}"
cd "$(dirname "$0")/.."
cargo build --release

# Create package directory structure
echo -e "${BLUE}Creating package structure...${NC}"
PACKAGE_DIR="target/package"
rm -rf "$PACKAGE_DIR"
mkdir -p "$PACKAGE_DIR/bin"
mkdir -p "$PACKAGE_DIR/config"

# Copy files
echo -e "${BLUE}Copying files...${NC}"
if [[ "$(uname -s)" == MINGW* ]] || [[ "$(uname -s)" == CYGWIN* ]] || [[ "$(uname -s)" == MSYS* ]]; then
    cp "target/release/openframe-agent.exe" "$PACKAGE_DIR/bin/"
else
    cp "target/release/openframe-agent" "$PACKAGE_DIR/bin/"
fi
cp "config/agent.toml" "$PACKAGE_DIR/config/"
cp "scripts/pre-update.sh" "$PACKAGE_DIR/"
cp "scripts/post-update.sh" "$PACKAGE_DIR/"
cp "velopack.json" "$PACKAGE_DIR/"

# Create version file
VERSION=$(grep '^version = ' Cargo.toml | cut -d '"' -f2)
echo "$VERSION" > "$PACKAGE_DIR/version"

# Create Velopack package
echo -e "${BLUE}Creating Velopack package...${NC}"
vpk pack \
    --name "openframe-agent" \
    --version "$VERSION" \
    --package-dir "$PACKAGE_DIR" \
    --output-dir "target/releases"

# Create archive for manual installation
echo -e "${BLUE}Creating installation archive...${NC}"
ARCHIVE_NAME="openframe-agent-$VERSION-$(uname -s)-$(uname -m).tar.gz"
cd target
tar -czf "$ARCHIVE_NAME" -C package .

echo -e "${GREEN}Package created successfully!${NC}"
echo -e "Velopack package location: target/releases"
echo -e "Installation archive location: target/$ARCHIVE_NAME"

# Instructions
echo -e "\n${BLUE}To install the package:${NC}"
echo "1. Using Velopack (recommended):"
echo "   vpk install target/releases/openframe-agent-$VERSION.nupkg"
echo -e "\n2. Manual installation:"
echo "   tar -xzf $ARCHIVE_NAME"
echo "   sudo ./install.sh" 