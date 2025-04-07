#!/bin/bash

# Check if max_user_instances is less than 1500
current_value=$(sysctl -n fs.inotify.max_user_instances)
if [ "$current_value" -lt 1500 ]; then
  echo "fs.inotify.max_user_instances is less than 1500"
  sudo sysctl fs.inotify.max_user_instances=1500 > /dev/null 2>&1
  sudo sysctl -p > /dev/null 2>&1
fi

# Function to check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then return 1; fi
    return 0
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
    exit 1
fi

# Check if GITHUB_TOKEN_CLASSIC is set
if [ -z "$GITHUB_TOKEN_CLASSIC" ]; then
    echo "Error: GITHUB_TOKEN_CLASSIC environment variable is not set"
    echo "Please export GITHUB_TOKEN_CLASSIC with: 'export GITHUB_TOKEN_CLASSIC=<your-token>'"
    exit 1
fi
