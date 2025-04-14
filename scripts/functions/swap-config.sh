#!/bin/bash

# Functions for configuring swap file and WSL configuration
# Adapted for working in Windows

# Setting up WSL configuration
setup_wslconfig() {
    echo "Setting up WSL configuration..."

    # Determine the operating system
    local os_type=$(uname -s)

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Git Bash / MSYS environment"
        # For Git Bash, just display information
        echo "WSL config adjustment not applicable in this environment"
    elif [[ "$os_type" == "Linux" ]] && grep -q Microsoft /proc/version 2>/dev/null; then
        echo "Running in WSL environment"

        # Check if .wslconfig exists in the Windows user's home directory
        local win_home=$(wslpath "$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')")

        if [ -f "$win_home/.wslconfig" ]; then
            echo "WSL config file already exists at $win_home/.wslconfig"
        else
            echo "Creating WSL config file..."
            # Create basic WSL configuration
            cat > "$win_home/.wslconfig" << EOF
[wsl2]
memory=8GB
processors=4
swap=8GB
EOF
            echo "Created WSL config at $win_home/.wslconfig"
        fi
    else
        echo "Not running in Windows environment, skipping WSL config"
    fi

    return 0
}

# Setting up swap file
setup_swap() {
    echo "Setting up swap file..."

    # Determine the operating system
    local os_type=$(uname -s)

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Git Bash / MSYS environment"
        echo "Swap setup not applicable in this environment"
    elif [[ "$os_type" == "Linux" ]]; then
        # Check if swap already exists
        if swapon --show | grep -q "/"; then
            echo "Swap is already enabled"
            swapon --show
        else
            echo "No swap detected"

            # On WSL, we won't configure swap, as this is done through .wslconfig
            if grep -q Microsoft /proc/version 2>/dev/null; then
                echo "Running in WSL environment, swap should be configured via .wslconfig"
            else
                echo "This is a regular Linux environment"
                echo "Swap setup would be performed here (skipped for safety)"
                # On regular Linux, code for swap setup would be here
            fi
        fi
    else
        echo "Unsupported OS for swap setup"
    fi

    return 0
}

# Memory check
check_memory() {
    echo "Checking available memory..."

    # Determine the operating system
    local os_type=$(uname -s)
    local min_memory_mb=6000  # Minimum 6 GB required for operation

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Git Bash / MSYS environment"
        # For Windows, use wmic to get memory
        local total_memory_mb=$(cmd.exe /c "wmic ComputerSystem get TotalPhysicalMemory" 2>/dev/null | grep -v "TotalPhysicalMemory" | tr -d '\r' | awk '{gsub(/[^0-9]/,""); if(length) print int($1/1024/1024)}')
        echo "Total system memory: $total_memory_mb MB"

        if [ "$total_memory_mb" -lt "$min_memory_mb" ]; then
            echo "WARNING: System has less than ${min_memory_mb} MB of RAM"
            echo "The application may not function properly"
            return 1
        fi
    elif [[ "$os_type" == "Linux" ]]; then
        # On Linux, use free to get memory
        local total_memory_mb=$(free -m | grep "Mem:" | awk '{print $2}')
        echo "Total system memory: $total_memory_mb MB"

        if [ "$total_memory_mb" -lt "$min_memory_mb" ]; then
            echo "WARNING: System has less than ${min_memory_mb} MB of RAM"
            echo "The application may not function properly"
            return 1
        fi
    else
        echo "Unsupported OS for memory check"
        return 0  # Skip check for unknown OS
    fi

    echo "Memory check passed"
    return 0
}

# Export functions
export -f setup_wslconfig
export -f setup_swap
export -f check_memory

# If the script is run directly (not source'd), run all functions for testing
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    setup_wslconfig
    setup_swap
    check_memory
fi