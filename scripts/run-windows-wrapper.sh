#!/bin/bash

# Get the directory where the script is located
export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
export ROOT_REPO_DIR="${SCRIPT_DIR}/.."

# Convert Windows paths to Git Bash paths if running on Windows
if [[ "$OS" == *"NT"* ]] || [[ "$OS" == "MINGW"* ]] || [[ "$OS" == "CYGWIN"* ]]; then
    # Convert Windows path to Git Bash path
    export SCRIPT_DIR=$(echo "$SCRIPT_DIR" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')
    export ROOT_REPO_DIR=$(echo "$ROOT_REPO_DIR" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')
fi

echo "Script help:"
bash "${SCRIPT_DIR}/run.sh" "--help"

echo ""
echo "Please enter the required parameters:"
read -p "> " params

bash "${SCRIPT_DIR}/run.sh" $params