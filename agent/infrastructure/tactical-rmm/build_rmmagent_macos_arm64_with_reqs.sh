#!/usr/bin/env bash
#
# build_rmmagent_macos_arm64_with_reqs.sh
#
# Purpose:
#   1) Check for and install necessary dependencies on Apple Silicon macOS:
#      - Xcode Command Line Tools
#      - Homebrew
#      - Git
#      - Go
#   2) Prompt the user for custom info (org name, email, RMM URL, agent auth key).
#   3) Compile the Tactical RMM agent for macOS (ARM64), optionally patching
#      placeholders for org/email in the source code.
#   4) Prompt to run the new agent with user-supplied parameters.
#
# Usage:
#   chmod +x build_rmmagent_macos_arm64_with_reqs.sh
#   ./build_rmmagent_macos_arm64_with_reqs.sh
#
#   You can place this script anywhere. Upon success, a 'rmmagent-mac-arm64'
#   binary will appear in the 'rmmagent' folder.
#
# Requirements:
#   - Must be run on Apple Silicon (M1/M2) macOS with internet access.
#   - Script may prompt for sudo or Apple EULA acceptance.


set -e

### --- CONFIGURABLES ---
RMMAGENT_REPO="https://github.com/amidaware/rmmagent.git"
RMMAGENT_BRANCH="master"
BUILD_FOLDER="rmmagent"
OUTPUT_BINARY="rmmagent-mac-arm64"


#######################################
# 1) Ensure Xcode Command Line Tools  #
#######################################

function install_command_line_tools() {
  echo "Checking Xcode Command Line Tools..."

  # Check if CLT is installed by checking presence of 'git' in /Library/Developer/CommandLineTools or developer directory
  # A simpler approach: if xcode-select -p returns a path, we assume it's installed. We'll do both checks.
  if xcode-select -p &>/dev/null; then
    echo "Xcode Command Line Tools appear to be installed."
  else
    echo "Xcode Command Line Tools not found. Attempting to install..."
    # This command triggers a GUI prompt for installation
    xcode-select --install || true
    # The user must click "Install" in the popup. There's no truly automated way around it.
    echo "Please complete the installation in the GUI prompt if it appears, then re-run the script if needed."
    echo "Continuing to see if the CLT might be partially installed..."
  fi

  # If the user just installed them, they might need to accept license or re-run. We'll keep going.
  sleep 2
}

#######################################
# 2) Ensure Homebrew, Git, Go        #
#######################################

function install_homebrew_if_needed() {
  echo "Checking Homebrew..."
  if ! command -v brew &>/dev/null; then
    echo "Homebrew not found. Installing Homebrew..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    # for Apple Silicon, brew might install to /opt/homebrew
    # We may need to update PATH after installing
    if [ -d "/opt/homebrew/bin" ]; then
      export PATH="/opt/homebrew/bin:$PATH"
    fi
  else
    echo "Homebrew is installed."
  fi
}

function install_git_if_needed() {
  echo "Checking Git..."
  if ! command -v git &>/dev/null; then
    echo "Installing Git via Homebrew..."
    brew install git
  else
    echo "Git is installed."
  fi
}

function install_go_if_needed() {
  echo "Checking Go..."
  if ! command -v go &>/dev/null; then
    echo "Installing Go via Homebrew..."
    brew install go
  else
    echo "Go is installed."
  fi
}


#######################################
# 3) Prompt for RMM config values    #
#######################################

function prompt_user_inputs() {
  echo ""
  echo "=== Configure your custom agent build ==="

  read -rp "Organization Name (e.g. MyOrg): " ORG_NAME
  read -rp "Contact Email (e.g. support@myorg.com): " CONTACT_EMAIL
  read -rp "RMM Server URL (e.g. https://rmm.myorg.com): " RMM_SERVER_URL
  read -rp "Agent Auth Key (string from your RMM): " AGENT_AUTH_KEY

  echo ""
  echo "=== Summary of inputs ==="
  echo "Org Name       : $ORG_NAME"
  echo "Contact Email  : $CONTACT_EMAIL"
  echo "RMM Server URL : $RMM_SERVER_URL"
  echo "Agent Auth Key : $AGENT_AUTH_KEY"
  echo ""

  read -rp "Press Enter to proceed with build, or Ctrl+C to cancel..."
}


#######################################
# 4) Clone/Update rmmagent, Patch Code, Build
#######################################

function build_rmmagent() {
  # Clone or update
  if [ -d "$BUILD_FOLDER" ]; then
    echo "Repository folder '$BUILD_FOLDER' found. Pulling latest changes..."
    cd "$BUILD_FOLDER"
    git fetch --all
    git checkout "$RMMAGENT_BRANCH"
    git pull
  else
    echo "Cloning rmmagent into '$BUILD_FOLDER'..."
    git clone --branch "$RMMAGENT_BRANCH" "$RMMAGENT_REPO" "$BUILD_FOLDER"
    cd "$BUILD_FOLDER"
  fi

  # Patch placeholders (org/email) if they exist
  echo ""
  echo "Patching source code with org name and email (if placeholders exist)..."
  if grep -q 'DefaultOrgName' *.go 2>/dev/null; then
    sed -i.bak "s|DefaultOrgName = \".*\"|DefaultOrgName = \"$ORG_NAME\"|" *.go
  fi
  if grep -q 'DefaultEmail' *.go 2>/dev/null; then
    sed -i.bak "s|DefaultEmail = \".*\"|DefaultEmail = \"$CONTACT_EMAIL\"|" *.go
  fi

  # Build for Apple Silicon macOS
  echo ""
  echo "Compiling for macOS (ARM64)..."
  env CGO_ENABLED=0 GOOS=darwin GOARCH=arm64 \
    go build -ldflags "-s -w" -o "$OUTPUT_BINARY"

  echo ""
  echo "Compilation done. Output: $BUILD_FOLDER/$OUTPUT_BINARY"
  file "$OUTPUT_BINARY"
}


#######################################
# 5) Prompt to run new agent         #
#######################################

function prompt_run_agent() {
  echo ""
  echo "=== Build Complete ==="
  echo "You can run the agent with your RMM server and key. For example:"
  echo "  ./${OUTPUT_BINARY} -m install -api \"$RMM_SERVER_URL\" -auth \"$AGENT_AUTH_KEY\" \\"
  echo "       -client-id <ID> -site-id <ID> -agent-type <server|workstation>"
  echo ""

  read -rp "Do you want to run the agent install command now? (y/N): " RUN_NOW
  if [[ "$RUN_NOW" =~ ^[Yy] ]]; then
    echo ""
    read -rp "Enter client-id: " CLIENT_ID
    read -rp "Enter site-id: " SITE_ID
    read -rp "Agent type (server/workstation) [server]: " AGENT_TYPE
    AGENT_TYPE=${AGENT_TYPE:-server}  # default to 'server'

    echo ""
    echo "Running: ./${OUTPUT_BINARY} -m install -api \"$RMM_SERVER_URL\" -auth \"$AGENT_AUTH_KEY\" \\"
    echo "         -client-id \"$CLIENT_ID\" -site-id \"$SITE_ID\" -agent-type \"$AGENT_TYPE\""
    echo ""

    ./"$OUTPUT_BINARY" \
      -m install \
      -api "$RMM_SERVER_URL" \
      -auth "$AGENT_AUTH_KEY" \
      -client-id "$CLIENT_ID" \
      -site-id "$SITE_ID" \
      -agent-type "$AGENT_TYPE"
  fi

  echo ""
  echo "=== All Done! ==="
  echo "Your custom agent binary is at: $(pwd)/$OUTPUT_BINARY"
  echo "Remember to code-sign or notarize if you plan to distribute externally."
}


#####################
# Main script flow  #
#####################

# 1) Command Line Tools
install_command_line_tools

# 2) Install dependencies via Homebrew
install_homebrew_if_needed
install_git_if_needed
install_go_if_needed

# 3) Prompt user for details
prompt_user_inputs

# 4) Build the agent
build_rmmagent

# 5) Prompt to run the agent
prompt_run_agent