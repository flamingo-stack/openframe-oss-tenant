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

echo -e "${BLUE}Building OpenFrame Agent...${NC}"

echo -e "${BLUE}Cleaning target directory...${NC}"
# Clean the target directory
cargo clean
rm -rf target

echo -e "${BLUE}Setting up build environment...${NC}"

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    brew install rust
fi

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "Installing Cargo..."
    brew install cargo
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

# Create temporary directory for packaging
PACK_DIR=$(mktemp -d)
mkdir -p "$PACK_DIR"

echo -e "${BLUE}Preparing package directory...${NC}"
# Copy binary and config
cp target/release/openframe-agent "$PACK_DIR/"
cp -r config "$PACK_DIR/"

# Sign the binary before packaging
if [[ "$(uname)" == "Darwin" ]]; then
    echo -e "${BLUE}Signing binary...${NC}"
    codesign --force --deep --sign - --entitlements assets/openframe.entitlements --options runtime "$PACK_DIR/openframe-agent"
fi

echo -e "${BLUE}Creating Velopack package...${NC}"

# Platform-specific settings
if [[ "$(uname)" == "Darwin" ]]; then
    PLATFORM_ARGS=(
        "--channel" "osx"
        "--icon" "assets/openframe.icns"
        "--plist" "assets/Info.plist"
    )
elif [[ "$(uname)" == "Linux" ]]; then
    PLATFORM_ARGS=(
        "--channel" "linux"
        "--icon" "assets/openframe.png"
    )
fi

# Use expanded Velopack CLI arguments
vpk pack \
    --packId "com.openframe.agent" \
    --packVersion "0.1.0" \
    --packDir "$PACK_DIR" \
    --outputDir "target/releases" \
    --mainExe "openframe-agent" \
    --packTitle "OpenFrame Agent" \
    --packAuthors "Flamingo AI, Inc." \
    --delta "BestSpeed" \
    --exclude ".*\.(pdb|log|tmp)$" \
    "${PLATFORM_ARGS[@]}" \
    --signEntitlements "assets/openframe.entitlements" || {
        echo -e "${RED}Error: Failed to create Velopack package${NC}"
        rm -rf "$PACK_DIR"
        exit 1
    }

# Sign the app bundle after creation on macOS
if [[ "$(uname)" == "Darwin" ]]; then
    echo -e "${BLUE}Signing app bundle...${NC}"
    codesign --force --deep --sign - --entitlements assets/openframe.entitlements --options runtime "target/releases/OpenFrame\ Agent.app"
fi

# Clean up
rm -rf "$PACK_DIR"

echo -e "${GREEN}Package created successfully!${NC}"
echo -e "Package location: target/releases"

# Instructions
echo -e "\n${BLUE}Installation options:${NC}"
echo "1. Using Velopack (recommended):"
echo "   vpk install target/releases/openframe-agent-latest.nupkg"
echo "2. Using portable package:"
echo "   Extract openframe-agent-osx-Portable.zip and run the app" 