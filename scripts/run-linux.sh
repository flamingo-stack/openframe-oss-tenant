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
    if ! command -v "$1" &>/dev/null; then return 1; fi
    return 0
}

# Function to get installation commands based on OS
verify_command() {
    local cmd=$1

    case $cmd in
    "git")
        if [[ "$(grep ID_LIKE /etc/os-release)" == "debian"* ]]; then
            sudo apt -y install git
        elif [[ "$(grep ID_LIKE /etc/os-release)" == "rhel"* ]]; then
            sudo yum -y install git
        fi
        ;;
    "docker")
        curl -fsSL https://get.docker.com | sh

        # Enable and start docker service
        sudo systemctl enable --now docker

        # Add current user to docker group
        usermod -aG docker "$SUDO_USER"

        # Check docker daemon is running
        if ! docker ps >/dev/null 2>&1; then
            sudo systemctl start docker
        fi

        # Check docker buildx is installed
        if ! docker buildx version >/dev/null 2>&1; then
            sudo docker buildx install
        fi

        write_status_message "Docker installed successfully!" "\033[32m"
        write_status_message "Please log out and back in for group changes to take effect." "\033[33m"
        write_status_message "After logging back in, run this script again." "\033[33m"
        ;;
    "helm")
        curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && chmod 700 get_helm.sh && ./get_helm.sh
        ;;
    "argocd")
        curl -sSL -o argocd https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-amd64 && sudo chmod +x argocd && sudo mv argocd /usr/local/bin/
        ;;
    "kubectl")
        curl -LOs https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x kubectl && sudo mv kubectl /usr/local/bin/
        ;;
    "telepresence")
        curl -fsSL https://github.com/telepresenceio/telepresence/releases/download/v2.22.4/telepresence-linux-amd64 -o /usr/local/bin/telepresence && sudo chmod a+x /usr/local/bin/telepresence
        ;;
    "skaffold")
        curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/
        ;;
    "jq")
        if [[ "$(grep ID_LIKE /etc/os-release)" == "debian"* ]]; then
            if ! command_exists git; then
                sudo apt -y install jq
            fi
        elif [[ "$(grep ID_LIKE /etc/os-release)" == "rhel"* ]]; then
            if ! command_exists git; then
                sudo yum -y install jq
            fi
        fi
        ;;
    "k3d")
        curl -s https://raw.githubusercontent.com/k3d-io/k3d/main/install.sh | bash
        ;;
    "kustomize")
        curl -s "https://raw.githubusercontent.com/kubernetes-sigs/kustomize/master/hack/install_kustomize.sh" | bash
        ;;
    esac
}

# Check all commands and collect results
missing_commands=()
commands=("docker" "helm" "argocd" "kubectl" "telepresence" "skaffold" "jq" "k3d")

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

current_value=$(sysctl -n fs.inotify.max_user_instances || echo "0")
if [[ $current_value -lt 1500 ]]; then
    echo "Setting fs.inotify.max_user_instances to 1500"
    sudo sysctl fs.inotify.max_user_instances=1500 &&
        sudo sysctl -p
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
RECOMMENDED_MEMORY=20480
TOTAL_MEMORY_MEMORY=$(free -m | grep "Mem:" | awk '{print $2}')
AVAILABLE_MEMORY=$(free -m | grep "Mem:" | awk '{print $7}')
FREE_SPACE=$(df -BM / | grep -v Avail | awk '{print $4}' | sed 's/M//')
CURRENT_SWAP=$(free -m | grep "Swap:" | awk '{print $4}')
TOTAL_AVAILABLE_MEMORY=$((AVAILABLE_MEMORY + CURRENT_SWAP))

if [ "$TOTAL_AVAILABLE_MEMORY" -lt "$RECOMMENDED_MEMORY" ]; then
    SWAP_SIZE=$(echo "scale=2; ($RECOMMENDED_MEMORY - $TOTAL_AVAILABLE_MEMORY)" | bc)
    RESERVED_SPACE=2048 # Reserve 2GB for OS
    write_status_message "System has less than ${RECOMMENDED_MEMORY}MB of total memory (RAM: ${AVAILABLE_MEMORY}MB, Swap: ${CURRENT_SWAP}MB)" "\033[33m"
    write_status_message "Additional swap needed: ${SWAP_SIZE}MB" "\033[33m"
    write_status_message "Current swap: ${CURRENT_SWAP}MB" "\033[33m"
    write_status_message "Available disk space: ${FREE_SPACE}MB (Reserving ${RESERVED_SPACE}MB for OS)" "\033[33m"
    if [ "${FREE_SPACE%.*}" -lt "$(echo "${SWAP_SIZE%.*} + $RESERVED_SPACE" | bc)" ]; then
        write_status_message "Not enough free space on / to create swap (Need: "$(echo "${SWAP_SIZE%.*} + $RESERVED_SPACE" | bc)"MB, Have: ${FREE_SPACE}MB)" "\033[31m"
        exit 1
    else
        # If swap exists, turn it off first
        if $swap_exists; then
            echo "Disabling existing swap first"
            sudo swapoff -a
        fi
        write_status_message "Creating swap file with ${SWAP_SIZE}MB..." "\033[32m"
        sudo fallocate -l ${SWAP_SIZE}M /swapfile
        sudo chmod 600 /swapfile
        sudo mkswap /swapfile
        sudo swapon /swapfile
        sudo sysctl vm.swappiness=10

        # Make swap permanent by adding to fstab if not already there
        if ! grep -q "/swapfile" /etc/fstab; then
            echo "Adding swap entry to /etc/fstab"
            # Remove any existing swap entries first
            sudo sed -i '/swap/d' /etc/fstab
            echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
        fi

        echo "Swap file configured and enabled"
        swapon --show

    fi
fi

# Docker memory limit check
DOCKER_MEMORY_LIMIT=$(docker info --format '{{.MemTotal}}')
DOCKER_MEMORY_LIMIT_MB=$((DOCKER_MEMORY_LIMIT / 1024 / 1024))

if [ "$DOCKER_MEMORY_LIMIT_MB" -lt "$RECOMMENDED_MEMORY" ]; then
    write_status_message "Docker is configured with only ${DOCKER_MEMORY_LIMIT_MB}MB of memory. Recommended: ${RECOMMENDED_MEMORY}MB." "\033[31m"
    write_status_message "Please increase Docker Desktop memory allocation (Settings → Resources → Memory)." "\033[33m"
    exit 1
else
    write_status_message "Docker memory allocation is sufficient: ${DOCKER_MEMORY_LIMIT_MB}MB." "\033[32m"
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
    systemd-inhibit --what=shutdown:sleep:idle:handle-lid-switch --why="Deployment running" \
        bash ./run.sh $@
else
    write_status_message "No run.sh script found in the repository. Please check the repository structure." "\033[31m"
    exit 1
fi
