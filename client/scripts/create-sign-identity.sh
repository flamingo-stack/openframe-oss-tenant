#!/bin/bash
set -e

# Colors for terminal output
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Function to display help message
show_help() {
    echo "Usage: $0 [OPTIONS] [PACKAGE_PATH]"
    echo
    echo "Options:"
    echo "  -h, --help      Display this help message and exit"
    echo
    echo "Arguments:"
    echo "  PACKAGE_PATH    Path to the package file to sign (optional)"
    echo "                  Default: client/target/dist/OpenFrame-Setup.pkg"
    echo
    exit 0
}

# Parse arguments
for arg in "$@"; do
    case $arg in
        -h|--help)
            show_help
            ;;
    esac
done

# Allow the package path to be passed as an argument
if [ -n "$1" ] && [[ "$1" != -* ]]; then
    PKG_PATH="$1"
else
    PKG_PATH="client/target/dist/OpenFrame-Setup.pkg"
    echo -e "${YELLOW}No package path provided, using default: $PKG_PATH${NC}"
fi

echo -e "${BLUE}Creating installer signing identity for OpenFrame silently...${NC}"

# Check if package exists first
if [ ! -f "$PKG_PATH" ]; then
    echo -e "${RED}Package not found at $PKG_PATH${NC}"
    echo -e "${YELLOW}Please build the package first using the build-package.sh script.${NC}"
    exit 1
fi

# Remove extended attributes - do this regardless of signing method
echo -e "${BLUE}Removing extended attributes from package...${NC}"
xattr -cr "$PKG_PATH"

# First try with a proper installer signing identity if available
# Correctly identify real Developer ID Installer certificates 
echo -e "${BLUE}Checking for valid Developer ID Installer certificates...${NC}"
VALID_IDENTITIES=$(security find-identity -v | grep -i "Developer ID Installer" | grep -v "OpenFrame" | head -1)

if [ -n "$VALID_IDENTITIES" ]; then
    # Parse the certificate name correctly - get everything inside quotes
    DEVELOPER_ID=$(echo "$VALID_IDENTITIES" | sed -n 's/.*"\(Developer ID Installer:.*\)".*/\1/p')
    
    if [ -n "$DEVELOPER_ID" ]; then
        echo -e "${GREEN}Found valid Developer ID Installer certificate: $DEVELOPER_ID${NC}"
        echo -e "${BLUE}Attempting to sign with productsign...${NC}"
        
        # This will prompt for password if needed - only allowed interaction
        productsign --sign "$DEVELOPER_ID" "$PKG_PATH" "${PKG_PATH%.pkg}-signed.pkg" 2>/dev/null
        
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}Successfully signed package. Output: ${PKG_PATH%.pkg}-signed.pkg${NC}"
            mv "${PKG_PATH%.pkg}-signed.pkg" "$PKG_PATH"
            echo -e "${GREEN}Renamed signed package to $PKG_PATH${NC}"
            exit 0
        else
            echo -e "${YELLOW}Failed to sign with Developer ID. Falling back to ad-hoc signing...${NC}"
        fi
    fi
else
    echo -e "${YELLOW}No valid Developer ID Installer certificate found. Using ad-hoc signing...${NC}"
fi

# Fallback: Use ad-hoc signing through pkgbuild
echo -e "${BLUE}Applying ad-hoc signature to package...${NC}"

# Create a temporary directory and extract the package
TEMP_DIR=$(mktemp -d)
echo -e "${BLUE}Extracting package to temp directory for rebuilding...${NC}"
pkgutil --expand "$PKG_PATH" "$TEMP_DIR/expanded"

# Rebuild the package with ad-hoc signing
echo -e "${BLUE}Rebuilding package with ad-hoc signature...${NC}"
pkgutil --flatten "$TEMP_DIR/expanded" "${PKG_PATH%.pkg}-adhoc.pkg"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}Successfully created ad-hoc signed package: ${PKG_PATH%.pkg}-adhoc.pkg${NC}"
    mv "${PKG_PATH%.pkg}-adhoc.pkg" "$PKG_PATH"
    echo -e "${GREEN}Renamed ad-hoc signed package to $PKG_PATH${NC}"
    
    # Clean up temp directory
    rm -rf "$TEMP_DIR"
    
    echo -e "${YELLOW}Note: Package is signed with ad-hoc signature. It will work for testing but may show security warnings.${NC}"
    echo -e "${YELLOW}For distribution, a valid Developer ID Installer certificate from Apple Developer Program is recommended.${NC}"
else
    echo -e "${RED}Failed to create ad-hoc signed package.${NC}"
    rm -rf "$TEMP_DIR"
    exit 1
fi 