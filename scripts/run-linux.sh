#!/bin/bash

# OpenFrame Installation Script
# This script checks for and installs the required components for OpenFrame

# Default values
SILENT=false
HELP=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            HELP=true
            shift
            ;;
        -s|--silent)
            SILENT=true
            shift
            ;;
        *)
            RUN_ARGS+=("$1")
            shift
            ;;
    esac
done

# Show help information and exit if -h or --help is specified
if [ "$HELP" = true ] && [ ${#RUN_ARGS[@]} -eq 0 ]; then
    cat << EOF
OpenFrame Installation Script
Usage: ./run-linux.sh [-h|--help] [-s|--silent] [COMMAND]

Options:
    -h, --help     Show this help message and exit
    -s, --silent   Run in silent mode (suppress non-essential output and skip confirmations)

Commands (passed to run.sh):
    bootstrap, b        Bootstrap whole cluster with all apps
    platform, p        Bootstrap platform only
    app, a [name]      Manage specific app
    cluster, k         Setup cluster
    pre               Run pre-checks
    swap, s           Setup swap
    delete, d         Delete cluster
    cleanup, c        Cleanup resources
    start             Start cluster
    stop              Stop cluster
    -h, --help        Show run.sh help message

Examples:
    ./run-linux.sh -s bootstrap     # Run bootstrap in silent mode
    ./run-linux.sh -s app nginx deploy    # Deploy nginx app in silent mode
    ./run-linux.sh platform              # Setup platform in interactive mode
    ./run-linux.sh --help                # Show this help message
    ./run-linux.sh app --help            # Show run.sh help message
EOF
    exit 0
fi

# Function to handle user confirmations based on silent mode
get_user_confirmation() {
    local message=$1
    local default_yes=${2:-true}
    
    if [ "$SILENT" = true ]; then
        return $([ "$default_yes" = true ] && echo 0 || echo 1)
    fi
    
    read -p "$message (Y/N): " response
    case $response in
        [Yy]* ) return 0;;
        [Nn]* ) return 1;;
        * ) return $([ "$default_yes" = true ] && echo 0 || echo 1);;
    esac
}

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
check_root() {
    if [ "$EUID" -ne 0 ]; then
        write_status_message "This script requires root privileges. Please run with sudo." "\033[33m" true
        exit 1
    fi
}

# Function to check and install Docker
check_docker() {
    write_status_message "Checking Docker installation..." "\033[36m"
    if ! command -v docker &> /dev/null; then
        write_status_message "Docker not found. Installing Docker..." "\033[33m"
        
        # Install Docker using the convenience script
        curl -fsSL https://get.docker.com -o get-docker.sh
        sh get-docker.sh
        rm get-docker.sh
        
        # Add current user to docker group
        usermod -aG docker "$SUDO_USER"
        
        write_status_message "Docker installed successfully!" "\033[32m"
        write_status_message "Please log out and back in for group changes to take effect." "\033[33m"
        write_status_message "After logging back in, run this script again." "\033[33m"
        exit 0
    else
        write_status_message "Docker is already installed." "\033[32m"
    fi
}

# Function to check and install Kind
check_kind() {
    write_status_message "Checking Kind installation..." "\033[36m"
    if ! command -v kind &> /dev/null; then
        write_status_message "Kind not found. Installing Kind..." "\033[33m"
        
        # Install Kind
        curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.11.1/kind-linux-amd64
        chmod +x ./kind
        mv ./kind /usr/local/bin/kind
        
        write_status_message "Kind installed successfully!" "\033[32m"
    else
        write_status_message "Kind is already installed." "\033[32m"
    fi
}

# Function to check and install Git
check_git() {
    write_status_message "Checking Git installation..." "\033[36m"
    if ! command -v git &> /dev/null; then
        write_status_message "Git not found. Installing Git..." "\033[33m"
        
        # Install Git
        apt-get update
        apt-get install -y git
        
        write_status_message "Git installed successfully!" "\033[32m"
    else
        write_status_message "Git is already installed." "\033[32m"
    fi
}

# Main installation process
write_status_message "Starting OpenFrame installation process..." "\033[32m" true

# Check root privileges
check_root

# Install required packages
check_docker
check_git
check_kind

# Handle repository
REPO_PATH=$(pwd)
write_status_message "Working with repository at $REPO_PATH..." "\033[36m"

if [ ! -d "$REPO_PATH/.git" ]; then
    write_status_message "Current directory is not a Git repository." "\033[33m"
    
    if [ "$SILENT" = true ]; then
        write_status_message "Cloning OpenFrame repository to current directory..." "\033[33m"
        git clone https://github.com/openframe/openframe.git .
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
            git clone https://github.com/openframe/openframe.git .
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
            git clone https://github.com/openframe/openframe.git "$custom_path"
            if [ $? -ne 0 ]; then
                write_status_message "Failed to clone the OpenFrame repository. Please check the URL and your internet connection." "\033[31m"
                exit 1
            fi
            write_status_message "OpenFrame repository cloned successfully!" "\033[32m"
            REPO_PATH="$custom_path"
        fi
    fi
else
    write_status_message "Current directory is a Git repository." "\033[32m"
fi

# Find and run the run.sh script
write_status_message "Searching for run.sh in the repository..." "\033[36m"

# Find run.sh in the repository
RUN_SCRIPT=$(find "$REPO_PATH" -name "run.sh" -type f -print -quit)

if [ -n "$RUN_SCRIPT" ]; then
    write_status_message "Found run.sh at: $RUN_SCRIPT" "\033[32m"
    
    # Always ask for GitHub token
    read -p "Please enter your GitHub token (leave empty if not needed): " github_token
    
    if [ -n "$github_token" ]; then
        export GITHUB_TOKEN_CLASSIC="$github_token"
        write_status_message "GitHub token will be set for this session." "\033[32m"
    fi
    
    # Set environment variables for silent mode
    if [ "$SILENT" = true ]; then
        export OPENFRAME_SILENT=true
        export OPENFRAME_NONINTERACTIVE=true
        export OPENFRAME_AUTO_APPROVE=true
    fi
    
    # Execute run.sh with arguments
    cd "$(dirname "$RUN_SCRIPT")"
    if [ ${#RUN_ARGS[@]} -eq 0 ]; then
        ./run.sh --help
    else
        ./run.sh "${RUN_ARGS[@]}"
    fi
    
    # Ask for confirmation in interactive mode
    if [ "$SILENT" = false ]; then
        read -p "Press Enter when the script has completed (or Ctrl+C to exit)"
    fi
else
    write_status_message "No run.sh script found in the repository. Please check the repository structure." "\033[31m"
    exit 1
fi

write_status_message "OpenFrame installation and setup process completed!" "\033[32m" true