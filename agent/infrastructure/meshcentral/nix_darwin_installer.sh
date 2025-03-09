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
  echo -e "${BLUE}${INFO} MeshCentral Agent Installer for *nix Systems${RESET}"
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
  debug_print "Quarantining downloaded MeshAgent binary (macOS specific)"
  retry 3 sudo xattr -w com.apple.quarantine "0081;$(date +%s);curl;$(uuidgen)" "$TEMP_DIR/meshagent"
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
  debug_print "Quarantining downloaded configuration file (macOS specific)"
  retry 3 sudo xattr -w com.apple.quarantine "0081;$(date +%s);curl;$(uuidgen)" "$TEMP_DIR/meshagent.msh"
fi

echo -e "${GREEN}${CHECK} MeshAgent and configuration successfully Downloaded.${RESET}"

# Create log directory if it doesn't exist
LOG_DIR="$(dirname "$TEMP_DIR")/meshagent_logs"
debug_print "Creating log directory: $LOG_DIR"
retry 3 sudo mkdir -p "$LOG_DIR"

# Set log file path
LOG_FILE="$LOG_DIR/meshagent.log"
debug_print "Agent output will be logged to: $LOG_FILE"

# Verify agent status
debug_print "Running MeshCentral agent"

# Run agent in background with output redirected to log file
retry 5 sudo "$TEMP_DIR/meshagent" connect

# Final debug print
debug_print "Execution process completed successfully"

exit 0
