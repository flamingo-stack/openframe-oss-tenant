#!/bin/bash
# Cross-platform refactoring check script
# This script analyzes the codebase to find platform-specific code and 
# checks progress on the cross-platform refactoring.

set -e

# Color constants
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Get the script's directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=====================================================${NC}"
echo -e "${BLUE}       OpenFrame Cross-Platform Cleanup Check         ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Count platform-specific conditional compilation blocks
echo -e "\n${BLUE}Platform-Specific Code Analysis${NC}"
echo -e "${BLUE}---------------------------------${NC}"

WINDOWS_COUNT=$(grep -r "#\[cfg(target_os = \"windows\")\]" --include="*.rs" $CLIENT_DIR | wc -l)
MACOS_COUNT=$(grep -r "#\[cfg(target_os = \"macos\")\]" --include="*.rs" $CLIENT_DIR | wc -l)
LINUX_COUNT=$(grep -r "#\[cfg(target_os = \"linux\")\]" --include="*.rs" $CLIENT_DIR | wc -l)
UNIX_COUNT=$(grep -r "#\[cfg(unix)\]" --include="*.rs" $CLIENT_DIR | wc -l)
NOT_MACOS_COUNT=$(grep -r "#\[cfg(all(unix, not(target_os = \"macos\")))\]" --include="*.rs" $CLIENT_DIR | wc -l)
NOT_WINDOWS_COUNT=$(grep -r "#\[cfg(not(target_os = \"windows\")))\]" --include="*.rs" $CLIENT_DIR | wc -l)

echo -e "Windows-specific blocks:       ${YELLOW}$WINDOWS_COUNT${NC}"
echo -e "macOS-specific blocks:         ${YELLOW}$MACOS_COUNT${NC}"
echo -e "Linux-specific blocks:         ${YELLOW}$LINUX_COUNT${NC}"
echo -e "Unix-common blocks:            ${YELLOW}$UNIX_COUNT${NC}"
echo -e "Non-macOS Unix blocks:         ${YELLOW}$NOT_MACOS_COUNT${NC}"
echo -e "Non-Windows blocks:            ${YELLOW}$NOT_WINDOWS_COUNT${NC}"

TOTAL_PLATFORM_SPECIFIC=$(($WINDOWS_COUNT + $MACOS_COUNT + $LINUX_COUNT + $UNIX_COUNT + $NOT_MACOS_COUNT + $NOT_WINDOWS_COUNT))
echo -e "Total platform-specific code:  ${RED}$TOTAL_PLATFORM_SPECIFIC${NC}"

# Service management check
echo -e "\n${BLUE}Service Management Implementation${NC}"
echo -e "${BLUE}----------------------------------${NC}"

if grep -q "CrossPlatformServiceManager" $CLIENT_DIR/src/service_adapter.rs; then
    echo -e "CrossPlatformServiceManager:     ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "CrossPlatformServiceManager:     ${RED}MISSING${NC}"
fi

if grep -q "service_manager" $CLIENT_DIR/Cargo.toml; then
    echo -e "service-manager dependency:      ${GREEN}ADDED${NC}"
else
    echo -e "service-manager dependency:      ${RED}MISSING${NC}"
fi

# Platform-specific install scripts check
echo -e "\n${BLUE}Platform-Specific Install Scripts${NC}"
echo -e "${BLUE}--------------------------------${NC}"

# Check for Windows scripts
if [ -f "$CLIENT_DIR/scripts/win/build-package-windows.ps1" ]; then
    echo -e "Windows build script:            ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "Windows build script:            ${RED}MISSING${NC}"
fi

# Check for Linux scripts
if [ -f "$CLIENT_DIR/scripts/nix/build-package-linux.sh" ]; then
    echo -e "Linux build script:              ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "Linux build script:              ${RED}MISSING${NC}"
fi

# Check for macOS scripts
if [ -f "$CLIENT_DIR/scripts/mac/build-package.sh" ]; then
    echo -e "macOS build script:              ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "macOS build script:              ${RED}MISSING${NC}"
fi

# Directory management check
echo -e "\n${BLUE}Directory Management${NC}"
echo -e "${BLUE}-------------------${NC}"

# Check if DirectoryManager has platform-specific implementations
if grep -q "get_app_support_directory" $CLIENT_DIR/src/platform/directories.rs; then
    echo -e "Cross-platform directory paths:  ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "Cross-platform directory paths:  ${RED}MISSING${NC}"
fi

if grep -q "set_directory_permissions" $CLIENT_DIR/src/platform/directories.rs; then
    echo -e "Cross-platform permissions:      ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "Cross-platform permissions:      ${RED}MISSING${NC}"
fi

# Logging check
echo -e "\n${BLUE}Logging System${NC}"
echo -e "${BLUE}-------------${NC}"

if grep -q "Cross-platform logging system" $CLIENT_DIR/src/logging/mod.rs; then
    echo -e "Cross-platform logging:          ${GREEN}IMPLEMENTED${NC}"
else
    echo -e "Cross-platform logging:          ${RED}MISSING${NC}"
fi

# TODO check
echo -e "\n${BLUE}TODOs Remaining${NC}"
echo -e "${BLUE}--------------${NC}"

TODO_COUNT=$(grep -r "TODO" --include="*.rs" --include="*.sh" --include="*.ps1" $CLIENT_DIR | wc -l)
echo -e "TODO items remaining:           ${RED}$TODO_COUNT${NC}"

echo -e "\n${BLUE}=====================================================${NC}"
echo -e "${BLUE}                     SUMMARY                          ${NC}"
echo -e "${BLUE}=====================================================${NC}"

# Calculate approximate completion percentage
TOTAL_ITEMS=7 # Service, service-manager, 3 scripts, directories, logging
COMPLETED_ITEMS=0

# Service adapter
if grep -q "CrossPlatformServiceManager" $CLIENT_DIR/src/service_adapter.rs; then
    COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
fi

# Service manager dependency
if grep -q "service_manager" $CLIENT_DIR/Cargo.toml; then
    COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
fi

# Platform scripts
if [ -f "$CLIENT_DIR/scripts/win/build-package-windows.ps1" ] && [ -f "$CLIENT_DIR/scripts/nix/build-package-linux.sh" ] && [ -f "$CLIENT_DIR/scripts/mac/build-package.sh" ]; then
    COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
fi

# Directory management
if grep -q "get_app_support_directory" $CLIENT_DIR/src/platform/directories.rs && grep -q "set_directory_permissions" $CLIENT_DIR/src/platform/directories.rs; then
    COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
fi

# Logging
if grep -q "Cross-platform logging system" $CLIENT_DIR/src/logging/mod.rs; then
    COMPLETED_ITEMS=$((COMPLETED_ITEMS + 1))
fi

# Calculate percentage
COMPLETION_PERCENTAGE=$((COMPLETED_ITEMS * 100 / TOTAL_ITEMS))

if [ $COMPLETION_PERCENTAGE -lt 50 ]; then
    COLOR=$RED
elif [ $COMPLETION_PERCENTAGE -lt 80 ]; then
    COLOR=$YELLOW
else
    COLOR=$GREEN
fi

echo -e "Cross-Platform Cleanup Progress: ${COLOR}${COMPLETION_PERCENTAGE}%${NC}"
echo -e "Platform-specific code blocks:   ${RED}$TOTAL_PLATFORM_SPECIFIC${NC}"
echo -e "TODO items remaining:            ${RED}$TODO_COUNT${NC}"

echo -e "\n${BLUE}Next steps:${NC}"
if [ $COMPLETION_PERCENTAGE -lt 100 ]; then
    if ! grep -q "CrossPlatformServiceManager" $CLIENT_DIR/src/service_adapter.rs; then
        echo -e "- Implement CrossPlatformServiceManager"
    fi
    if ! grep -q "service_manager" $CLIENT_DIR/Cargo.toml; then
        echo -e "- Add service-manager dependency"
    fi
    if [ ! -f "$CLIENT_DIR/scripts/win/build-package-windows.ps1" ] || [ ! -f "$CLIENT_DIR/scripts/nix/build-package-linux.sh" ] || [ ! -f "$CLIENT_DIR/scripts/mac/build-package.sh" ]; then
        echo -e "- Complete platform-specific installation scripts"
    fi
    if ! grep -q "get_app_support_directory" $CLIENT_DIR/src/platform/directories.rs || ! grep -q "set_directory_permissions" $CLIENT_DIR/src/platform/directories.rs; then
        echo -e "- Complete cross-platform directory management"
    fi
    if ! grep -q "Cross-platform logging system" $CLIENT_DIR/src/logging/mod.rs; then
        echo -e "- Implement cross-platform logging"
    fi
    echo -e "- Address remaining TODO items"
else
    echo -e "${GREEN}Congratulations! Cross-platform cleanup is complete.${NC}"
fi 