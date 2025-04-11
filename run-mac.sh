#!/bin/bash

# OpenFrame Installation Script for macOS
# This script checks for and installs the required components for OpenFrame

# Function to check if a command exists
command_exists() {
  command -v "$1" >/dev/null 2>&1
}

# Function to print colored output
print_color() {
  case "$1" in
    "green") echo -e "\033[0;32m$2\033[0m" ;;
    "yellow") echo -e "\033[0;33m$2\033[0m" ;;
    "red") echo -e "\033[0;31m$2\033[0m" ;;
    "cyan") echo -e "\033[0;36m$2\033[0m" ;;
    "magenta") echo -e "\033[0;35m$2\033[0m" ;;
    *) echo "$2" ;;
  esac
}

# Function to prompt for confirmation (Y/N)
confirm() {
  read -p "$1 (Y/N): " response
  case "$response" in
    [yY]*)
      return 0
      ;;
    *)
      return 1
      ;;
  esac
}

# Check if running as root, warn if so
if [ "$(id -u)" = "0" ]; then
  print_color "red" "WARNING: This script is running as root. It's recommended to run it as a regular user with sudo privileges."
  if ! confirm "Continue anyway?"; then
    exit 1
  fi
fi

print_color "green" "Starting OpenFrame installation process..."

# 1. Check/install Homebrew
print_color "cyan" "Checking for Homebrew installation..."
if ! command_exists brew; then
  print_color "yellow" "Homebrew not found. Installing Homebrew..."
  /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

  # Add Homebrew to the PATH if needed
  if [[ "$(uname -m)" == "arm64" ]]; then
    # For Apple Silicon Macs
    if [[ -f /opt/homebrew/bin/brew ]]; then
      export PATH="/opt/homebrew/bin:$PATH"
      # Add to the shell profile as well for future sessions
      SHELL_PROFILE=""
      if [[ -f "$HOME/.zshrc" ]]; then
        SHELL_PROFILE="$HOME/.zshrc"
      elif [[ -f "$HOME/.bash_profile" ]]; then
        SHELL_PROFILE="$HOME/.bash_profile"
      elif [[ -f "$HOME/.profile" ]]; then
        SHELL_PROFILE="$HOME/.profile"
      fi

      if [[ -n "$SHELL_PROFILE" ]]; then
        echo 'export PATH="/opt/homebrew/bin:$PATH"' >> "$SHELL_PROFILE"
        print_color "yellow" "Added Homebrew to $SHELL_PROFILE"
      fi
    fi
  fi

  print_color "green" "Homebrew installed successfully!"
else
  print_color "green" "Homebrew is already installed."
fi

# 2. Check/install Git
print_color "cyan" "Checking for Git installation..."
if ! command_exists git; then
  print_color "yellow" "Git not found. Installing Git..."
  brew install git
  print_color "green" "Git installed successfully!"
else
  print_color "green" "Git is already installed."
fi

# 3. Handle repository
current_dir=$(pwd)
print_color "cyan" "Working with repository at $current_dir..."

# Check if the current directory is a git repository
if [ ! -d "$current_dir/.git" ]; then
  print_color "yellow" "Current directory is not a Git repository."

  # Ask user if they want to clone the repo here or specify a different location
  if confirm "Do you want to clone the OpenFrame repository in the current directory?"; then
    # If directory is not empty, warn the user
    if [ "$(ls -A $current_dir)" ]; then
      if ! confirm "Warning: The current directory is not empty. Continue with cloning?"; then
        print_color "red" "Operation cancelled by user."
        exit 1
      fi
    fi

    # Clone the repository to the current directory
    print_color "yellow" "Cloning OpenFrame repository to current directory..."
    git clone https://github.com/openframe/openframe.git .

    if [ $? -eq 0 ]; then
      print_color "green" "OpenFrame repository cloned successfully!"
    else
      print_color "red" "Failed to clone the OpenFrame repository. Please check the URL and your internet connection."
      exit 1
    fi
  else
    # Ask for custom path
    read -p "Please enter the full path where you want to clone the repository: " custom_path

    if [ ! -d "$custom_path" ]; then
      if confirm "Directory does not exist. Create it?"; then
        mkdir -p "$custom_path"
      else
        print_color "red" "Operation cancelled by user."
        exit 1
      fi
    fi

    # Clone the repository to the specified directory
    print_color "yellow" "Cloning OpenFrame repository to $custom_path..."
    git clone https://github.com/openframe/openframe.git "$custom_path"

    if [ $? -eq 0 ]; then
      print_color "green" "OpenFrame repository cloned successfully!"
      current_dir="$custom_path"
    else
      print_color "red" "Failed to clone the OpenFrame repository. Please check the URL and your internet connection."
      exit 1
    fi
  fi
else
  print_color "green" "Current directory is a Git repository."

  # Ask if user wants to pull latest changes
  if confirm "Do you want to pull the latest changes?"; then
    print_color "cyan" "Pulling latest changes from the repository..."
    git pull

    if [ $? -eq 0 ]; then
      print_color "green" "Successfully pulled latest changes."
    else
      print_color "yellow" "Failed to pull changes. There might be conflicts or network issues."
    fi
  fi
fi

# 4. Check/install Docker Desktop
print_color "cyan" "Checking for Docker Desktop installation..."
if ! command_exists docker; then
  print_color "yellow" "Docker Desktop not found. Installing Docker Desktop..."

  brew install --cask docker

  print_color "green" "Docker Desktop installation initiated!"
  print_color "yellow" "NOTE: You may need to open Docker Desktop from your Applications folder to complete setup."

  if confirm "Would you like to open Docker Desktop now?"; then
    open -a Docker
    print_color "yellow" "Please wait for Docker Desktop to start completely before continuing."
    print_color "yellow" "Press Enter once Docker is running to continue..."
    read
  fi
else
  print_color "green" "Docker Desktop is already installed."

  # Check if Docker daemon is running
  if ! docker info >/dev/null 2>&1; then
    print_color "yellow" "Docker daemon is not running. Starting Docker..."
    open -a Docker
    print_color "yellow" "Waiting for Docker to start..."

    # Wait for Docker to start
    attempt=0
    max_attempts=30
    while ! docker info >/dev/null 2>&1; do
      sleep 2
      attempt=$((attempt+1))
      if [ $attempt -ge $max_attempts ]; then
        print_color "red" "Docker did not start in time. Please start Docker Desktop manually and try again."
        exit 1
      fi
    done

    print_color "green" "Docker started successfully!"
  fi
fi

# 5. Ask for GitHub token
read -p "Please enter your GitHub token (leave empty if not needed): " github_token
if [ -n "$github_token" ]; then
  export GITHUB_TOKEN_CLASSIC="$github_token"
  print_color "green" "GitHub token has been set for this session."
fi

# 6. Find and run the run.sh script
print_color "cyan" "Searching for run.sh in the repository..."

# Search for run.sh in the repository
run_sh_path=$(find "$current_dir" -name "run.sh" -type f -print -quit)

if [ -n "$run_sh_path" ]; then
  print_color "green" "Found run.sh at: $run_sh_path"

  script_dir=$(dirname "$run_sh_path")
  script_name=$(basename "$run_sh_path")

  print_color "green" "Executing $script_name b..."
  # Make sure the script is executable
  chmod +x "$run_sh_path"

  # Change to the script directory and execute it
  (cd "$script_dir" && ./"$script_name" b)

  # Check the result
  if [ $? -eq 0 ]; then
    print_color "green" "Script executed successfully!"
  else
    print_color "red" "Script execution failed with errors."
    print_color "yellow" "Please check the output above for details."
  fi
else
  print_color "red" "No run.sh script found in the repository. Please check the repository structure."

  # Ask user if they want to specify the path manually
  if confirm "Do you want to specify the path to run.sh manually?"; then
    read -p "Please enter the full path to the run.sh script: " custom_script_path

    if [ -f "$custom_script_path" ]; then
      print_color "green" "Found script at: $custom_script_path"
      script_dir=$(dirname "$custom_script_path")
      script_name=$(basename "$custom_script_path")

      # Make the script executable
      chmod +x "$custom_script_path"

      print_color "green" "Executing $script_name b..."
      # Change to the script directory and execute it
      (cd "$script_dir" && ./"$script_name" b)

      # Check the result
      if [ $? -eq 0 ]; then
        print_color "green" "Script executed successfully!"
      else
        print_color "red" "Script execution failed with errors."
        print_color "yellow" "Please check the output above for details."
      fi
    else
      print_color "red" "The specified path does not exist. Please check the path and try again."
    fi
  fi
fi

print_color "green" "OpenFrame installation and setup process completed!"