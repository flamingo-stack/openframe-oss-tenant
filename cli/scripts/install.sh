#!/bin/bash

# OpenFrame CLI Installation Script
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
BINARY_NAME="openframe"
INSTALL_DIR="/usr/local/bin"
REPO_URL="https://github.com/your-org/openframe"
LATEST_RELEASE_URL="https://api.github.com/repos/your-org/openframe/releases/latest"

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect OS and architecture
detect_platform() {
    OS=$(uname -s | tr '[:upper:]' '[:lower:]')
    ARCH=$(uname -m)
    
    case $ARCH in
        x86_64) ARCH="amd64" ;;
        aarch64|arm64) ARCH="arm64" ;;
        *) print_error "Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    
    case $OS in
        linux) OS="linux" ;;
        darwin) OS="darwin" ;;
        *) print_error "Unsupported OS: $OS"; exit 1 ;;
    esac
    
    echo "${OS}-${ARCH}"
}

# Function to check if binary exists
check_existing() {
    if command -v $BINARY_NAME >/dev/null 2>&1; then
        CURRENT_VERSION=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
        print_warning "$BINARY_NAME is already installed: $CURRENT_VERSION"
        read -p "Do you want to continue with installation? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            print_status "Installation cancelled"
            exit 0
        fi
    fi
}

# Function to download binary
download_binary() {
    local platform=$1
    local version=$2
    
    print_status "Downloading $BINARY_NAME version $version for $platform..."
    
    # Create temporary directory
    TEMP_DIR=$(mktemp -d)
    trap "rm -rf $TEMP_DIR" EXIT
    
    # Download URL (adjust based on your release structure)
    DOWNLOAD_URL="$REPO_URL/releases/download/v$version/${BINARY_NAME}-${platform}"
    
    # Download binary
    if curl -L -o "$TEMP_DIR/$BINARY_NAME" "$DOWNLOAD_URL"; then
        chmod +x "$TEMP_DIR/$BINARY_NAME"
        print_success "Download completed"
    else
        print_error "Failed to download binary"
        exit 1
    fi
    
    # Install binary
    if sudo cp "$TEMP_DIR/$BINARY_NAME" "$INSTALL_DIR/"; then
        print_success "Installed to $INSTALL_DIR/$BINARY_NAME"
    else
        print_error "Failed to install binary"
        exit 1
    fi
}

# Function to build from source
build_from_source() {
    print_status "Building from source..."
    
    # Check if Go is installed
    if ! command -v go >/dev/null 2>&1; then
        print_error "Go is not installed. Please install Go 1.21 or later"
        exit 1
    fi
    
    # Check Go version
    GO_VERSION=$(go version | awk '{print $3}' | sed 's/go//')
    REQUIRED_VERSION="1.21"
    
    if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$GO_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
        print_error "Go version $GO_VERSION is too old. Required: $REQUIRED_VERSION or later"
        exit 1
    fi
    
    # Build binary
    if make build; then
        if sudo cp "$BINARY_NAME" "$INSTALL_DIR/"; then
            print_success "Built and installed to $INSTALL_DIR/$BINARY_NAME"
        else
            print_error "Failed to install binary"
            exit 1
        fi
    else
        print_error "Build failed"
        exit 1
    fi
}

# Function to get latest version
get_latest_version() {
    if command -v curl >/dev/null 2>&1; then
        VERSION=$(curl -s "$LATEST_RELEASE_URL" | grep '"tag_name"' | cut -d'"' -f4 | sed 's/v//')
        if [ -z "$VERSION" ]; then
            VERSION="latest"
        fi
    else
        VERSION="latest"
    fi
    echo "$VERSION"
}

# Main installation function
main() {
    print_status "OpenFrame CLI Installation"
    print_status "=========================="
    
    # Check if running as root
    if [ "$EUID" -eq 0 ]; then
        print_error "Please don't run this script as root"
        exit 1
    fi
    
    # Check for sudo
    if ! command -v sudo >/dev/null 2>&1; then
        print_error "sudo is required but not installed"
        exit 1
    fi
    
    # Detect platform
    PLATFORM=$(detect_platform)
    print_status "Detected platform: $PLATFORM"
    
    # Check for existing installation
    check_existing
    
    # Parse command line arguments
    BUILD_FROM_SOURCE=false
    VERSION=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            --build)
                BUILD_FROM_SOURCE=true
                shift
                ;;
            --version)
                VERSION="$2"
                shift 2
                ;;
            --help)
                echo "Usage: $0 [OPTIONS]"
                echo "Options:"
                echo "  --build              Build from source instead of downloading"
                echo "  --version VERSION    Install specific version (default: latest)"
                echo "  --help               Show this help message"
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                exit 1
                ;;
        esac
    done
    
    # Get version if not specified
    if [ -z "$VERSION" ]; then
        VERSION=$(get_latest_version)
    fi
    
    print_status "Installing version: $VERSION"
    
    # Install based on method
    if [ "$BUILD_FROM_SOURCE" = true ]; then
        build_from_source
    else
        download_binary "$PLATFORM" "$VERSION"
    fi
    
    # Verify installation
    if command -v $BINARY_NAME >/dev/null 2>&1; then
        INSTALLED_VERSION=$($BINARY_NAME --version 2>/dev/null || echo "unknown")
        print_success "Installation completed successfully!"
        print_status "Installed version: $INSTALLED_VERSION"
        print_status "Run '$BINARY_NAME --help' to get started"
    else
        print_error "Installation verification failed"
        exit 1
    fi
}

# Run main function
main "$@" 