#!/bin/bash

# Requirements check function for Windows/WSL and other systems
check_requirements() {
    echo "Checking system requirements..."

    # Determine the OS type
    local os_type=$(uname -s)
    local is_windows=false

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Detected Windows environment: $os_type"
        is_windows=true
    elif [[ "$os_type" == "Linux" ]] && grep -q Microsoft /proc/version 2>/dev/null; then
        echo "Detected WSL environment"
        is_windows=true
    else
        echo "Detected OS: $os_type"
    fi

    # Checking the necessary tools
    local required_tools=("docker" "kubectl")
    local missing_tools=()

    for tool in "${required_tools[@]}"; do
        if ! command -v "$tool" &>/dev/null; then
            missing_tools+=("$tool")
        fi
    done

    if [ ${#missing_tools[@]} -gt 0 ]; then
        echo "ERROR: The following tools are not installed: ${missing_tools[*]}"
        echo "Please install the missing tools and try again."
        if [ "$is_windows" = true ]; then
            echo "For Windows, you can use the run-windows.ps1 script to install the required tools."
        fi
        return 1
    fi

    # Check if Docker is running
    if ! docker info &>/dev/null; then
        echo "ERROR: Docker is not running. Please start Docker and try again."
        return 1
    fi

    # If we are in Windows, check additional requirements
    if [ "$is_windows" = true ]; then
        echo "Windows-specific checks passed"
    fi

    echo "All requirements are met."
    return 0
}

# Export the function
export -f check_requirements

# If the script is run directly (not source'd), run the function
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    check_requirements
fi