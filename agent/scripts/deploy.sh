#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Configuration
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
AGENT_DIR="$(dirname "$SCRIPT_DIR")"
AGENT_VERSION=$(grep '^version = ' "$AGENT_DIR/Cargo.toml" | cut -d '"' -f2)
BUILD_TYPE=${1:-release}  # Default to release build
TARGET_DIR="$AGENT_DIR/target"
PACKAGE_DIR="$TARGET_DIR/package"
DEPLOY_DIR="$TARGET_DIR/deploy"

echo -e "${BLUE}Starting OpenFrame Agent deployment process...${NC}"
echo -e "Version: $AGENT_VERSION"
echo -e "Build type: $BUILD_TYPE"

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo -e "${RED}Error: cargo is not installed${NC}"
    echo "Installing Rust and Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    
    # Source the cargo environment based on shell type
    if [ -n "$ZSH_VERSION" ]; then
        source "$HOME/.cargo/env"
    elif [ -n "$BASH_VERSION" ]; then
        . "$HOME/.cargo/env"
    elif [ -n "$FISH_VERSION" ]; then
        source "$HOME/.cargo/env.fish"
    else
        echo -e "${RED}Please restart your shell or manually source cargo environment${NC}"
        exit 1
    fi
fi

# Create necessary directories
mkdir -p "$PACKAGE_DIR"
mkdir -p "$DEPLOY_DIR"

# Build the agent
echo -e "${BLUE}Building agent...${NC}"
cd "$AGENT_DIR"
if [ "$BUILD_TYPE" = "release" ]; then
    cargo build --release
    BINARY_PATH="$TARGET_DIR/release/openframe-agent"
else
    cargo build
    BINARY_PATH="$TARGET_DIR/debug/openframe-agent"
fi

# Copy binary and configuration
echo -e "${BLUE}Packaging agent...${NC}"
cp "$BINARY_PATH" "$PACKAGE_DIR/"
cp "$AGENT_DIR/config/agent.toml" "$PACKAGE_DIR/" 2>/dev/null || echo "No config file found, using defaults"

# Copy installation script
cp "$SCRIPT_DIR/install.sh" "$PACKAGE_DIR/"
chmod +x "$PACKAGE_DIR/install.sh"

# Create package manifest
cat > "$PACKAGE_DIR/manifest.json" << EOF
{
    "version": "$AGENT_VERSION",
    "buildType": "$BUILD_TYPE",
    "timestamp": "$(date -u +"%Y-%m-%dT%H:%M:%SZ")",
    "platform": "$(uname -s)",
    "architecture": "$(uname -m)"
}
EOF

# Create deployment package
echo -e "${BLUE}Creating deployment package...${NC}"
DEPLOY_PACKAGE="$DEPLOY_DIR/openframe-agent-$AGENT_VERSION-$(uname -s)-$(uname -m).tar.gz"
tar -czf "$DEPLOY_PACKAGE" -C "$PACKAGE_DIR" .

# Cleanup
rm -rf "$PACKAGE_DIR"

echo -e "${GREEN}Deployment package created successfully!${NC}"
echo -e "Package location: $DEPLOY_PACKAGE"

# Installation instructions
echo -e "\n${BLUE}Installation instructions:${NC}"
echo -e "1. Extract the package: tar -xzf $(basename "$DEPLOY_PACKAGE")"
echo -e "2. Run the installation script: ./install.sh"
echo -e "3. Start the agent: systemctl start openframe-agent (Linux) or net start OpenFrameAgent (Windows)\n" 