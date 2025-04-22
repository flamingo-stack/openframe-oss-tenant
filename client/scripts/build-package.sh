#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Set up directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$AGENT_DIR"

echo -e "${BLUE}Building OpenFrame...${NC}"

echo -e "${BLUE}Cleaning target directory...${NC}"
# Clean the target directory
cargo clean
rm -rf target

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
if [ ! -f "config/agent.toml" ]; then
    echo -e "${RED}Error: config/agent.toml not found${NC}"
    exit 1
fi

echo -e "${BLUE}Building release version...${NC}"
cargo build --release

# Create the package structure
PACKAGE_ROOT="target/package_root"
APP_NAME="OpenFrame"
APP_BUNDLE="$APP_NAME.app"
APP_CONTENTS="$PACKAGE_ROOT/Applications/$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
LAUNCHDAEMONS_DIR="$PACKAGE_ROOT/Library/LaunchDaemons"
LOGS_DIR="$PACKAGE_ROOT/Library/Logs/OpenFrame"
APP_SUPPORT_DIR="$PACKAGE_ROOT/Library/Application Support/OpenFrame"

echo -e "${BLUE}Creating package structure...${NC}"
mkdir -p "$APP_MACOS" "$APP_RESOURCES" "$LAUNCHDAEMONS_DIR" "$LOGS_DIR" "$APP_SUPPORT_DIR"

# Copy files
cp "target/release/openframe" "$APP_MACOS/openframe"
cp "assets/Info.plist" "$APP_CONTENTS/"
cp "assets/OpenFrame.icns" "$APP_RESOURCES/"
cp "config/agent.toml" "$APP_RESOURCES/"
cp "assets/com.openframe.agent.plist" "$LAUNCHDAEMONS_DIR/"

# Set permissions
chmod 755 "$APP_MACOS/openframe"
chmod 644 "$LAUNCHDAEMONS_DIR/com.openframe.agent.plist"
chmod 755 "$LOGS_DIR"
chmod 755 "$APP_SUPPORT_DIR"

# Sign the binary with ad-hoc signing and entitlements
echo -e "${BLUE}Signing binary...${NC}"
codesign --force --sign - --entitlements "assets/openframe.entitlements" --options runtime "$APP_MACOS/openframe"

# Create the package
echo -e "${BLUE}Creating installer package...${NC}"
mkdir -p "target/releases"
pkgbuild --root "$PACKAGE_ROOT" \
         --identifier "com.openframe" \
         --version "1.0.0" \
         --install-location "/" \
         --scripts "scripts/pkg_scripts" \
         "target/releases/com.openframe-osx-Setup.pkg"

echo -e "${GREEN}Package created successfully!${NC}"
echo -e "Package location: target/releases/com.openframe-osx-Setup.pkg"
echo -e "\nTo install, run:"
echo -e "sudo installer -pkg target/releases/com.openframe-osx-Setup.pkg -target /" 