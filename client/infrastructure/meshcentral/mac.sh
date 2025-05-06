#!/bin/bash

# MeshCentral Agent Installer for *nix systems with customizable parameters and detailed output

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
MESH_SERVER=""
TEMP_DIR="/tmp/mesh_install"

# OS Detection
detect_os() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS_NAME=$ID
  elif [ -f /etc/lsb-release ]; then
    . /etc/lsb-release
    OS_NAME=$DISTRIB_ID
  elif [ "$(uname)" = "Darwin" ]; then
    OS_NAME="macos"
  else
    OS_NAME="unknown"
  fi
  OS_NAME=$(echo "$OS_NAME" | tr '[:upper:]' '[:lower:]')
}

# Architecture Detection
detect_arch() {
  local arch=$(uname -m)
  case $arch in
  x86_64)
    if [ -n "$(grep -E 'vmx|svm' /proc/cpuinfo 2>/dev/null)" ]; then
      ARCH="x64"
    else
      ARCH="x86"
    fi
    ;;
  aarch64 | arm64)
    ARCH="arm64"
    ;;
  armv7* | armv8*)
    ARCH="arm"
    ;;
  *)
    echo -e "${RED}${CROSS} Unsupported architecture: $arch${RESET}"
    exit 1
    ;;
  esac
}

# Get agent ID based on OS and architecture
get_agent_id() {
  case $OS_NAME in
  "macos")
    case $ARCH in
    "arm64") AGENT_ID="10005" ;; # Apple Silicon
    "x64") AGENT_ID="4" ;;       # Intel Mac
    *)
      echo -e "${RED}${CROSS} Unsupported macOS architecture${RESET}"
      exit 1
      ;;
    esac
    ;;
  "ubuntu" | "debian" | "linuxmint")
    case $ARCH in
    "x64") AGENT_ID="6" ;;
    "arm64") AGENT_ID="10003" ;;
    "arm") AGENT_ID="10004" ;;
    *)
      echo -e "${RED}${CROSS} Unsupported Linux architecture${RESET}"
      exit 1
      ;;
    esac
    ;;
  *)
    echo -e "${RED}${CROSS} Unsupported operating system: $OS_NAME${RESET}"
    exit 1
    ;;
  esac
}

# Debug print function
debug_print() {
  echo -e "${YELLOW}${INFO} DEBUG: $1${RESET}"
}

# Function for retries
retry() {
  local retries=$1
  shift
  local count=0
  debug_print "Executing command: $*"
  until "$@"; do
    exit_code=$?
    wait_time=$((2 ** $count))
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

# Cleanup function
cleanup() {
  debug_print "Cleaning up temporary files"
  retry 3 sudo rm -rf "$TEMP_DIR"
}

# Help function
show_help() {
  echo -e "${BLUE}${INFO} MeshCentral Agent Installer for *nix darwin Systems${RESET}"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --server=<mesh_server_url>        (Required) URL of your MeshCentral server (without https://)"
  echo "  --help                            Display this help message"
  echo ""
  echo "Example:"
  echo "  $0 --server=mesh.yourdomain.com"
  exit 0
}

# Parse arguments
for ARG in "$@"; do
  case $ARG in
  --server=*) MESH_SERVER="${ARG#*=}" ;;
  --help) show_help ;;
  *)
    echo -e "${RED}${CROSS} Unknown argument: $ARG${RESET}"
    show_help
    ;;
  esac
done

# Validate required parameters
if [ -z "$MESH_SERVER" ]; then
  echo -e "${RED}${CROSS} Error: Mesh server URL (--server) is required.${RESET}"
  show_help
fi

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Please run this script with sudo or as root.${RESET}"
  exit 1
fi

# Detect OS and architecture
detect_os
detect_arch
get_agent_id

debug_print "Detected OS: $OS_NAME, Architecture: $ARCH, Agent ID: $AGENT_ID"

# Initial cleanup
debug_print "Performing initial cleanup to ensure clean state"
cleanup

# Create directories
debug_print "Creating directories: $TEMP_DIR"
retry 3 sudo mkdir -p "$TEMP_DIR"

# Download MeshAgent binary
AGENT_URL="https://$MESH_SERVER/meshagents?id=$AGENT_ID"

debug_print "Downloading MeshAgent binary from $AGENT_URL"
retry 3 curl -k "$AGENT_URL" -o "$TEMP_DIR/meshagent"

if [ $? -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Unable to download MeshAgent binary. Check your server URL and network connection.${RESET}"
  exit 1
fi

retry 3 sudo chmod +x "$TEMP_DIR/meshagent"

# Platform-specific quarantine handling
if [ "$OS_NAME" = "macos" ]; then
  debug_print "Removing quarantine attribute from downloaded MeshAgent binary (macOS specific)"
  # Suppress errors if attribute doesn't exist by using || true
  sudo xattr -d com.apple.quarantine "$TEMP_DIR/meshagent" 2>/dev/null || true
  # Alternative approach - set empty attribute
  sudo xattr -w com.apple.quarantine "" "$TEMP_DIR/meshagent" 2>/dev/null || true
  
  # Move to a more permissive location for execution
  INSTALL_DIR="/usr/local/bin"
  debug_print "Moving agent to approved location: $INSTALL_DIR"
  sudo mkdir -p "$INSTALL_DIR"
  sudo cp "$TEMP_DIR/meshagent" "$INSTALL_DIR/meshagent"
  sudo chmod +x "$INSTALL_DIR/meshagent"
  
  # Extra security approval for macOS
  debug_print "Approving binary for execution"
  sudo spctl --add --label "MeshAgent" "$INSTALL_DIR/meshagent" 2>/dev/null || true
  sudo spctl --enable --label "MeshAgent" 2>/dev/null || true
fi

CONFIG_URL="https://$MESH_SERVER/openframe_public/meshagent.msh"

# Download MeshAgent configuration file
debug_print "Downloading MeshAgent configuration file"
retry 3 curl -k "$CONFIG_URL" -o "$TEMP_DIR/meshagent.msh"

if [ $? -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Unable to download MeshAgent configuration file. Check your server URL and network connection.${RESET}"
  exit 1
fi

# Platform-specific quarantine handling for config file
if [ "$OS_NAME" = "macos" ]; then
  debug_print "Removing quarantine attribute from configuration file (macOS specific)"
  # Suppress errors if attribute doesn't exist by using || true
  sudo xattr -d com.apple.quarantine "$TEMP_DIR/meshagent.msh" 2>/dev/null || true
  # Alternative approach - set empty attribute
  sudo xattr -w com.apple.quarantine "" "$TEMP_DIR/meshagent.msh" 2>/dev/null || true
  
  # Copy config to same location as agent
  sudo cp "$TEMP_DIR/meshagent.msh" "$INSTALL_DIR/meshagent.msh"
fi

echo -e "${GREEN}${CHECK} MeshAgent and configuration successfully Downloaded.${RESET}"

# Request screen sharing permissions on macOS
request_screen_permissions() {
  if [ "$OS_NAME" = "macos" ]; then
    debug_print "Checking screen sharing permissions"
    
    # Check if screen recording permission is already granted
    # Try to capture a screenshot as a test
    TEST_SCREENSHOT="/tmp/meshcentral_test_screenshot.png"
    if screencapture -x "$TEST_SCREENSHOT" 2>/dev/null; then
      debug_print "Screen recording permission already granted"
      SCREEN_RECORDING_GRANTED=true
      rm -f "$TEST_SCREENSHOT"
    else
      debug_print "Screen recording permission not granted"
      SCREEN_RECORDING_GRANTED=false
    fi
    
    # Check if full disk access is already granted
    # Try to access a protected directory
    if ls /Library/Application\ Support/com.apple.TCC 2>/dev/null; then
      debug_print "Full disk access permission already granted"
      FULL_DISK_ACCESS_GRANTED=true
    else
      debug_print "Full disk access permission not granted"
      FULL_DISK_ACCESS_GRANTED=false
    fi
    
    # Request screen recording permission if not granted
    if [ "$SCREEN_RECORDING_GRANTED" = false ]; then
      debug_print "Requesting screen recording permission"
      osascript <<EOD
        tell application "System Settings"
          activate
          delay 0.5
          # Navigate to Privacy & Security > Screen Recording
          do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture'"
          delay 1
          # User instructions via dialog
          display dialog "Please click the '+' button and add the MeshCentral agent to allow screen sharing." buttons {"OK"} default button "OK" with icon caution with title "Screen Sharing Permission Required"
        end tell
EOD
    fi
    
    # Request full disk access if not granted
    if [ "$FULL_DISK_ACCESS_GRANTED" = false ]; then
      debug_print "Requesting full disk access permission"
      osascript <<EOD
        tell application "System Settings"
          activate
          delay 0.5
          # Navigate to Privacy & Security > Full Disk Access
          do shell script "open 'x-apple.systempreferences:com.apple.preference.security?Privacy_AllFiles'"
          delay 1
          # User instructions via dialog
          display dialog "Please also grant Full Disk Access to the MeshCentral agent for complete functionality." buttons {"OK"} default button "OK" with icon caution with title "Full Disk Access Required"
        end tell
EOD
    fi
    
    # If any permissions were requested, give user time to approve
    if [ "$SCREEN_RECORDING_GRANTED" = false ] || [ "$FULL_DISK_ACCESS_GRANTED" = false ]; then
      echo -e "${YELLOW}${INFO} Waiting for permissions approval...${RESET}"
      sleep 5
    else
      debug_print "All required permissions already granted"
    fi
  fi
}

# Request necessary permissions
request_screen_permissions

# Create log directory if it doesn't exist
LOG_DIR="$(dirname "$TEMP_DIR")/meshagent_logs"
debug_print "Creating log directory: $LOG_DIR"
retry 3 sudo mkdir -p "$LOG_DIR"

# Set log file path
LOG_FILE="$LOG_DIR/meshagent.log"
debug_print "Agent output will be logged to: $LOG_FILE"

# Verify agent status
debug_print "Running MeshCentral agent"

# Run agent with full path to the more permissive location
if [ "$OS_NAME" = "macos" ]; then
  retry 5 sudo "$INSTALL_DIR/meshagent" connect
else
  retry 5 sudo "$TEMP_DIR/meshagent" connect
fi

# Final debug print
debug_print "Execution process completed successfully"

exit 0
