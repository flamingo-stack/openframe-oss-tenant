#!/bin/bash

# Check if max_user_instances is less than 1500
if [ $OS == "Linux" ]; then
  current_value=$(sysctl -n fs.inotify.max_user_instances 2>/dev/null || echo "0")
  if [[ $current_value -lt 1500 ]]; then
    echo "fs.inotify.max_user_instances is less than 1500"
    sudo sysctl fs.inotify.max_user_instances=1500 > /dev/null 2>&1
    sudo sysctl -p > /dev/null 2>&1
  fi
fi

# Function to check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then return 1; fi
    return 0
}

# Function to get installation commands based on OS
get_install_command() {
    local cmd=$1
    OS=$(uname -s)

    case $cmd in
        "kind")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -Lo ./kind https://kind.sigs.k8s.io/dl/v0.20.0/kind-linux-amd64 && chmod +x ./kind && sudo mv ./kind /usr/local/bin/kind"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install kind"
            fi
            ;;
        "docker")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -fsSL https://get.docker.com | sh"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install --cask docker"
            fi
            ;;
        "helm")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && chmod 700 get_helm.sh && ./get_helm.sh"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install helm"
            fi
            ;;
        "kubectl")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x kubectl && sudo mv kubectl /usr/local/bin/"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install kubectl"
            fi
            ;;
        "telepresence")
            if [[ "$OS" == "Linux" ]]; then
                echo "sudo curl -fsSL https://app.getambassador.io/download/tel2/linux/amd64/latest/telepresence -o /usr/local/bin/telepresence && sudo chmod a+x /usr/local/bin/telepresence"
            elif [[ "$OS" == "Darwin" ]]; then
                # echo "brew install datawire/blackbird/telepresence"
                echo "brew install telepresenceio/telepresence/telepresence-oss"
            fi
            ;;
        "skaffold")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install skaffold"
            fi
            ;;
        "jq")
            if [[ "$OS" == "Linux" ]]; then
                echo "sudo apt-get install jq"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install jq"
            fi
            ;;
    esac
}

# Check all commands and collect results
missing_commands=()
commands=("kind" "docker" "helm" "kubectl" "telepresence" "skaffold" "jq")

for cmd in "${commands[@]}"; do
    if ! check_command "$cmd"; then
        missing_commands+=("$cmd")
    fi
done

# Exit if any commands are missing
if [ ${#missing_commands[@]} -ne 0 ]; then
    echo "The following required commands are missing: ${missing_commands[*]}"

    for cmd in "${missing_commands[@]}"; do
        install_cmd=$(get_install_command "$cmd")
        echo -e "\nInstallation command for $cmd:"
        echo "$install_cmd"
        read -p "Do you want to install $cmd? (y/n): " proceed
        if [[ "$proceed" == "y" ]]; then
            echo "Installing $cmd..."
            eval "$install_cmd"
            if [ $? -eq 0 ]; then
                echo "$cmd installed successfully"
            else
                echo "Failed to install $cmd"
                exit 1
            fi
        else
            echo "Skipping $cmd installation"
        fi
    done
fi

# Check if GITHUB_TOKEN_CLASSIC is set
if [ -z "$GITHUB_TOKEN_CLASSIC" ]; then
    echo "Error: GITHUB_TOKEN_CLASSIC environment variable is not set"
    echo "Please export GITHUB_TOKEN_CLASSIC with: 'export GITHUB_TOKEN_CLASSIC=<your-token>'"
    exit 1
fi
