#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Parse arguments
FORCE_DEV_MODE=0

for arg in "$@"; do
  case $arg in
    --dev)
      FORCE_DEV_MODE=1
      shift
      ;;
  esac
done

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
if [ -d "$TARGET_DIR" ]; then
    # Use sudo to clean up any files with permission issues
    sudo rm -rf "$TARGET_DIR"
fi
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

# Also copy the agent.toml file to the Application Support directory
echo -e "${BLUE}Copying configuration file to Application Support directory...${NC}"
# Generate a unique agent ID using UUID
AGENT_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo -e "${BLUE}Setting default agent ID to $AGENT_UUID...${NC}"

# Create a temporary copy with the updated agent ID
TMP_CONFIG=$(mktemp)
cat "$CLIENT_DIR/config/agent.toml" | sed "s/id = \"\"/id = \"$AGENT_UUID\"/" > "$TMP_CONFIG"

# Also ensure debug logging is enabled for initial deployment
echo "Setting debug logging in agent configuration..."
sed -i '' 's/log_level = "info"/log_level = "debug"/' "$TMP_CONFIG"

# Ensure log path is explicitly set
if ! grep -q "log_path" "$TMP_CONFIG"; then
    echo "Adding explicit log path to configuration..."
    sed -i '' '/\[logging\]/a\\
log_path = "/Library/Logs/OpenFrame"  # Explicit log path for macOS' "$TMP_CONFIG"
fi

# Copy the modified config to both locations
cp "$TMP_CONFIG" "$APP_RESOURCES/agent.toml"
cp "$TMP_CONFIG" "$SUPPORT_DIR/agent.toml"
rm "$TMP_CONFIG"

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

# Ensure installation scripts are executable
chmod 755 "$PKG_DIR/scripts/postinstall"
chmod 755 "$PKG_DIR/scripts/preinstall"
chmod 755 "$PKG_DIR/scripts/uninstall.sh"

echo -e "${BLUE}Creating component packages...${NC}"

# Create a component package for the Applications directory (no sign parameter - ad-hoc)
echo -e "${BLUE}Creating app component package...${NC}"

# First analyze the bundle to get component info
echo -e "${BLUE}Analyzing app bundle...${NC}"
pkgbuild --analyze --root "$PAYLOAD_ROOT/Applications" "$PKG_DIR/app.plist"

# Modify the BundleIsRelocatable property in the plist
if [ -f "$PKG_DIR/app.plist" ]; then
    echo -e "${BLUE}Setting BundleIsRelocatable to NO in component plist...${NC}"
    /usr/libexec/PlistBuddy -c "Set :0:BundleIsRelocatable NO" "$PKG_DIR/app.plist"
fi

# Build the package with the modified plist
pkgbuild --root "$PAYLOAD_ROOT/Applications" \
         --identifier "com.openframe.app" \
         --install-location "/Applications" \
         --scripts "$PKG_DIR/scripts" \
         --ownership recommended \
         --component-plist "$PKG_DIR/app.plist" \
         "$PKG_DIR/app.pkg"

# Sign the app component package
echo -e "${BLUE}Signing app component package...${NC}"
"$SCRIPT_DIR/create-sign-identity.sh" "$PKG_DIR/app.pkg"

# Create a component package for the Library directory (no sign parameter - ad-hoc)
echo -e "${BLUE}Creating library component package...${NC}"
pkgbuild --root "$PAYLOAD_ROOT/Library" \
         --identifier "com.openframe.library" \
         --install-location "/Library" \
         --ownership recommended \
         "$PKG_DIR/library.pkg"

# Sign the library component package
echo -e "${BLUE}Signing library component package...${NC}"
"$SCRIPT_DIR/create-sign-identity.sh" "$PKG_DIR/library.pkg"

# Copy component packages to the dist directory
cp "$PKG_DIR/app.pkg" "$DIST_DIR/"
cp "$PKG_DIR/library.pkg" "$DIST_DIR/"

echo -e "${BLUE}Creating final package with productbuild...${NC}"

# Copy package resources to build directory
mkdir -p "$PKG_DIR/Resources"
cp "$PKG_ASSETS_DIR/welcome.txt" "$PKG_DIR/Resources/"
cp "$PKG_ASSETS_DIR/conclusion.txt" "$PKG_DIR/Resources/"

# Build the final package (unsigned)
echo -e "${BLUE}Creating final package...${NC}"
productbuild --distribution "$PKG_ASSETS_DIR/distribution.xml" \
            --resources "$PKG_DIR/Resources" \
            --package-path "$DIST_DIR" \
            --version "1.0.0" \
            "$DIST_DIR/OpenFrame-Setup.pkg"

# Use our improved create-sign-identity.sh script to handle signing
if [ -f "$SCRIPT_DIR/create-sign-identity.sh" ]; then
    echo -e "${BLUE}Running certificate creation and signing script...${NC}"
    chmod +x "$SCRIPT_DIR/create-sign-identity.sh"
    "$SCRIPT_DIR/create-sign-identity.sh" "$DIST_DIR/OpenFrame-Setup.pkg"
    
    # Check exit status of signing
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}Package signed successfully at $DIST_DIR/OpenFrame-Setup.pkg${NC}"
        echo -e "To install, run: sudo installer -pkg $DIST_DIR/OpenFrame-Setup.pkg -target /"
    else
        echo -e "${YELLOW}Warning: Package may be ad-hoc signed. May require --allowUntrusted for installation.${NC}"
        echo -e "${GREEN}Package created at $DIST_DIR/OpenFrame-Setup.pkg${NC}"
        echo -e "To install, run: sudo installer -pkg $DIST_DIR/OpenFrame-Setup.pkg -target / -allowUntrusted"
    fi
else
    echo -e "${YELLOW}Warning: Package is unsigned. Requires --allowUntrusted for installation.${NC}"
    echo -e "${GREEN}Package created at $DIST_DIR/OpenFrame-Setup.pkg${NC}"
    echo -e "To install, run: sudo installer -pkg $DIST_DIR/OpenFrame-Setup.pkg -target / -allowUntrusted"
fi 