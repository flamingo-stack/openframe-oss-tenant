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
PAYLOAD_ROOT="$PACKAGE_ROOT/payload"
APP_NAME="OpenFrame"
APP_BUNDLE="$APP_NAME.app"
APP_CONTENTS="$PAYLOAD_ROOT/Applications/$APP_BUNDLE/Contents"
APP_MACOS="$APP_CONTENTS/MacOS"
APP_RESOURCES="$APP_CONTENTS/Resources"
LAUNCHDAEMONS_DIR="$PAYLOAD_ROOT/Library/LaunchDaemons"
LOGS_DIR="$PAYLOAD_ROOT/Library/Logs/OpenFrame"
APP_SUPPORT_DIR="$PAYLOAD_ROOT/Library/Application Support/OpenFrame"

echo -e "${BLUE}Creating package structure...${NC}"
mkdir -p "$APP_MACOS" "$APP_RESOURCES" "$LAUNCHDAEMONS_DIR" "$LOGS_DIR" "$APP_SUPPORT_DIR/run"

# Copy files
cp "target/release/openframe" "$APP_MACOS/openframe"
cp "assets/Info.plist" "$APP_CONTENTS/"
cp "assets/OpenFrame.icns" "$APP_RESOURCES/"
cp "config/agent.toml" "$APP_RESOURCES/"
cp "assets/com.openframe.agent.plist" "$LAUNCHDAEMONS_DIR/"

# Set permissions
chmod 755 "$APP_MACOS/openframe"
chmod 644 "$LAUNCHDAEMONS_DIR/com.openframe.agent.plist"
chmod -R 755 "$LOGS_DIR"
chmod -R 755 "$APP_SUPPORT_DIR"

# Create empty log files
touch "$LOGS_DIR/error.log" 
touch "$LOGS_DIR/output.log"
chmod 644 "$LOGS_DIR/error.log" "$LOGS_DIR/output.log"

# Create and use a self-signed certificate
echo -e "${BLUE}Setting up code signing certificate...${NC}"
CERT_NAME="OpenFrameDeveloper"
CERT_PATH="$PACKAGE_ROOT/certificate.p12"
KEYCHAIN_PATH="$HOME/Library/Keychains/login.keychain-db"
PASSWORD="openframe123"  # Use a more secure password in production

# Check if certificate already exists in the keychain
if ! security find-certificate -c "$CERT_NAME" "$KEYCHAIN_PATH" &>/dev/null; then
    echo -e "Creating self-signed certificate..."
    
    # Create temporary directory for certificate creation
    CERT_TMP=$(mktemp -d)
    pushd "$CERT_TMP" > /dev/null
    
    # Generate a private key and certificate signing request
    openssl genrsa -out private.key 2048
    openssl req -new -key private.key -out request.csr -subj "/CN=$CERT_NAME/O=OpenFrame/C=US"
    
    # Create a self-signed certificate
    openssl x509 -req -days 365 -in request.csr -signkey private.key -out certificate.crt
    
    # Convert to p12 format for keychain import
    openssl pkcs12 -export -out "$CERT_PATH" -inkey private.key -in certificate.crt -passout pass:"$PASSWORD"
    
    # Import into keychain
    security import "$CERT_PATH" -k "$KEYCHAIN_PATH" -P "$PASSWORD" -T /usr/bin/codesign -T /usr/bin/pkgbuild
    
    # Trust the certificate
    CERT_HASH=$(security find-certificate -c "$CERT_NAME" -Z "$KEYCHAIN_PATH" | grep ^SHA-1 | cut -d: -f2- | tr -d ' ')
    security add-trusted-cert -d -k "$KEYCHAIN_PATH" certificate.crt
    
    popd > /dev/null
    rm -rf "$CERT_TMP"
    
    echo -e "${GREEN}Certificate created and installed successfully!${NC}"
else
    echo -e "Certificate already exists, using existing certificate."
fi

# Use ad-hoc signing for now (this is more reliable)
echo -e "${BLUE}Signing binary...${NC}"
codesign --force --sign - --entitlements "assets/openframe.entitlements" --options runtime "$APP_MACOS/openframe"

# Create the final installer package
echo -e "${BLUE}Creating installer package...${NC}"
mkdir -p "target/releases"

# Build the package without signing (more reliable)
echo -e "${BLUE}Building package...${NC}"
pkgbuild --root "$PAYLOAD_ROOT" \
         --identifier "com.openframe" \
         --version "1.0.0" \
         --install-location "/" \
         --scripts "scripts/pkg_scripts" \
         --ownership recommended \
         "target/releases/com.openframe-osx-Setup.pkg"

echo -e "${GREEN}Package created successfully!${NC}"
echo -e "Package location: target/releases/com.openframe-osx-Setup.pkg"
echo -e "\nTo install, run:"
echo -e "sudo installer -pkg target/releases/com.openframe-osx-Setup.pkg -target / -allowUntrusted" 