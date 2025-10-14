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
BACKUP_DIR="/tmp/mesh_backup"
NODE_ID=""
UNINSTALL=false
FORCE_NEW_CERT=false

# Identity file preservation settings
IDENTITY_FILES=(
  "mesh.db"           # Main database file
  "meshagent.msh"     # Configuration file
  "meshagent.db"      # Agent database
  "settings.json"     # Agent settings
  "state.json"        # Agent state
  "nodeinfo.json"     # Node information
  "identitydata.json" # Identity data
)

IDENTITY_DIRS=(
  "data"              # Data directory
  "db"                # Database directory
  "config"            # Configuration directory
)

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

# Stop MeshAgent processes
stop_mesh_agent() {
  debug_print "Stopping any running MeshAgent processes"
  local pid
  if pids=$(pgrep -f "meshagent"); then
    for pid in $pids; do
      debug_print "Stopping MeshAgent process with PID: $pid"
      kill -15 "$pid" 2>/dev/null || true
    done
    sleep 2 # Give processes time to stop
  else
    debug_print "No running MeshAgent processes found"
  fi
}

# Backup identity files
backup_identity_files() {
  local source_dir="$1"
  local backup_dir="$2"
  
  if [ ! -d "$source_dir" ]; then
    debug_print "No existing installation found to backup at: $source_dir"
    return 1
  fi
  
  # Create backup directory
  mkdir -p "$backup_dir"
  debug_print "Created backup directory: $backup_dir"
  
  # Check if any identity files exist
  local has_identity_files=false
  
  # Backup individual files
  for file in "${IDENTITY_FILES[@]}"; do
    local source_path="$source_dir/$file"
    if [ -f "$source_path" ]; then
      has_identity_files=true
      local dest_path="$backup_dir/$file"
      debug_print "Backing up identity file: $file"
      cp -f "$source_path" "$dest_path" 2>/dev/null || true
    fi
  done
  
  # Backup directories
  for dir in "${IDENTITY_DIRS[@]}"; do
    local source_subdir="$source_dir/$dir"
    if [ -d "$source_subdir" ]; then
      has_identity_files=true
      local dest_subdir="$backup_dir/$dir"
      debug_print "Backing up identity directory: $dir"
      mkdir -p "$dest_subdir" 2>/dev/null || true
      cp -rf "$source_subdir"/* "$dest_subdir" 2>/dev/null || true
    fi
  done
  
  if [ "$has_identity_files" = true ]; then
    echo -e "${GREEN}${CHECK} Successfully backed up identity files.${RESET}"
    return 0
  else
    echo -e "${YELLOW}${INFO} No identity files found to backup.${RESET}"
    return 1
  fi
}

# Restore identity files
restore_identity_files() {
  local backup_dir="$1"
  local target_dir="$2"
  
  if [ ! -d "$backup_dir" ]; then
    debug_print "No backup directory found to restore from: $backup_dir"
    return 1
  fi
  
  # Create target directory if it doesn't exist
  mkdir -p "$target_dir"
  
  # Restore individual files
  for file in "${IDENTITY_FILES[@]}"; do
    local source_path="$backup_dir/$file"
    if [ -f "$source_path" ]; then
      local dest_path="$target_dir/$file"
      debug_print "Restoring identity file: $file"
      cp -f "$source_path" "$dest_path" 2>/dev/null || true
      # Fix permissions
      chmod 644 "$dest_path" 2>/dev/null || true
    fi
  done
  
  # Restore directories
  for dir in "${IDENTITY_DIRS[@]}"; do
    local source_subdir="$backup_dir/$dir"
    if [ -d "$source_subdir" ]; then
      local dest_subdir="$target_dir/$dir"
      debug_print "Restoring identity directory: $dir"
      mkdir -p "$dest_subdir" 2>/dev/null || true
      cp -rf "$source_subdir"/* "$dest_subdir" 2>/dev/null || true
    fi
  done
  
  echo -e "${GREEN}${CHECK} Identity files restored.${RESET}"
  return 0
}

# Selective cleanup function (preserves identity files)
selective_cleanup() {
  local dir="$1"

  # Validate input
  if [ -z "$dir" ]; then
    echo -e "${RED}${CROSS} Error: Directory path is empty${RESET}"
    return 1
  fi

  # Ensure we're working with absolute paths
  if [[ "$dir" != /* ]]; then
    echo -e "${RED}${CROSS} Error: Directory path must be absolute: $dir${RESET}"
    return 1
  fi

  # IMPORTANT: Check that this is NOT a system directory
  case "$dir" in
    "/"|"/usr"|"/usr/bin"|"/bin"|"/sbin"|"/usr/sbin"|"/etc"|"/var"|"/opt"|"/lib"|"/lib64"|"/boot"|"/dev"|"/proc"|"/sys"|"/root"|"/home")
      echo -e "${RED}${CROSS} Error: Refusing to clean system directory: $dir${RESET}"
      return 1
      ;;
  esac

  # Additional safety check for system directories
  if [[ "$dir" =~ ^/(usr|bin|sbin|etc|var|opt|lib|lib64|boot|dev|proc|sys|root|home)(/|$) ]]; then
    echo -e "${RED}${CROSS} Error: Refusing to clean directory that might be system-related: $dir${RESET}"
    return 1
  fi

  debug_print "Performing selective cleanup of directory: $dir"
  
  # Create a temporary directory to store files to preserve
  local temp_preserve_dir="/tmp/mesh_preserve_temp"
  mkdir -p "$temp_preserve_dir"
  
  # Backup identity files to temporary location
  for file in "${IDENTITY_FILES[@]}"; do
    if [ -f "$dir/$file" ]; then
      debug_print "Preserving file during cleanup: $file"
      cp -f "$dir/$file" "$temp_preserve_dir/$file" 2>/dev/null || true
    fi
  done
  
  # Backup identity directories to temporary location
  for subdir in "${IDENTITY_DIRS[@]}"; do
    if [ -d "$dir/$subdir" ]; then
      debug_print "Preserving directory during cleanup: $subdir"
      mkdir -p "$temp_preserve_dir/$subdir" 2>/dev/null || true
      cp -rf "$dir/$subdir"/* "$temp_preserve_dir/$subdir" 2>/dev/null || true
    fi
  done
  
  # Remove all files in the directory
  debug_print "Removing files from directory: $dir"
  rm -rf "$dir"/* 2>/dev/null || true
  
  # Restore the preserved files
  for file in "${IDENTITY_FILES[@]}"; do
    if [ -f "$temp_preserve_dir/$file" ]; then
      debug_print "Restoring preserved file: $file"
      cp -f "$temp_preserve_dir/$file" "$dir/$file" 2>/dev/null || true
    fi
  done
  
  # Restore the preserved directories
  for subdir in "${IDENTITY_DIRS[@]}"; do
    if [ -d "$temp_preserve_dir/$subdir" ]; then
      debug_print "Restoring preserved directory: $subdir"
      mkdir -p "$dir/$subdir" 2>/dev/null || true
      cp -rf "$temp_preserve_dir/$subdir"/* "$dir/$subdir" 2>/dev/null || true
    fi
  done
  
  # Clean up the temporary preserve directory
  rm -rf "$temp_preserve_dir"
  
  debug_print "Selective cleanup completed for: $dir"
}

# Complete cleanup function (removes everything)
cleanup() {
  local dir="$1"
  debug_print "Cleaning up directory: $dir"
  retry 3 sudo rm -rf "$dir"
}

# Uninstall function
uninstall_mesh_agent() {
  echo -e "${YELLOW}${INFO} Uninstalling MeshAgent...${RESET}"
  
  # Stop any running MeshAgent processes
  stop_mesh_agent
  
  # Determine installation directories based on OS
  local install_locations=()
  
  if [ "$OS_NAME" = "macos" ]; then
    install_locations=(
      "/usr/local/bin/meshagent" 
      "/usr/local/bin/meshagent.msh"
      "/Library/MeshAgent"
      "/usr/local/mesh_install"
      "/var/mesh_install"
    )
    
    # Check for and remove Launch Agents/Daemons
    if [ -f "/Library/LaunchDaemons/com.meshcentral.agent.plist" ]; then
      debug_print "Removing launch daemon"
      sudo launchctl unload "/Library/LaunchDaemons/com.meshcentral.agent.plist" 2>/dev/null || true
      sudo rm -f "/Library/LaunchDaemons/com.meshcentral.agent.plist" 2>/dev/null || true
    fi
    
    # Remove preference files
    sudo rm -rf "/Library/Preferences/MeshAgent" 2>/dev/null || true
    
  else # Linux
    install_locations=(
      "/usr/local/bin/meshagent" 
      "/usr/local/bin/meshagent.msh"
      "/opt/meshagent"
      "/etc/meshagent"
    )
    
    # Remove systemd service if it exists
    if [ -f "/etc/systemd/system/meshagent.service" ]; then
      debug_print "Removing systemd service"
      sudo systemctl stop meshagent 2>/dev/null || true
      sudo systemctl disable meshagent 2>/dev/null || true
      sudo rm -f "/etc/systemd/system/meshagent.service" 2>/dev/null || true
      sudo systemctl daemon-reload 2>/dev/null || true
    fi
  fi
  
  # Remove all installation files
  for location in "${install_locations[@]}"; do
    if [ -e "$location" ]; then
      debug_print "Removing: $location"
      sudo rm -rf "$location" 2>/dev/null || true
    fi
  done
  
  # Clean up any temporary directories
  cleanup "$TEMP_DIR"
  cleanup "$BACKUP_DIR"
  
  echo -e "${GREEN}${CHECK} MeshAgent has been uninstalled.${RESET}"
  exit 0
}

# Help function
show_help() {
  echo -e "${BLUE}${INFO} MeshCentral Agent Installer for *nix darwin Systems${RESET}"
  echo ""
  echo "Usage: $0 [options]"
  echo ""
  echo "Options:"
  echo "  --server=<mesh_server_url>        (Required) URL of your MeshCentral server (without https://)"
  echo "  --nodeid=<node_id>                (Optional) NodeID to inject into the MSH file"
  echo "  --uninstall                       (Optional) Completely remove MeshAgent from this system"
  echo "  --force-new-cert                  (Optional) Force certificate reset to resolve server certificate mismatch issues"
  echo "  --help                            Display this help message"
  echo ""
  echo "Example:"
  echo "  $0 --server=mesh.yourdomain.com"
  echo "  $0 --server=mesh.yourdomain.com --nodeid=node//1E3vUyW4i1Je\$hiyT8ec87bEXPVj\$sEahRAFDtfNSKgS5XJQBotfsN9Y\$v0hw6xa"
  echo "  $0 --uninstall"
  exit 0
}

# Parse arguments
for ARG in "$@"; do
  case $ARG in
  --server=*) MESH_SERVER="${ARG#*=}" ;;
  --nodeid=*) NODE_ID="${ARG#*=}" ;;
  --uninstall) UNINSTALL=true ;;
  --force-new-cert) FORCE_NEW_CERT=true ;;
  --help) show_help ;;
  *)
    echo -e "${RED}${CROSS} Unknown argument: $ARG${RESET}"
    show_help
    ;;
  esac
done

# Validate required parameters
if [ "$UNINSTALL" = false ] && [ -z "$MESH_SERVER" ]; then
  echo -e "${RED}${CROSS} Error: Mesh server URL (--server) is required unless uninstalling.${RESET}"
  show_help
fi

# Ensure running as root
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Please run this script with sudo or as root.${RESET}"
  exit 1
fi

# Process uninstall request if specified
if [ "$UNINSTALL" = true ]; then
  uninstall_mesh_agent
fi

# Detect OS and architecture
detect_os
detect_arch
get_agent_id

debug_print "Detected OS: $OS_NAME, Architecture: $ARCH, Agent ID: $AGENT_ID"

# Check for existing installation and define install directory
if [ "$OS_NAME" = "macos" ]; then
  INSTALL_DIR="/usr/local/bin"
  DATA_DIR="/Library/MeshAgent"
else
  INSTALL_DIR="/opt/meshagent"
  DATA_DIR="/var/lib/meshagent"
fi

# Stop any running instances first
stop_mesh_agent

# Check for existing installation and backup identity files
HAS_EXISTING_INSTALLATION=false
HAS_IDENTITY_BACKUP=false

if [ -f "$INSTALL_DIR/meshagent" ]; then
  HAS_EXISTING_INSTALLATION=true
  echo -e "${YELLOW}${INFO} Existing installation found. Preserving identity files...${RESET}"
  
  # If force certificate reset is specified, modify the identity files list
  if [ "$FORCE_NEW_CERT" = true ]; then
    echo -e "${YELLOW}${INFO} Certificate reset requested - will not preserve certificate data${RESET}"
    debug_print "Certificate reset mode - limiting preserved files"
    
    # Modified list that excludes certificate-related files
    IDENTITY_FILES=(
      # Keep minimal identity info, but exclude certificate data
      "nodeinfo.json"     # Node information
    )
    
    IDENTITY_DIRS=()
  fi
  
  if backup_identity_files "$INSTALL_DIR" "$BACKUP_DIR"; then
    HAS_IDENTITY_BACKUP=true
    if [ "$FORCE_NEW_CERT" = true ]; then
      echo -e "${GREEN}${CHECK} Successfully backed up minimal identity files (certificate reset mode).${RESET}"
    else
      echo -e "${GREEN}${CHECK} Successfully backed up identity files.${RESET}"
    fi
  else
    echo -e "${YELLOW}${INFO} No identity files found to backup.${RESET}"
  fi
  
  # Also check data directory if it exists
  if [ -d "$DATA_DIR" ] && [ "$HAS_IDENTITY_BACKUP" = false ]; then
    if backup_identity_files "$DATA_DIR" "$BACKUP_DIR"; then
      HAS_IDENTITY_BACKUP=true
      if [ "$FORCE_NEW_CERT" = true ]; then
        echo -e "${GREEN}${CHECK} Successfully backed up minimal identity files from data directory (certificate reset mode).${RESET}"
      else
        echo -e "${GREEN}${CHECK} Successfully backed up identity files from data directory.${RESET}"
      fi
    fi
  fi
else
  debug_print "No existing installation found. Will perform fresh install."
fi

# Create directories
debug_print "Creating directories: $TEMP_DIR"
retry 3 sudo mkdir -p "$TEMP_DIR"

# Display file paths for user clarity
echo -e "${BLUE}${INFO} File Destinations:${RESET}"
echo -e "${BLUE}${INFO} - Temporary directory: ${YELLOW}$TEMP_DIR${RESET}"
echo -e "${BLUE}${INFO} - Installation directory: ${YELLOW}$INSTALL_DIR${RESET}"
echo -e "${BLUE}${INFO} - Data directory: ${YELLOW}$DATA_DIR${RESET}"

# Clean up temporary directory
cleanup "$TEMP_DIR"

# Selectively clean installation directory if needed
if [ "$HAS_EXISTING_INSTALLATION" = true ]; then
  debug_print "Performing selective cleanup of installation directory"
  selective_cleanup "$INSTALL_DIR"
  
  # Also clean up data directory if it exists
  if [ -d "$DATA_DIR" ]; then
    selective_cleanup "$DATA_DIR"
  fi
fi

# Create directories again in case they were removed
mkdir -p "$TEMP_DIR"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"

# Download MeshAgent binary
AGENT_URL="https://$MESH_SERVER/meshagents?id=$AGENT_ID"
AGENT_PATH="$TEMP_DIR/meshagent"

debug_print "Downloading MeshAgent binary from $AGENT_URL"
echo -e "${BLUE}${INFO} - Agent binary location: ${YELLOW}$AGENT_PATH${RESET}"
retry 3 curl -k "$AGENT_URL" -o "$AGENT_PATH"

if [ $? -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Unable to download MeshAgent binary. Check your server URL and network connection.${RESET}"
  exit 1
fi

retry 3 sudo chmod +x "$AGENT_PATH"

# Platform-specific quarantine handling
if [ "$OS_NAME" = "macos" ]; then
  debug_print "Removing quarantine attribute from downloaded MeshAgent binary (macOS specific)"
  # Suppress errors if attribute doesn't exist by using || true
  sudo xattr -d com.apple.quarantine "$AGENT_PATH" 2>/dev/null || true
  # Alternative approach - set empty attribute
  sudo xattr -w com.apple.quarantine "" "$AGENT_PATH" 2>/dev/null || true
  
  # Extra security approval for macOS
  debug_print "Approving binary for execution"
  sudo spctl --add --label "MeshAgent" "$AGENT_PATH" 2>/dev/null || true
  sudo spctl --enable --label "MeshAgent" 2>/dev/null || true
fi

CONFIG_URL="https://$MESH_SERVER/openframe_public/meshagent.msh"
CONFIG_PATH="$TEMP_DIR/meshagent.msh"

# Download MeshAgent configuration file
debug_print "Downloading MeshAgent configuration file"
echo -e "${BLUE}${INFO} - Config file location: ${YELLOW}$CONFIG_PATH${RESET}"
retry 3 curl -k "$CONFIG_URL" -o "$CONFIG_PATH"

if [ $? -ne 0 ]; then
  echo -e "${RED}${CROSS} Error: Unable to download MeshAgent configuration file. Check your server URL and network connection.${RESET}"
  exit 1
fi

# Add NodeID to the MSH file if provided
if [ -n "$NODE_ID" ]; then
  debug_print "Adding NodeID to the MSH file: $NODE_ID"
  echo "NodeID=$NODE_ID" >> "$CONFIG_PATH"
  echo -e "${BLUE}${INFO} - Added NodeID to configuration file${RESET}"
fi

# Platform-specific quarantine handling for config file
if [ "$OS_NAME" = "macos" ]; then
  debug_print "Removing quarantine attribute from configuration file (macOS specific)"
  # Suppress errors if attribute doesn't exist by using || true
  sudo xattr -d com.apple.quarantine "$CONFIG_PATH" 2>/dev/null || true
  # Alternative approach - set empty attribute
  sudo xattr -w com.apple.quarantine "" "$CONFIG_PATH" 2>/dev/null || true
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
echo -e "${BLUE}${INFO} - Log directory: ${YELLOW}$LOG_DIR${RESET}"
retry 3 sudo mkdir -p "$LOG_DIR"

# Set log file path
LOG_FILE="$LOG_DIR/meshagent.log"
debug_print "Agent output will be logged to: $LOG_FILE"
echo -e "${BLUE}${INFO} - Log file: ${YELLOW}$LOG_FILE${RESET}"

# Copy files to installation directory
debug_print "Copying files to installation directory"
sudo cp "$AGENT_PATH" "$INSTALL_DIR/meshagent"
sudo chmod +x "$INSTALL_DIR/meshagent"

# Always override the MSH configuration file
sudo cp "$CONFIG_PATH" "$INSTALL_DIR/meshagent.msh"
debug_print "Copied new configuration file to installation directory"

FINAL_AGENT_PATH="$INSTALL_DIR/meshagent"
FINAL_CONFIG_PATH="$INSTALL_DIR/meshagent.msh"
echo -e "${BLUE}${INFO} - Final agent location: ${YELLOW}$FINAL_AGENT_PATH${RESET}"
echo -e "${BLUE}${INFO} - Final config location: ${YELLOW}$FINAL_CONFIG_PATH${RESET}"

# Restore identity files if we backed them up
if [ "$HAS_IDENTITY_BACKUP" = true ]; then
  echo -e "${YELLOW}${INFO} Restoring identity files from backup...${RESET}"
  restore_identity_files "$BACKUP_DIR" "$INSTALL_DIR"
  
  # Also restore to data directory if needed
  if [ -d "$DATA_DIR" ]; then
    restore_identity_files "$BACKUP_DIR" "$DATA_DIR"
  fi
fi

# Clean up temp files before starting agent
debug_print "Cleaning up temporary directory: $TEMP_DIR"
cleanup "$TEMP_DIR"

# Clean up backup directory after successful restore
if [ "$HAS_IDENTITY_BACKUP" = true ]; then
  debug_print "Cleaning up backup directory: $BACKUP_DIR"
  cleanup "$BACKUP_DIR"
fi

# Verify agent status
debug_print "Running MeshCentral agent"

# Installation summary
echo -e "${GREEN}${CHECK} Installation Summary:${RESET}"
echo -e "${BLUE}${INFO} - Agent Location: ${YELLOW}$FINAL_AGENT_PATH${RESET}"
echo -e "${BLUE}${INFO} - Config Location: ${YELLOW}$FINAL_CONFIG_PATH${RESET}"
echo -e "${BLUE}${INFO} - Log Location: ${YELLOW}$LOG_FILE${RESET}"
if [ "$HAS_IDENTITY_BACKUP" = true ]; then
  if [ "$FORCE_NEW_CERT" = true ]; then
    echo -e "${BLUE}${INFO} - Certificate reset mode - minimal identity files were preserved${RESET}"
  else
    echo -e "${BLUE}${INFO} - Identity files were preserved from previous installation${RESET}"
  fi
fi
if [ "$FORCE_NEW_CERT" = true ]; then
  echo -e "${YELLOW}${INFO} Certificate reset was applied${RESET}"
fi
echo -e "${GREEN}${CHECK} Installation completed successfully.${RESET}"
echo -e "${YELLOW}${INFO} Starting MeshAgent in connect mode...${RESET}"
echo -e "${YELLOW}${INFO} Press Ctrl+C to exit (agent will continue running in background)${RESET}"

# Run agent with full path to the installation location
echo -e "${BLUE}${INFO} - Executing agent from: ${YELLOW}$FINAL_AGENT_PATH${RESET}"
retry 5 sudo "$FINAL_AGENT_PATH" connect

# Final debug print
debug_print "Execution process completed successfully"

exit 0
