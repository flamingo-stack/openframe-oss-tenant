#!/bin/bash

# OpenFrame Installation Script for Linux
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

# Function to detect Linux distribution
get_linux_distribution() {
  if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo "$ID"
  elif [ -f /etc/lsb-release ]; then
    . /etc/lsb-release
    echo "$DISTRIB_ID" | tr '[:upper:]' '[:lower:]'
  else
    echo "unknown"
  fi
}

# Function to install packages based on distribution
install_package() {
  local package_name="$1"
  local distro=$(get_linux_distribution)

  case "$distro" in
    "ubuntu"|"debian")
      sudo apt-get update && sudo apt-get install -y "$package_name"
      ;;
    "fedora")
      sudo dnf install -y "$package_name"
      ;;
    "centos"|"rhel")
      sudo yum install -y "$package_name"
      ;;
    "arch")
      sudo pacman -Sy --noconfirm "$package_name"
      ;;
    *)
      print_color "red" "Unsupported distribution. Please install $package_name manually."
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

# 1. Check/install Git
print_color "cyan" "Checking for Git installation..."
if ! command_exists git; then
  print_color "yellow" "Git not found. Installing Git..."
  if ! install_package git; then
    print_color "red" "Failed to install Git. Please install it manually."
    exit 1
  fi
  print_color "green" "Git installed successfully!"
else
  print_color "green" "Git is already installed."
fi

# 2. Handle repository
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

# 3. Ask for GitHub token
read -p "Please enter your GitHub token (leave empty if not needed): " github_token
if [ -n "$github_token" ]; then
  export GITHUB_TOKEN_CLASSIC="$github_token"
  print_color "green" "GitHub token has been set for this session."
fi

# 4. Find and run the run.sh script
print_color "cyan" "Searching for run.sh in the repository..."

# Search for run.sh in the repository
run_sh_path=$(find "$current_dir" -name "run-wrapper.sh" -type f -print -quit)

if [ -n "$run_sh_path" ]; then
  print_color "green" "Found run-wrapper.sh at: $run_sh_path"

  script_dir=$(dirname "$run_sh_path")
  script_name=$(basename "$run_sh_path")

  print_color "green" "Executing $script_name"
  # Make sure the script is executable
  chmod +x "$run_sh_path"

  cd "$script_dir"
  echo "Script help:"
  ./"$script_name"

  # Check the result
  if [ $? -eq 0 ]; then
    print_color "green" "Script executed successfully!"
  else
    print_color "red" "Script execution failed with errors."
    print_color "yellow" "Please check the output above for details."
  fi
else
  print_color "red" "No run-wrapper.sh script found in the repository. Please check the repository structure."

fi

print_color "green" "OpenFrame installation and setup process completed!"

# Remind user about Docker group if needed
if [ -n "$(groups | grep -v docker)" ] && [ -n "$(groups | grep docker)" ]; then
  print_color "yellow" "REMINDER: You may need to log out and back in for Docker group changes to take effect."
fi 