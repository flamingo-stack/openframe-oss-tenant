#!/usr/bin/env bash
#
# build_rmmagent_macos_arm64_args_fixed.sh
#
# Purpose:
#   - Install dependencies (Xcode CLT, Homebrew, Git, Go) on Apple Silicon macOS
#   - Accept script args or prompt for org name, email, RMM URL, agent key, code-sign identity, log path, build folder
#   - Clone, patch, compile rmmagent for macOS ARM64, optionally sign
#   - Prompt to run agent or skip
#   - **After install, automatically patch the LaunchDaemons plists** so that both
#     the Tactical Agent and Mesh Agent use the custom log path (if provided).
#
# Usage Examples:
#   1) Interactive mode:
#        ./build_rmmagent_macos_arm64_args_fixed.sh
#   2) Provide some or all args:
#        ./build_rmmagent_macos_arm64_args_fixed.sh --org-name "OpenFrame" --rmm-url "http://localhost:8000" ...
#   3) Non-interactive (all args):
#        ./build_rmmagent_macos_arm64_args_fixed.sh --org-name "MyOrg" ... --skip-run
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
      echo "  --codesign-identity <IDENT>  Apple Developer ID for signing"
      echo "  --log-path <PATH>            Agent log file path"
      echo "  --build-folder <FOLDER>      Where to clone and compile (default: rmmagent)"
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
  # Only do this if a custom log path is set
  if [ -z "$AGENT_LOG_PATH" ]; then
    return
  fi

  echo ""
  echo "Attempting to patch LaunchDaemons to include custom log path: $AGENT_LOG_PATH"
  echo "This requires sudo privileges."

  local TACTICAL_PLIST="/Library/LaunchDaemons/tacticalagent.plist"
  local MESH_PLIST="/Library/LaunchDaemons/meshagent.plist"

  # 1) TacticalAgent - add: -log /path
  if [ -f "$TACTICAL_PLIST" ]; then
    echo "Patching tacticalagent.plist with '-log' argument..."
    /usr/libexec/PlistBuddy -c "Add :ProgramArguments:3 string '-log'" \
                            -c "Add :ProgramArguments:4 string '$AGENT_LOG_PATH'" "$TACTICAL_PLIST" 2>/dev/null || {
      # If 'Add' fails because the items already exist, try 'Set'
      /usr/libexec/PlistBuddy -c "Set :ProgramArguments:3 '-log'" \
                              -c "Set :ProgramArguments:4 '$AGENT_LOG_PATH'" "$TACTICAL_PLIST" 2>/dev/null || true
    }

    echo "Reloading LaunchDaemon for tacticalagent..."
    launchctl unload "$TACTICAL_PLIST" 2>/dev/null || true
    launchctl load "$TACTICAL_PLIST" 2>/dev/null || true
  else
    echo "Warning: $TACTICAL_PLIST not found. Possibly the tactical agent did not install or used a different name."
  fi

  # 2) MeshAgent - add: --logfile /path
  if [ -f "$MESH_PLIST" ]; then
    echo "Patching meshagent.plist with '--logfile' argument..."
    /usr/libexec/PlistBuddy -c "Add :ProgramArguments:3 string '--logfile'" \
                            -c "Add :ProgramArguments:4 string '$AGENT_LOG_PATH'" "$MESH_PLIST" 2>/dev/null || {
      # If 'Add' fails because items exist, try 'Set'
      /usr/libexec/PlistBuddy -c "Set :ProgramArguments:3 '--logfile'" \
                              -c "Set :ProgramArguments:4 '$AGENT_LOG_PATH'" "$MESH_PLIST" 2>/dev/null || true
    }

    echo "Reloading LaunchDaemon for meshagent..."
    launchctl unload "$MESH_PLIST" 2>/dev/null || true
    launchctl load "$MESH_PLIST" 2>/dev/null || true
  else
    echo "Warning: $MESH_PLIST not found. Possibly the mesh agent did not install or used a different name."
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
  echo "     -client-id <ID> -site-id <ID> -agent-type <server|workstation>"
  if [ -n "$AGENT_LOG_PATH" ]; then
    echo "     -log \"$AGENT_LOG_PATH\""
  fi
  echo ""

  if [ "$SKIP_RUN" == "true" ]; then
    echo "Skipping final run (--skip-run)."
    return
  fi

  read -rp "Do you want to run the agent install command now? (y/N): " RUN_NOW
  if [[ "$RUN_NOW" =~ ^[Yy] ]]; then
    echo ""
    read -rp "Enter client-id: " CLIENT_ID
    read -rp "Enter site-id: " SITE_ID
    read -rp "Agent type (server/workstation) [server]: " AGENT_TYPE
    AGENT_TYPE=${AGENT_TYPE:-server}

    local CMD="./$OUTPUT_BINARY -m install -api \"$RMM_SERVER_URL\" -auth \"$AGENT_AUTH_KEY\" -client-id \"$CLIENT_ID\" -site-id \"$SITE_ID\" -agent-type \"$AGENT_TYPE\""
    if [ -n "$AGENT_LOG_PATH" ]; then
      CMD="$CMD -log \"$AGENT_LOG_PATH\""
    fi

    echo "Running: $CMD"
    eval "$CMD"

    # After successful install, patch plists with the custom log path
    # (Requires sudo if not running script with root privileges.)
    patch_agent_plists_with_log
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

# 2) Prompt for missing fields
echo ""
echo "=== Checking user inputs ==="

function prompt_all_inputs() {
  prompt_if_empty "ORG_NAME"       "Organization Name (e.g. MyOrg)"
  prompt_if_empty "CONTACT_EMAIL"  "Contact Email (e.g. support@myorg.com)"
  prompt_if_empty "RMM_SERVER_URL" "RMM Server URL (e.g. https://rmm.myorg.com)"
  prompt_if_empty "AGENT_AUTH_KEY" "Agent Auth Key (string from your RMM)"
  prompt_if_empty "AGENT_LOG_PATH" "Optional agent log path? (Press Enter to skip)" ""
  prompt_if_empty "CODESIGN_IDENTITY" "Code-sign Identity (Developer ID ...) (Press Enter to skip)" ""
  prompt_if_empty "BUILD_FOLDER" "Destination build folder" "rmmagent"
}

prompt_all_inputs

echo ""
echo "== Final values =="
echo " Org Name        : $ORG_NAME"
echo " Email           : $CONTACT_EMAIL"
echo " RMM URL         : $RMM_SERVER_URL"
echo " Auth Key        : $AGENT_AUTH_KEY"
echo " Log Path        : $AGENT_LOG_PATH"
echo " CodeSign ID     : $CODESIGN_IDENTITY"
echo " Build Folder    : $BUILD_FOLDER"
echo " skip-run        : $SKIP_RUN"
echo ""

read -rp "Press Enter to proceed, or Ctrl+C to cancel..."

# 3) Clone & patch & build
handle_existing_folder
patch_placeholders
compile_rmmagent
sign_binary_if_requested

# 4) Prompt to run (and patch plists if installed)
prompt_run_agent