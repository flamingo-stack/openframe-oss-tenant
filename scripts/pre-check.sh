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
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -Lo ./kind.exe https://kind.sigs.k8s.io/dl/v0.20.0/kind-windows-amd64 && mkdir -p ~/bin && mv ./kind.exe ~/bin/kind.exe"
            fi
            ;;
        "docker")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -fsSL https://get.docker.com | sh"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install --cask docker"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "Please download and install Docker Desktop for Windows from https://www.docker.com/products/docker-desktop"
            fi
            ;;
        "helm")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && chmod 700 get_helm.sh && ./get_helm.sh"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install helm"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -fsSL -o get_helm.sh https://raw.githubusercontent.com/helm/helm/main/scripts/get-helm-3 && chmod 700 get_helm.sh && ./get_helm.sh"
            fi
            ;;
        "kubectl")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/linux/amd64/kubectl && chmod +x kubectl && sudo mv kubectl /usr/local/bin/"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install kubectl"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -LO https://dl.k8s.io/release/$(curl -L -s https://dl.k8s.io/release/stable.txt)/bin/windows/amd64/kubectl.exe && mkdir -p ~/bin && mv ./kubectl.exe ~/bin/kubectl.exe"
            fi
            ;;
        "telepresence")
            if [[ "$OS" == "Linux" ]]; then
                echo "sudo curl -fsSL https://app.getambassador.io/download/tel2/linux/amd64/latest/telepresence -o /usr/local/bin/telepresence && sudo chmod a+x /usr/local/bin/telepresence"
            elif [[ "$OS" == "Darwin" ]]; then
                # echo "brew install datawire/blackbird/telepresence"
                echo "brew install telepresenceio/telepresence/telepresence-oss"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -fsSL -o telepresence-setup.exe https://app.getambassador.io/download/tel2/windows/amd64/latest/telepresence-setup.exe && ./telepresence-setup.exe"
            fi
            ;;
        "skaffold")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64 && sudo install skaffold /usr/local/bin/"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install skaffold"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -Lo skaffold.exe https://storage.googleapis.com/skaffold/releases/latest/skaffold-windows-amd64.exe && mkdir -p ~/bin && mv ./skaffold.exe ~/bin/skaffold.exe"
            fi
            ;;
        "jq")
            if [[ "$OS" == "Linux" ]]; then
                echo "sudo apt-get install jq"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install jq"
            elif [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
                echo "curl -L -o jq.exe https://github.com/stedolan/jq/releases/download/jq-1.6/jq-win64.exe && mkdir -p ~/bin && mv ./jq.exe ~/bin/jq.exe"
            fi
            ;;
        "k3d")
            if [[ "$OS" == "Linux" ]]; then
                echo "curl -s https://raw.githubusercontent.com/rancher/k3d/main/install.sh | bash"
            elif [[ "$OS" == "Darwin" ]]; then
                echo "brew install k3d"
            fi
    esac
}

# Check all commands and collect results
missing_commands=()
commands=("kind" "docker" "helm" "kubectl" "telepresence" "skaffold" "jq" "k3d")

for cmd in "${commands[@]}"; do
    if ! check_command "$cmd"; then
        missing_commands+=("$cmd")
    fi
done

# Exit if any commands are missing
if [ ${#missing_commands[@]} -ne 0 ]; then
    echo "The following required commands are missing: ${missing_commands[*]}"

    # If Windows, add a message about PATH
    OS=$(uname -s)
    if [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
        echo -e "\nNOTE: For Windows, the tools will be installed to ~/bin. Make sure this directory is in your PATH."
        echo "You can add it with: export PATH=\$PATH:~/bin"

        # Create bin directory if it doesn't exist
        mkdir -p ~/bin
    fi

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

    # For Windows, remind to add PATH if any tools were installed
    if [[ "$OS" == *"MINGW"* ]] || [[ "$OS" == *"MSYS"* ]] || [[ "$OS" == "CYGWIN"* ]] && [ ${#missing_commands[@]} -gt 0 ]; then
        echo -e "\nReminder: To use the installed tools, make sure ~/bin is in your PATH with:"
        echo "export PATH=\$PATH:~/bin"
        echo "You may need to restart your Git Bash session for this to take effect."
    fi
fi

# Check if GITHUB_TOKEN_CLASSIC is set
if [ -z "$GITHUB_TOKEN_CLASSIC" ]; then
    echo "Error: GITHUB_TOKEN_CLASSIC environment variable is not set"
    echo "Please export GITHUB_TOKEN_CLASSIC with: 'export GITHUB_TOKEN_CLASSIC=<your-token>'"
    exit 1
fi