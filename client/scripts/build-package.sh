#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}Building OpenFrame...${NC}"

# Setup directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="$CLIENT_DIR/target"
PKG_DIR="$TARGET_DIR/pkg_build"
PAYLOAD_ROOT="$PKG_DIR/payload_root"
APP_DIR="$PAYLOAD_ROOT/Applications/OpenFrame.app"
APP_CONTENTS="$APP_DIR/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
LIBRARY_DIR="$PAYLOAD_ROOT/Library"
LOGS_DIR="$LIBRARY_DIR/Logs/OpenFrame"
SUPPORT_DIR="$LIBRARY_DIR/Application Support/OpenFrame"
LAUNCHDAEMONS_DIR="$LIBRARY_DIR/LaunchDaemons"
DIST_DIR="$TARGET_DIR/dist"
ASSETS_DIR="$CLIENT_DIR/assets"
PKG_ASSETS_DIR="$ASSETS_DIR/pkg"
CA_DIR="$CLIENT_DIR/../scripts/files/ca"

echo -e "${BLUE}Cleaning target directory...${NC}"
# Clean the target directory
cargo clean
rm -rf target
mkdir -p "$TARGET_DIR" "$PKG_DIR" "$DIST_DIR"
mkdir -p "$APP_MACOS" "$APP_RESOURCES"
mkdir -p "$LOGS_DIR" "$SUPPORT_DIR/run" "$LAUNCHDAEMONS_DIR"

echo -e "${BLUE}Setting up build environment...${NC}"

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    if [[ "$(uname)" == "Darwin" ]]; then
        brew install rust
    elif [[ "$(uname)" == "Linux" ]]; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
    fi
fi

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "Installing Cargo..."
    if [[ "$(uname)" == "Darwin" ]]; then
        brew install cargo
    elif [[ "$(uname)" == "Linux" ]]; then
        curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
        source $HOME/.cargo/env
    fi
fi

# Check if .NET SDK is installed
if ! command -v dotnet &> /dev/null; then
    echo "Installing .NET SDK..."
    if [[ "$(uname)" == "Darwin" ]]; then
        # Create temporary directory for downloads
        TEMP_DIR=$(mktemp -d)
        echo "Downloading .NET SDK installer..."
        curl -L "https://aka.ms/dotnet/9.0/dotnet-sdk-osx-$(uname -m).pkg" -o "$TEMP_DIR/dotnet-sdk.pkg"
        echo "Installing .NET SDK..."
        sudo installer -pkg "$TEMP_DIR/dotnet-sdk.pkg" -target /
        rm -rf "$TEMP_DIR"
    elif [[ "$(uname)" == "Linux" ]]; then
        # Download Microsoft signing key and repository
        wget https://packages.microsoft.com/config/ubuntu/$(lsb_release -rs)/packages-microsoft-prod.deb -O /tmp/packages-microsoft-prod.deb
        sudo dpkg -i /tmp/packages-microsoft-prod.deb
        rm /tmp/packages-microsoft-prod.deb
        # Install SDK
        sudo apt-get update
        sudo apt-get install -y dotnet-sdk-9.0
    fi
fi

# Check if Velopack CLI is installed
if ! command -v vpk &> /dev/null; then
    echo "Installing Velopack CLI..."
    dotnet tool install --global vpk
    export PATH="$PATH:$HOME/.dotnet/tools"
fi

# Verify .NET and vpk are working
if ! dotnet --version &> /dev/null; then
    echo -e "${RED}Error: .NET SDK installation failed${NC}"
    exit 1
fi

if ! vpk --help &> /dev/null; then
    echo -e "${RED}Error: Velopack CLI installation failed${NC}"
    exit 1
fi

# Verify required files exist
if [ ! -f "$CLIENT_DIR/config/agent.toml" ]; then
    echo -e "${RED}Error: config/agent.toml not found${NC}"
    exit 1
fi

echo -e "${BLUE}Building release version...${NC}"
cargo build --release

echo -e "${BLUE}Creating package structure...${NC}"

# Copy the binary to the app bundle
cp "$TARGET_DIR/release/openframe" "$APP_MACOS/openframe"

# Copy other necessary files into the app bundle
cp "$ASSETS_DIR/Info.plist" "$APP_CONTENTS/"
cp "$ASSETS_DIR/OpenFrame.icns" "$APP_RESOURCES/"
cp "$CLIENT_DIR/config/agent.toml" "$APP_RESOURCES/"

# Create empty log files and set permissions
touch "$LOGS_DIR/error.log" "$LOGS_DIR/output.log"
chmod 644 "$LOGS_DIR/error.log" "$LOGS_DIR/output.log"

# Copy the LaunchDaemon plist file
cp "$ASSETS_DIR/com.openframe.agent.plist" "$LAUNCHDAEMONS_DIR/"
chmod 644 "$LAUNCHDAEMONS_DIR/com.openframe.agent.plist"

# Set proper permissions
chmod 755 "$APP_MACOS/openframe"
chmod -R 755 "$SUPPORT_DIR"

echo -e "${BLUE}Signing binary with ad-hoc signature...${NC}"
codesign --force --options runtime --sign - "$APP_MACOS/openframe"

# Prepare scripts directory for installation scripts
mkdir -p "$PKG_DIR/scripts"
cp -p "$CLIENT_DIR/scripts/pkg_scripts/postinstall" "$PKG_DIR/scripts/"
cp -p "$CLIENT_DIR/scripts/pkg_scripts/preinstall" "$PKG_DIR/scripts/"
cp -p "$CLIENT_DIR/scripts/pkg_scripts/uninstall.sh" "$PKG_DIR/scripts/"

echo -e "${BLUE}Creating component packages with pkgbuild...${NC}"

# Create a component package for the Applications directory
pkgbuild --root "$PAYLOAD_ROOT/Applications" \
         --identifier "com.openframe.app" \
         --install-location "/Applications" \
         --scripts "$PKG_DIR/scripts" \
         --ownership recommended \
         "$PKG_DIR/app.pkg"

# Create a component package for the Library directory
pkgbuild --root "$PAYLOAD_ROOT/Library" \
         --identifier "com.openframe.library" \
         --install-location "/Library" \
         --ownership recommended \
         "$PKG_DIR/library.pkg"

# Copy component packages to the dist directory
cp "$PKG_DIR/app.pkg" "$DIST_DIR/"
cp "$PKG_DIR/library.pkg" "$DIST_DIR/"

echo -e "${BLUE}Creating final package with productbuild...${NC}"

# Copy package resources to build directory
mkdir -p "$PKG_DIR/Resources"
cp "$PKG_ASSETS_DIR/welcome.txt" "$PKG_DIR/Resources/"
cp "$PKG_ASSETS_DIR/conclusion.txt" "$PKG_DIR/Resources/"

# Build the final distribution package without signing
productbuild --distribution "$PKG_ASSETS_DIR/distribution.xml" \
             --resources "$PKG_DIR/Resources" \
             --package-path "$DIST_DIR" \
             --version "1.0.0" \
             "$DIST_DIR/com.openframe-osx-Setup.pkg"

echo -e "${GREEN}Package created successfully at $DIST_DIR/com.openframe-osx-Setup.pkg${NC}"
echo -e "To install, run: sudo installer -pkg $DIST_DIR/com.openframe-osx-Setup.pkg -target / -allowUntrusted" 