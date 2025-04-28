#!/usr/bin/env bash
#
# mac_arm64.sh
#
# Purpose:
#   - Install dependencies (Xcode CLT, Homebrew, Git, Go) on Apple Silicon macOS
#   - Accept script args or prompt for org name, email, RMM URL, agent key, code-sign identity, log path, build folder
#   - Clone, patch, compile rmmagent for macOS ARM64, optionally sign
#   - Prompt to run agent or skip
#   - **After install, automatically patch the LaunchDaemons plists** so that the
#     Tactical Agent uses the custom log path (if provided).
#
# Usage Examples:
#   1) Interactive mode:
#        ./mac_arm64.sh
#   2) Provide some or all args:
#        ./mac_arm64.sh --org-name "OpenFrame" --rmm-url "http://localhost:8000" ...
#   3) Non-interactive (all args):
#        ./mac_arm64.sh --org-name "MyOrg" ... --skip-run
#
# Requirements:
#   - Apple Silicon macOS
#   - Possibly root/sudo acceptance for installing Xcode Tools, Homebrew, Git, Go
#   - Code-signing optional (needs Developer ID certificate)
#

set -e

############################
# Default / Config
############################

RMMAGENT_REPO="https://github.com/amidaware/rmmagent.git"
RMMAGENT_BRANCH="master"
OUTPUT_BINARY="rmmagent-mac-arm64"

# We'll store user-provided or prompted values in these variables:
ORG_NAME=""
CONTACT_EMAIL=""
RMM_SERVER_URL=""
AGENT_AUTH_KEY=""
CODESIGN_IDENTITY=""
AGENT_LOG_PATH=""
BUILD_FOLDER="rmmagent"  # default
SKIP_RUN="false"
CLIENT_ID=""
SITE_ID=""
AGENT_TYPE="workstation"  # default
NATS_PORT=""  # NATS port (required)

############################
# Parse Script Arguments
############################

while [[ $# -gt 0 ]]; do
  case "$1" in
    --org-name)
      ORG_NAME="$2"
      shift 2
      ;;
    --email)
      CONTACT_EMAIL="$2"
      shift 2
      ;;
    --rmm-url)
      RMM_SERVER_URL="$2"
      shift 2
      ;;
    --auth-key)
      AGENT_AUTH_KEY="$2"
      shift 2
      ;;
    --client-id)
      CLIENT_ID="$2"
      shift 2
      ;;
    --site-id)
      SITE_ID="$2"
      shift 2
      ;;
    --agent-type)
      AGENT_TYPE="$2"
      shift 2
      ;;
    --codesign-identity)
      CODESIGN_IDENTITY="$2"
      shift 2
      ;;
    --log-path)
      AGENT_LOG_PATH="$2"
      shift 2
      ;;
    --build-folder)
      BUILD_FOLDER="$2"
      shift 2
      ;;
    --nats-port)
      NATS_PORT="$2"
      shift 2
      ;;
    --skip-run)
      SKIP_RUN="true"
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [options]"
      echo "Options:"
      echo "  --org-name <NAME>            Organization name placeholder"
      echo "  --email <EMAIL>              Contact email placeholder"
      echo "  --rmm-url <URL>              RMM server URL"
      echo "  --auth-key <KEY>             Agent auth key"
      echo "  --client-id <ID>             Client ID"
      echo "  --site-id <ID>               Site ID"
      echo "  --agent-type <TYPE>          Agent type (server/workstation) [default: server]"
      echo "  --codesign-identity <IDENT>  Apple Developer ID for signing"
      echo "  --log-path <PATH>            Agent log file path"
      echo "  --build-folder <FOLDER>      Where to clone and compile (default: rmmagent)"
      echo "  --nats-port <PORT>           NATS WebSocket port (required)"
      echo "  --skip-run                   Skip final 'run agent' step"
      echo ""
      echo "Any missing fields are prompted interactively."
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

############################
# Install Dependencies
############################

function install_command_line_tools() {
  echo "Checking Xcode Command Line Tools..."
  if xcode-select -p &>/dev/null; then
    echo "Xcode Command Line Tools appear installed."
  else
    echo "Installing Xcode Command Line Tools..."
    xcode-select --install || true
    echo "Please accept the GUI prompt if shown. Then re-run if needed."
    sleep 2
  fi
}

function install_homebrew_if_needed() {
  echo "Checking Homebrew..."
  if ! command -v brew &>/dev/null; then
    echo "Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    if [ -d "/opt/homebrew/bin" ]; then
      export PATH="/opt/homebrew/bin:$PATH"
    fi
  else
    echo "Homebrew found."
  fi
}

function install_git_if_needed() {
  echo "Checking Git..."
  if ! command -v git &>/dev/null; then
    echo "Installing Git via Homebrew..."
    brew install git
  else
    echo "Git found."
  fi
}

function install_go_if_needed() {
  echo "Checking Go..."
  if ! command -v go &>/dev/null; then
    echo "Installing Go via Homebrew..."
    brew install go
  else
    echo "Go found."
  fi
}

############################
# Patching NATS WebSocket URL to use ws:// for local development
############################

function patch_nats_websocket_url() {
  echo "Patching agent.go to use ws:// for NATS WebSocket..."
  
  # Print current working directory and list contents for debugging
  echo "Current working directory: $(pwd)"
  
  # Find the agent.go file - use correct path
  local agent_go_file="agent/agent.go"
  
  echo "Checking for agent.go at path: $agent_go_file"
  if [ ! -f "$agent_go_file" ]; then
    echo "ERROR: Cannot find $agent_go_file. Skipping NATS WebSocket URL patch."
    # Try to find agent.go using find command
    echo "Attempting to locate agent.go using find command:"
    find . -name "agent.go" | grep -v test
    return 1
  fi
  
  # Create a backup
  cp "$agent_go_file" "$agent_go_file.bak"
  
  # Replace the wss:// with ws:// in the NATS WebSocket URL construction and use configured port
  # This modifies the line: natsServer = fmt.Sprintf("wss://%s:%s", ac.APIURL, natsProxyPort)
  sed -i '' "s/natsServer = fmt.Sprintf(\"wss:\/\/%s:%s\", ac.APIURL, natsProxyPort)/natsServer = fmt.Sprintf(\"ws:\/\/%s:$NATS_PORT\/natsws\", ac.APIURL)/g" "$agent_go_file"
  
  # Also modify the URL construction when NatsStandardPort is set to use configured port
  sed -i '' "s/natsServer = fmt.Sprintf(\"nats:\/\/%s:%s\", ac.APIURL, ac.NatsStandardPort)/natsServer = fmt.Sprintf(\"ws:\/\/%s:$NATS_PORT\/natsws\", ac.APIURL)/g" "$agent_go_file"
  
  echo "NATS WebSocket URL patch applied to $agent_go_file with port $NATS_PORT"
  
  # Show the diff to verify changes
  echo "Showing diff of changes:"
  diff "$agent_go_file.bak" "$agent_go_file" || true
}

############################
# Aggressive Uninstallation
############################

function aggressive_uninstall() {
  echo ""
  echo "=== Performing Aggressive Uninstallation ==="
  echo "This will remove all components of the Tactical RMM agent..."
  
  # 1. Stop and unload all services
  echo "Stopping and unloading services..."
  sudo launchctl unload /Library/LaunchDaemons/tacticalagent.plist 2>/dev/null || true
  
  # 2. Remove LaunchDaemons
  echo "Removing LaunchDaemons..."
  sudo rm -f /Library/LaunchDaemons/tacticalagent.plist
  sudo rm -f /Library/LaunchDaemons/tacticalagent.plist.bak
  
  # 3. Remove Tactical Agent files and directories
  echo "Removing Tactical Agent files..."
  sudo rm -rf /opt/tacticalagent/
  
  # 4. Clean up any logs
  echo "Cleaning up logs..."
  sudo rm -f /var/log/tacticalagent.log
  
  # 5. Additional cleanup for any other remnants
  echo "Performing additional cleanup..."
  # Search for and remove any other files containing 'tactical' in common locations
  sudo find /opt -name "*tactical*" -exec rm -rf {} \; 2>/dev/null || true
  
  echo "Aggressive uninstallation completed. System is ready for fresh installation."
  echo ""
}

############################
# Prompting for missing inputs
############################

function prompt_if_empty() {
  local varname="$1"
  local prompt_msg="$2"
  local default_val="$3"

  local curr_val="${!varname}"

  if [ -z "$curr_val" ]; then
    if [ -n "$default_val" ]; then
      read -rp "$prompt_msg [$default_val]: " user_inp
      user_inp="${user_inp:-$default_val}"
    else
      read -rp "$prompt_msg: " user_inp
    fi
    eval "$varname=\"\$user_inp\""
  fi
}

############################
# Cloning/Patching/Building
############################

function handle_existing_folder() {
  # If BUILD_FOLDER already exists, check if it's a Git repo
  # If yes, do a fetch/pull
  # If no, prompt to remove or rename
  if [ -d "$BUILD_FOLDER" ]; then
    echo "Folder '$BUILD_FOLDER' already exists."
    cd "$BUILD_FOLDER"
    if [ -d ".git" ]; then
      echo "It appears to be a valid Git repository. Pulling latest changes..."
      git fetch --all
      git checkout "$RMMAGENT_BRANCH"
      git pull
    else
      echo "But it isn't a Git repo (no .git folder)."
      echo "We can either remove it or rename it so we can clone fresh."
      read -rp "Remove folder? (y/N): " REMOVE_CHOICE
      if [[ "$REMOVE_CHOICE" =~ ^[Yy] ]]; then
        cd ..
        rm -rf "$BUILD_FOLDER"
        echo "Removed folder. Now cloning fresh..."
        git clone --branch "$RMMAGENT_BRANCH" "$RMMAGENT_REPO" "$BUILD_FOLDER"
        cd "$BUILD_FOLDER"
      else
        echo "Aborting script. Please specify a different --build-folder or remove the folder manually."
        exit 1
      fi
    fi
  else
    echo "Cloning $RMMAGENT_REPO into '$BUILD_FOLDER'..."
    git clone --branch "$RMMAGENT_BRANCH" "$RMMAGENT_REPO" "$BUILD_FOLDER"
    cd "$BUILD_FOLDER"
  fi
}

function patch_placeholders() {
  echo ""
  echo "Patching code for org/email placeholders (if present)."
  if grep -q 'DefaultOrgName' *.go 2>/dev/null; then
    sed -i.bak "s|DefaultOrgName = \".*\"|DefaultOrgName = \"$ORG_NAME\"|" *.go
  fi
  if grep -q 'DefaultEmail' *.go 2>/dev/null; then
    sed -i.bak "s|DefaultEmail = \".*\"|DefaultEmail = \"$CONTACT_EMAIL\"|" *.go
  fi
}

function compile_rmmagent() {
  echo ""
  echo "Compiling rmmagent for macOS ARM64..."
  env CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 \
    go build -ldflags "-s -w" -o "$OUTPUT_BINARY"

  echo "Compilation done. Output: $(pwd)/$OUTPUT_BINARY"
  file "$OUTPUT_BINARY"
}

function sign_binary_if_requested() {
  if [ -n "$CODESIGN_IDENTITY" ]; then
    echo ""
    echo "Signing with identity: $CODESIGN_IDENTITY"
    xattr -d com.apple.quarantine ./"$OUTPUT_BINARY" 2>/dev/null || true
    codesign --deep --force --options runtime \
      --sign "$CODESIGN_IDENTITY" \
      ./"$OUTPUT_BINARY"
    echo "Code signing done. Checking signature..."
    codesign -dv --verbose=4 ./"$OUTPUT_BINARY" || true
  else
    echo "No code-sign identity provided. Skipping signing."
  fi
}

############################
# Patching the plists to include -log
############################

function patch_agent_plists_with_log() {
  echo ""
  echo "Attempting to patch LaunchDaemons for detailed logging configurations"
  echo "This requires sudo privileges."

  local TACTICAL_PLIST="/Library/LaunchDaemons/tacticalagent.plist"
  
  # Default to a standard log path if none provided
  if [ -z "$AGENT_LOG_PATH" ]; then
    AGENT_LOG_PATH="/var/log/tacticalagent.log"
    echo "No custom log path specified, using default: $AGENT_LOG_PATH"
  fi

  # TacticalAgent plist modifications
  if [ -f "$TACTICAL_PLIST" ]; then
    echo "Backing up and patching tacticalagent.plist with enhanced logging..."
    # Create backup
    sudo cp "$TACTICAL_PLIST" "${TACTICAL_PLIST}.bak"
    
    # Check if ProgramArguments already has debug logging entries
    if sudo /usr/libexec/PlistBuddy -c "Print :ProgramArguments" "$TACTICAL_PLIST" | grep -q -- "-log"; then
      echo "Logging parameters already exist, updating values..."
      # Update existing values
      sudo /usr/libexec/PlistBuddy -c "Delete :ProgramArguments:3" "$TACTICAL_PLIST" 2>/dev/null || true
      sudo /usr/libexec/PlistBuddy -c "Delete :ProgramArguments:3" "$TACTICAL_PLIST" 2>/dev/null || true
      sudo /usr/libexec/PlistBuddy -c "Delete :ProgramArguments:3" "$TACTICAL_PLIST" 2>/dev/null || true
      sudo /usr/libexec/PlistBuddy -c "Delete :ProgramArguments:3" "$TACTICAL_PLIST" 2>/dev/null || true
    fi
    
    # Add logging parameters
    sudo /usr/libexec/PlistBuddy -c "Add :ProgramArguments:3 string '-log'" "$TACTICAL_PLIST" 2>/dev/null || true
    sudo /usr/libexec/PlistBuddy -c "Add :ProgramArguments:4 string 'DEBUG'" "$TACTICAL_PLIST" 2>/dev/null || true
    sudo /usr/libexec/PlistBuddy -c "Add :ProgramArguments:5 string '-logto'" "$TACTICAL_PLIST" 2>/dev/null || true
    sudo /usr/libexec/PlistBuddy -c "Add :ProgramArguments:6 string '$AGENT_LOG_PATH'" "$TACTICAL_PLIST" 2>/dev/null || true

    echo "Reloading LaunchDaemon for tacticalagent..."
    sudo launchctl unload "$TACTICAL_PLIST" 2>/dev/null || true
    sudo launchctl load "$TACTICAL_PLIST" 2>/dev/null || true
    echo "TacticalAgent logging configured to use: $AGENT_LOG_PATH"
  else
    echo "Warning: $TACTICAL_PLIST not found. TacticalAgent may not be installed yet."
  fi
}

############################
# Prompt to run
############################

function prompt_run_agent() {
  echo ""
  echo "=== Build Complete ==="
  echo "You can run the agent with your RMM server & auth key. For example:"
  echo "  ./$OUTPUT_BINARY -m install \\"
  echo "     -api \"$RMM_SERVER_URL\" \\"
  echo "     -auth \"$AGENT_AUTH_KEY\" \\"
  echo "     -client-id <ID> -site-id <ID> -agent-type <server|workstation> \\"
  echo "     -log \"DEBUG\" -logto \"$AGENT_LOG_PATH\""
  echo ""

  if [ "$SKIP_RUN" == "true" ]; then
    echo "Skipping final run (--skip-run)."
    return
  fi

  # If all required parameters are provided, run automatically
  if [ -n "$RMM_SERVER_URL" ] && [ -n "$AGENT_AUTH_KEY" ] && [ -n "$CLIENT_ID" ] && [ -n "$SITE_ID" ]; then
    echo "All required parameters provided, proceeding with installation..."
    RUN_NOW="y"
  else
    read -rp "Do you want to run the agent install command now? (y/N): " RUN_NOW
  fi

  if [[ "$RUN_NOW" =~ ^[Yy] ]]; then
    # Only prompt for values if they weren't provided as arguments
    if [ -z "$CLIENT_ID" ]; then
      read -rp "Enter client-id: " CLIENT_ID
    fi
    if [ -z "$SITE_ID" ]; then
      read -rp "Enter site-id: " SITE_ID
    fi
    if [ -z "$AGENT_TYPE" ]; then
      read -rp "Agent type (server/workstation) [server]: " AGENT_TYPE
      AGENT_TYPE=${AGENT_TYPE:-server}
    fi

    # If no log path was specified, create a default one with timestamp
    if [ -z "$AGENT_LOG_PATH" ]; then
      AGENT_LOG_PATH="/var/log/tacticalagent.log"
      echo "Using default log path: $AGENT_LOG_PATH"
    fi

    local CMD="sudo ./$OUTPUT_BINARY -m install -api \"$RMM_SERVER_URL\" -auth \"$AGENT_AUTH_KEY\" -client-id \"$CLIENT_ID\" -site-id \"$SITE_ID\" -agent-type \"$AGENT_TYPE\" -log \"DEBUG\" -logto \"$AGENT_LOG_PATH\" -nomesh"
    
    echo "Running: $CMD"
    eval "$CMD"

    echo ""
    echo "Agent started with maximum verbosity! Logs will be written to: $AGENT_LOG_PATH"
    echo "To monitor the log in real-time, run: sudo tail -f $AGENT_LOG_PATH"
    
    # After successful install, patch plists with the custom log path
    patch_agent_plists_with_log
    
    echo ""
    echo "You can monitor the agent logs with this command:"
    echo "  sudo tail -f $AGENT_LOG_PATH              # For tactical agent"
  fi

  echo ""
  echo "=== All Done! ==="
  echo "Your agent is at: $(pwd)/$OUTPUT_BINARY"
  echo "Consider notarizing if distributing externally."
}

############################
# Main Script Flow
############################

# 1) Install dependencies
echo "Checking and installing dependencies if needed..."
install_command_line_tools
install_homebrew_if_needed
install_git_if_needed
install_go_if_needed

# Perform aggressive uninstallation before proceeding
aggressive_uninstall

# 2) Prompt for missing fields
echo ""
echo "=== Checking user inputs ==="

function prompt_all_inputs() {
  prompt_if_empty "RMM_SERVER_URL" "RMM Server URL (e.g. https://rmm.myorg.com)"
  prompt_if_empty "AGENT_AUTH_KEY" "Agent Auth Key (string from your RMM)"
  prompt_if_empty "CLIENT_ID" "Client ID"
  prompt_if_empty "SITE_ID" "Site ID"
  prompt_if_empty "AGENT_TYPE" "Agent type (server/workstation) [server]" "server"
  prompt_if_empty "NATS_PORT" "NATS WebSocket port (required)"
  # Only prompt for log path if explicitly requested
  if [ -n "$AGENT_LOG_PATH" ]; then
    prompt_if_empty "AGENT_LOG_PATH" "Agent log path"
  fi
  # Only prompt for codesign if explicitly requested
  if [ -n "$CODESIGN_IDENTITY" ]; then
    prompt_if_empty "CODESIGN_IDENTITY" "Code-sign Identity (Developer ID ...)"
  fi
  prompt_if_empty "BUILD_FOLDER" "Destination build folder" "rmmagent"
}

prompt_all_inputs

# Only show final values and proceed prompt if we're missing required parameters
if [ -z "$RMM_SERVER_URL" ] || [ -z "$AGENT_AUTH_KEY" ] || [ -z "$CLIENT_ID" ] || [ -z "$SITE_ID" ] || [ -z "$NATS_PORT" ]; then
  echo ""
  echo "== Final values =="
  # Only display values that are actually set
  [ -n "$RMM_SERVER_URL" ] && echo " RMM URL         : $RMM_SERVER_URL"
  [ -n "$AGENT_AUTH_KEY" ] && echo " Auth Key        : $AGENT_AUTH_KEY"
  [ -n "$CLIENT_ID" ] && echo " Client ID       : $CLIENT_ID"
  [ -n "$SITE_ID" ] && echo " Site ID         : $SITE_ID"
  [ -n "$AGENT_TYPE" ] && echo " Agent Type      : $AGENT_TYPE"
  [ -n "$NATS_PORT" ] && echo " NATS Port       : $NATS_PORT"
  [ -n "$AGENT_LOG_PATH" ] && echo " Log Path        : $AGENT_LOG_PATH"
  [ -n "$CODESIGN_IDENTITY" ] && echo " CodeSign ID     : $CODESIGN_IDENTITY"
  [ -n "$BUILD_FOLDER" ] && echo " Build Folder    : $BUILD_FOLDER"
  [ -n "$SKIP_RUN" ] && echo " skip-run        : $SKIP_RUN"
  echo ""

  # Only show the proceed prompt if we're not in skip-run mode
  if [ "$SKIP_RUN" != "true" ]; then
    read -rp "Press Enter to proceed, or Ctrl+C to cancel..."
  fi
fi

# 3) Clone & patch & build
handle_existing_folder
patch_nats_websocket_url
patch_placeholders
compile_rmmagent
sign_binary_if_requested

# 4) Prompt to run (and patch plists if installed)
prompt_run_agent