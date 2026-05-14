#!/bin/bash

# OpenFrame Client Updater Installer for macOS/Linux systems

# Color and Emoji definitions
GREEN="\033[1;32m"
RED="\033[1;31m"
YELLOW="\033[1;33m"
BLUE="\033[1;34m"
RESET="\033[0m"
CHECK="✅"
CROSS="❌"
INFO="ℹ️"
WARN="⚠️"

# Default parameters
SERVER=""
TEMP_DIR="/tmp/updater_install"
UNINSTALL=false

# OS detection
detect_os() {
  if [ "$(uname)" = "Darwin" ]; then
    OS_NAME="macos"
  elif [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$(echo "$ID" | tr '[:upper:]' '[:lower:]')
  else
    OS_NAME="linux"
  fi
}

# Architecture detection
detect_arch() {
  local arch
  arch=$(uname -m)
  case $arch in
    x86_64)       ARCH="x64" ;;
    aarch64|arm64) ARCH="arm64" ;;
    *)
      echo -e "${RED}${CROSS} Unsupported architecture: $arch${RESET}"
      exit 1
      ;;
  esac
}

# Retry wrapper with exponential backoff
retry() {
  local retries=$1
  shift
  local count=0
  until "$@"; do
    exit_code=$?
    wait_time=$((2 ** count))
    count=$((count + 1))
    if [ $count -lt $retries ]; then
      echo -e "${YELLOW}${WARN} Command failed. Retrying in $wait_time seconds...${RESET}"
      sleep $wait_time
    else
      echo -e "${RED}${CROSS} Command failed after $retries attempts.${RESET}"
      return $exit_code
    fi
  done
  return 0
}

# Stop the updater service without removing it
stop_updater() {
  local service="com.openframe.client-updater"
  echo -e "${YELLOW}${INFO} Stopping updater service if running...${RESET}"

  if [ "$OS_NAME" = "macos" ]; then
    local plist="/Library/LaunchDaemons/${service}.plist"
    if [ -f "$plist" ]; then
      sudo launchctl unload "$plist" 2>/dev/null || true
    fi
  elif command -v systemctl >/dev/null 2>&1; then
    sudo systemctl stop "$service" 2>/dev/null || true
  fi
}

# Uninstall function
uninstall_updater() {
  echo -e "${YELLOW}${INFO} Uninstalling OpenFrame Client Updater...${RESET}"

  stop_updater

  local install_path="/usr/local/bin/openframe-client-updater"

  # Run the binary's own uninstall subcommand if it is present
  if [ -f "$install_path" ]; then
    echo -e "${YELLOW}${INFO} Running uninstall command...${RESET}"
    sudo "$install_path" uninstall 2>/dev/null || true
    sleep 2
  fi

  # Belt-and-suspenders: remove binary and plist if still present after the command
  if [ -f "$install_path" ]; then
    echo -e "${YELLOW}${INFO} Removing remaining binary at $install_path...${RESET}"
    sudo rm -f "$install_path"
  fi

  if [ "$OS_NAME" = "macos" ]; then
    local plist="/Library/LaunchDaemons/com.openframe.client-updater.plist"
    if [ -f "$plist" ]; then
      sudo rm -f "$plist"
    fi
  elif command -v systemctl >/dev/null 2>&1; then
    local unit="/etc/systemd/system/com.openframe.client-updater.service"
    if [ -f "$unit" ]; then
      sudo systemctl disable com.openframe.client-updater 2>/dev/null || true
      sudo rm -f "$unit"
      sudo systemctl daemon-reload 2>/dev/null || true
    fi
  fi

  # Clean up temp directory
  sudo rm -rf "$TEMP_DIR" 2>/dev/null || true

  echo -e "${GREEN}${CHECK} OpenFrame Client Updater has been uninstalled.${RESET}"
  exit 0
}

# Help text
show_help() {
  echo -e "${BLUE}${INFO} OpenFrame Client Updater Installer for macOS/Linux systems${RESET}"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --server=<openframe_server_url>   (Required) URL of your OpenFrame server (without https://)"
  echo "  --uninstall                       Completely remove the OpenFrame Client Updater"
  echo "  --help                            Display this help message"
  echo ""
  echo "Example:"
  echo "  $0 --server=openframe.yourdomain.com"
  echo "  $0 --uninstall"
  exit 0
}

# Parse arguments
for ARG in "$@"; do
  case $ARG in
    --server=*) SERVER="${ARG#*=}" ;;
    --uninstall) UNINSTALL=true ;;
    --help) show_help ;;
    *)
      echo -e "${RED}${CROSS} Unknown argument: $ARG${RESET}"
      show_help
      ;;
  esac
done

# Validate
if [ "$UNINSTALL" = false ] && [ -z "$SERVER" ]; then
  echo -e "${RED}${CROSS} Error: Server URL (--server) is required unless uninstalling.${RESET}"
  show_help
fi

# Must run as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Please run this script with sudo or as root.${RESET}"
  exit 1
fi

# Detect environment
detect_os
detect_arch

# Handle uninstall
if [ "$UNINSTALL" = true ]; then
  uninstall_updater
fi

echo -e "${GREEN}${CHECK} OpenFrame Client Updater Installation Started${RESET}"
echo -e "${GREEN}================================================${RESET}"
echo -e "${BLUE}${INFO} Detected OS: $OS_NAME, Architecture: $ARCH${RESET}"
echo -e "${BLUE}${INFO} File Destinations:${RESET}"
echo -e "${BLUE}${INFO} - Temporary directory: ${YELLOW}$TEMP_DIR${RESET}"
echo -e "${BLUE}${INFO} - Install location:    ${YELLOW}/usr/local/bin/openframe-client-updater${RESET}"

# Clean up and create temp directory
sudo rm -rf "$TEMP_DIR"
mkdir -p "$TEMP_DIR"

# Determine download URL.
# macOS ships a universal binary; Linux uses architecture-specific builds.
if [ "$OS_NAME" = "macos" ]; then
  BINARY_URL="https://$SERVER/openframe_public/openframe-client-updater"
else
  BINARY_URL="https://$SERVER/openframe_public/openframe-client-updater-linux-${ARCH}"
fi

BINARY_PATH="$TEMP_DIR/openframe-client-updater"

echo -e "${YELLOW}${INFO} Downloading from: $BINARY_URL${RESET}"
echo -e "${BLUE}${INFO} - Binary location: ${YELLOW}$BINARY_PATH${RESET}"

retry 3 curl -k "$BINARY_URL" -o "$BINARY_PATH"

if [ $? -ne 0 ] || [ ! -f "$BINARY_PATH" ]; then
  echo -e "${RED}${CROSS} Error: Failed to download openframe-client-updater binary.${RESET}"
  exit 1
fi

retry 3 sudo chmod +x "$BINARY_PATH"

# Remove Gatekeeper quarantine on macOS
if [ "$OS_NAME" = "macos" ]; then
  echo -e "${YELLOW}${INFO} Removing quarantine attribute (macOS)...${RESET}"
  sudo xattr -d com.apple.quarantine "$BINARY_PATH" 2>/dev/null || true
  sudo xattr -w com.apple.quarantine "" "$BINARY_PATH" 2>/dev/null || true
fi

echo -e "${GREEN}${CHECK} Binary downloaded successfully.${RESET}"

# Run the install subcommand — copies binary to /usr/local/bin and registers the OS service
echo -e "${YELLOW}${INFO} Installing OpenFrame Client Updater service...${RESET}"
sudo "$BINARY_PATH" install

if [ $? -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Updater install command failed.${RESET}"
  exit 1
fi

# Clean up temp directory
sudo rm -rf "$TEMP_DIR"

echo -e "${GREEN}${CHECK} Installation Summary:${RESET}"
echo -e "${BLUE}${INFO} - Installed to: /usr/local/bin/openframe-client-updater${RESET}"
echo -e "${BLUE}${INFO} - Service registered: com.openframe.client-updater${RESET}"
echo -e "${GREEN}${CHECK} Installation completed successfully.${RESET}"

exit 0
