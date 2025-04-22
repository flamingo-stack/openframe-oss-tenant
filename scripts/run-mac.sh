#!/bin/bash

# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Default values
SILENT=false
HELP=false
REPO_URL_HTTPS="https://github.com/Flamingo-CX/openframe.git"
REPO_URL_GIT="git@github.com:Flamingo-CX/openframe.git"

# Function to display messages based on silent mode
write_status_message() {
    local message=$1
    local color=${2:-""}
    local important=${3:-false}

    if [ "$SILENT" = false ] || [ "$important" = true ]; then
        if [ -n "$color" ]; then
            echo -e "$color$message\033[0m"
        else
            echo "$message"
        fi
    fi
}

# Function to check if running as root
# check_root() {
#     if [ "$EUID" -ne 0 ]; then
#         write_status_message "This script requires root privileges. Please run with sudo." "\033[33m" true
#         exit 1
#     fi
# }

# Function to check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then return 1; fi
    return 0
}

# Function to get installation commands based on OS
verify_command() {
    local cmd=$1

    case $cmd in
        "git")
            brew install git
            ;;
        "docker")
            brew install --cask docker

            # Check docker daemon is running
            if ! docker ps > /dev/null 2>&1; then
                docker desktop start
            fi

            write_status_message "Docker installed successfully!" "\033[32m"
            write_status_message "Please log out and back in for group changes to take effect." "\033[33m"
            write_status_message "After logging back in, run this script again." "\033[33m"
            ;;
        "helm")
            brew install helm
            ;;
        "kubectl")
            brew install kubectl
            ;;
        "telepresence")
            brew install telepresenceio/telepresence/telepresence-oss
            ;;
        "skaffold")
            brew install skaffold
            ;;
        "jq")
            brew install jq
            ;;
        "k3d")
            brew install k3d
    esac
}

# Check Homebrew installation
write_status_message "Checking Homebrew installation..." "\033[36m"
if ! command -v brew &> /dev/null; then
    write_status_message "Homebrew not found. Installing Homebrew..." "\033[33m"
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    write_status_message "Homebrew installed successfully!" "\033[32m"
else
    write_status_message "Homebrew is already installed." "\033[32m"
fi

# Check all commands and collect results
missing_commands=()
commands=("docker" "helm" "kubectl" "telepresence" "skaffold" "jq" "k3d")

for cmd in "${commands[@]}"; do
    if ! check_command "$cmd"; then
        missing_commands+=("$cmd")
    fi
done

if [ ${#missing_commands[@]} -ne 0 ]; then
    write_status_message "The following required commands are missing: ${missing_commands[*]}" "\033[33m"
else
    echo "All required commands are installed"
fi

# Main installation process
write_status_message "Starting OpenFrame installation process..." "\033[32m" true

# # Check root privileges
# check_root

# Install required packages
for cmd in "${missing_commands[@]}"; do
    write_status_message "Installing $cmd..." "\033[36m"
    verify_command "$cmd"
done

# Check if swap needs to be configured
RECOMMENDED_MEMORY=24576
TOTAL_MEMORY=$(sysctl hw.memsize | awk '{print int($2/1024/1024)}')
AVAILABLE_MEMORY=$(top -l 1 | grep PhysMem | awk '{print $8}' | sed 's/G//' | awk '{printf "%.0f\n", $1 * 1024}')
FREE_SPACE=$(df -m / | grep -v Avail | awk '{print $4}')
CURRENT_SWAP=$(sysctl vm.swapusage | awk '{print $4}' | sed 's/M//' | awk '{printf "%.0f\n", $1}')

if [ "$AVAILABLE_MEMORY" -lt "$RECOMMENDED_MEMORY" ] || [ $((CURRENT_SWAP + AVAILABLE_MEMORY)) -lt "$RECOMMENDED_MEMORY" ]; then
    SWAP_SIZE=$(echo "scale=2; ($RECOMMENDED_MEMORY - $AVAILABLE_MEMORY)" | bc)
    RESERVED_SPACE=2048  # Reserve 2GB for OS
    write_status_message "System has less than ${RECOMMENDED_MEMORY}MB of free RAM (${AVAILABLE_MEMORY}MB)" "\033[33m"
    write_status_message "Recommended swap size: ${SWAP_SIZE}MB" "\033[33m"
    write_status_message "Available disk space: ${FREE_SPACE}MB (Reserving ${RESERVED_SPACE}MB for OS)" "\033[33m"

    if [ "${FREE_SPACE%.*}" -lt "$(echo "${SWAP_SIZE%.*} + $RESERVED_SPACE" | bc)" ]; then
        write_status_message "Not enough free space on / to create swap (Need: ${SWAP_SIZE}MB + ${RESERVED_SPACE}MB reserved, Have: ${FREE_SPACE}MB)" "\033[31m"
        exit 1
    else
        write_status_message "Creating swap file with ${SWAP_SIZE}MB..." "\033[32m"
        echo "Running as root, adjusting swap settings"
        # MacOS dynamic pager settings
        sudo sysctl -w vm.swapfile.maxpages=$((SWAP_SIZE * 256))
    fi
fi

# Handle repository
REPO_PATH=$(pwd)
write_status_message "Working with repository at $REPO_PATH..." "\033[36m"

if [ ! -d "$REPO_PATH/.git" ]; then
    write_status_message "Current directory is not a Git repository." "\033[33m"

    if [ "$SILENT" = true ]; then
        write_status_message "Cloning OpenFrame repository to current directory..." "\033[33m"
        git clone $REPO_URL . --depth 1
        if [ $? -ne 0 ]; then
            write_status_message "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." "\033[31m"
            exit 1
        fi
        write_status_message "OpenFrame repository cloned successfully!" "\033[32m"
    else
        read -p "Do you want to clone the OpenFrame repository in the current directory? (Y/N): " clone_here
        if [[ $clone_here =~ ^[Yy]$ ]]; then
            if [ -n "$(ls -A $REPO_PATH)" ]; then
                read -p "Warning: The current directory is not empty. Continue with cloning? (Y/N): " force_clone
                if [[ ! $force_clone =~ ^[Yy]$ ]]; then
                    write_status_message "Operation cancelled by user." "\033[31m"
                    exit 1
                fi
            fi
            write_status_message "Cloning OpenFrame repository to current directory..." "\033[33m"
            git clone $REPO_URL .
            if [ $? -ne 0 ]; then
                write_status_message "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." "\033[31m"
                exit 1
            fi
            write_status_message "OpenFrame repository cloned successfully!" "\033[32m"
        else
            read -p "Please enter the full path where you want to clone the repository: " custom_path
            if [ ! -d "$custom_path" ]; then
                read -p "Directory does not exist. Create it? (Y/N): " create_dir
                if [[ $create_dir =~ ^[Yy]$ ]]; then
                    mkdir -p "$custom_path"
                else
                    write_status_message "Operation cancelled by user." "\033[31m"
                    exit 1
                fi
            fi
            write_status_message "Cloning OpenFrame repository to $custom_path..." "\033[33m"
            git clone $REPO_URL "$custom_path"
            if [ $? -ne 0 ]; then
                write_status_message "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." "\033[31m"
                exit 1
            fi
            write_status_message "OpenFrame repository cloned successfully!" "\033[32m"
            REPO_PATH="$custom_path"
        fi
    fi
else
    # Check if the repository is already cloned
    if [ $REPO_URL_HTTPS != $(git remote get-url origin) ] && [ $REPO_URL_GIT != $(git remote get-url origin) ]; then
        write_status_message "Current directory contains a different repository." "\033[33m"
        exit 1
    else
        write_status_message "Current directory is a Git repository." "\033[32m"
    fi
fi

# Find and run the run.sh script
write_status_message "Searching for run.sh in the repository..." "\033[36m"

# Find run.sh in the repository
RUN_SCRIPT=$(find "$REPO_PATH" -name "run.sh" -type f -print -quit)
echo $RUN_SCRIPT

if [ -n "$RUN_SCRIPT" ]; then
    write_status_message "Found run.sh at: $RUN_SCRIPT" "\033[32m"

    # Handle GitHub token
    if [ -z "$GITHUB_TOKEN_CLASSIC" ]; then
        read -p "Please enter your GitHub token (leave empty if not needed): " GITHUB_TOKEN_CLASSIC
        if [ -n "$GITHUB_TOKEN_CLASSIC" ]; then
            export GITHUB_TOKEN_CLASSIC
            write_status_message "GitHub token has been set for this session." "\033[32m"
        fi
    else
        write_status_message "Using existing GITHUB_TOKEN_CLASSIC from environment." "\033[32m"
    fi

    # Set environment variables for silent mode
    if [ "$SILENT" = true ]; then
        write_status_message "Setting environment variables for silent mode..." "\033[32m"
        export SILENT=true
        export OPENFRAME_SILENT=true
        export OPENFRAME_NONINTERACTIVE=true
        export OPENFRAME_AUTO_APPROVE=true
    fi

    # Execute run.sh with arguments
    cd "$(dirname "$RUN_SCRIPT")"
    ./run.sh $@
else
    write_status_message "No run.sh script found in the repository. Please check the repository structure." "\033[31m"
    exit 1
fi
