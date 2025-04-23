#!/bin/bash

# Functions for configuring swap file and WSL configuration
# Adapted for working in Windows, Linux and MacOS

# Function to check if Docker Desktop is running
check_docker_desktop() {
    echo "Checking if Docker Desktop is running..."

    # Determine the operating system
    local os_type=$(uname -s)
    local max_attempts=30
    local wait_seconds=2

    # Check Docker is installed
    if ! command -v docker &> /dev/null; then
        echo "ERROR: Docker is not installed or not in PATH"
        return 1
    fi

    # Function to check if docker daemon is running
    check_docker_running() {
        docker info &>/dev/null
        return $?
    }

    echo "Waiting for Docker to be ready..."
    local attempt=1
    while [ $attempt -le $max_attempts ]; do
        if check_docker_running; then
            echo "Docker is running and ready (attempt $attempt of $max_attempts)"
            return 0
        fi

        echo "Docker not ready, waiting ${wait_seconds}s (attempt $attempt of $max_attempts)..."
        sleep $wait_seconds
        ((attempt++))
    done

    echo "ERROR: Docker did not start within expected time"
    return 1
}

# Function to apply changes and restart services if needed
apply_changes() {
    local changes_made=$1
    local os_type=$(uname -s)

    if [ "$changes_made" != "true" ]; then
        echo "No swap changes were made, skipping service restart checks"
        return 0
    fi

    echo "Swap changes were made, checking if services need restart..."

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Windows environment"
        echo "WSL may need to be restarted for changes to take effect"
        echo "Checking if Docker Desktop is running..."

        # Check if Docker Desktop needs restart
        if ! check_docker_desktop; then
            echo "Please start Docker Desktop manually or restart your machine"
            read -p "Press Enter to continue once Docker is running..."

            # Check again after user confirmation
            if ! check_docker_desktop; then
                echo "WARNING: Docker Desktop still not running properly"
                echo "Continuing anyway, but applications may not work correctly"
            fi
        fi

    elif [[ "$os_type" == "Linux" ]] && grep -q Microsoft /proc/version 2>/dev/null; then
        echo "Running in WSL environment"
        echo "WSL may need to be restarted for changes to take effect"

        # Check if Docker service is running in WSL
        if systemctl is-active --quiet docker; then
            echo "Docker service is running"
        elif command -v docker &> /dev/null; then
            echo "Docker installed but service not running, attempting to start..."
            sudo systemctl start docker

            # Wait for Docker to be ready
            check_docker_desktop
        else
            echo "Docker is not installed or configured in WSL"
            echo "Please make sure Docker Desktop is running with WSL integration enabled"
        fi

    elif [[ "$os_type" == "Linux" ]]; then
        echo "Running on regular Linux"

        # Check if Docker service is running
        if systemctl is-active --quiet docker; then
            echo "Docker service is running"
        elif command -v docker &> /dev/null; then
            echo "Docker installed but service not running, attempting to start..."
            sudo systemctl start docker

            # Wait for Docker to be ready
            check_docker_desktop
        fi

    elif [[ "$os_type" == "Darwin" ]]; then
        echo "Running on MacOS"

        # Check Docker Desktop on Mac
        if ! check_docker_desktop; then
            echo "Please start Docker Desktop manually"
            read -p "Press Enter to continue once Docker is running..."

            # Check again after user confirmation
            if ! check_docker_desktop; then
                echo "WARNING: Docker Desktop still not running properly"
                echo "Continuing anyway, but applications may not work correctly"
            fi
        fi
    fi

    return 0
}

# Setting up WSL configuration
setup_wslconfig() {
    echo "Setting up WSL configuration..."

    # Determine the operating system
    local os_type=$(uname -s)

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Git Bash / MSYS environment"

        # Get total system memory in MB
        local total_memory_mb=$(cmd.exe /c "wmic ComputerSystem get TotalPhysicalMemory" 2>/dev/null | grep -v "TotalPhysicalMemory" | tr -d '\r' | awk '{gsub(/[^0-9]/,""); if(length) print int($1/1024/1024)}')

        # Calculate values: 60% for memory, but at least 16GB total resources
        local memory_mb=$(((total_memory_mb / 5) * 3))
        local memory_gb=$((memory_mb / 1024))

        if [ "$memory_gb" -lt 16 ]; then
            local swap_gb=$((16 - memory_gb))
        else
            local swap_gb=0
        fi

        # Check if .wslconfig exists in the Windows user's home directory
        local win_home=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
        local wsl_config_path="${win_home}\\.wslconfig"

        # Convert Windows path to Git Bash path if needed
        local gb_path=$(echo "$wsl_config_path" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')

        echo "Creating WSL config file with memory=${memory_gb}GB and swap=${swap_gb}GB..."

        number_of_processors = $NUMBER_OF_PROCESSORS
        # Create WSL configuration with calculated values
        cat > "$gb_path" << EOF
[wsl2]
memory=${memory_gb}GB
processors=${number_of_processors}
swap=${swap_gb}GB
EOF
        echo "Created WSL config at $gb_path"

    elif [[ "$os_type" == "Linux" ]] && grep -q Microsoft /proc/version 2>/dev/null; then
        echo "Running in WSL environment"

        # Calculate values from the host system
        local total_memory_mb=$(free -m | grep "Mem:" | awk '{print $2}')
        local memory_mb=$((total_memory_mb / 2))
        local memory_gb=$((memory_mb / 1024))

        # Ensure at least 16GB total (memory + swap)
        local total_gb=$((memory_gb * 2))
        if [ "$total_gb" -lt 16 ]; then
            local swap_gb=$((16 - memory_gb))
        else
            local swap_gb="$memory_gb"
        fi

        # Check if .wslconfig exists in the Windows user's home directory
        local win_home=$(wslpath "$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')")

        if [ -f "$win_home/.wslconfig" ]; then
            echo "Updating WSL config file at $win_home/.wslconfig"
            # Backup existing file
            cp "$win_home/.wslconfig" "$win_home/.wslconfig.bak"
        else
            echo "Creating new WSL config file..."
        fi

        # Create WSL configuration with calculated values
        cat > "$win_home/.wslconfig" << EOF
[wsl2]
memory=${memory_gb}GB
processors=8
swap=${swap_gb}GB
EOF
        echo "Updated WSL config at $win_home/.wslconfig"
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
    local changes_made="false"

    if [[ "$os_type" == *"MINGW"* ]] || [[ "$os_type" == *"MSYS"* ]] || [[ "$os_type" == *"CYGWIN"* ]]; then
        echo "Running in Git Bash / MSYS environment"

        # Get total system memory in MB
        local total_memory_mb=$(cmd.exe /c "wmic ComputerSystem get TotalPhysicalMemory" 2>/dev/null | grep -v "TotalPhysicalMemory" | tr -d '\r' | awk '{gsub(/[^0-9]/,""); if(length) print int($1/1024/1024)}')

        # Check if .wslconfig exists in the Windows user's home directory
        local win_home=$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')
        local wsl_config_path="${win_home}\\.wslconfig"
        local gb_path=$(echo "$wsl_config_path" | sed 's/\\/\//g' | sed 's/^\([A-Za-z]\):/\/\1/')

        # Calculate values
        local memory_mb=$((total_memory_mb / 2))
        local memory_gb=$((memory_mb / 1024))
        local total_gb=$((memory_gb * 2))
        if [ "$total_gb" -lt 16 ]; then
            local swap_gb=$((16 - memory_gb))
        else
            local swap_gb="$memory_gb"
        fi

        # Check if existing config has the same values
        local needs_update="true"
        if [ -f "$gb_path" ]; then
            local current_memory=$(grep -E "^memory=" "$gb_path" | sed -E 's/memory=([0-9]+)GB.*/\1/')
            local current_swap=$(grep -E "^swap=" "$gb_path" | sed -E 's/swap=([0-9]+)GB.*/\1/')

            if [ "$current_memory" == "$memory_gb" ] && [ "$current_swap" == "$swap_gb" ]; then
                echo "WSL config already has correct memory=${memory_gb}GB and swap=${swap_gb}GB settings"
                needs_update="false"
            else
                echo "WSL config needs update: Current memory=${current_memory}GB, swap=${current_swap}GB"
                echo "New settings: memory=${memory_gb}GB, swap=${swap_gb}GB"
            fi
        fi

        # Update config if needed
        if [ "$needs_update" == "true" ]; then
            echo "Creating/updating WSL config file with memory=${memory_gb}GB and swap=${swap_gb}GB..."

            # Create backup if file exists
            if [ -f "$gb_path" ]; then
                cp "$gb_path" "${gb_path}.bak"
            fi

            # Create WSL configuration with calculated values
            cat > "$gb_path" << EOF
[wsl2]
memory=${memory_gb}GB
processors=8
swap=${swap_gb}GB
EOF
            echo "Updated WSL config at $gb_path"
            changes_made="true"
        fi

    elif [[ "$os_type" == "Linux" ]]; then
        # On WSL, set up swap through .wslconfig
        if grep -q Microsoft /proc/version 2>/dev/null; then
            echo "Running in WSL environment"

            # Get total memory
            local total_memory_mb=$(free -m | grep "Mem:" | awk '{print $2}')
            local memory_mb=$((total_memory_mb / 2))
            local memory_gb=$((memory_mb / 1024))

            # Calculate swap size
            local total_gb=$((memory_gb * 2))
            if [ "$total_gb" -lt 16 ]; then
                local swap_gb=$((16 - memory_gb))
            else
                local swap_gb="$memory_gb"
            fi

            # Check if .wslconfig exists and has correct values
            local win_home=$(wslpath "$(cmd.exe /c "echo %USERPROFILE%" 2>/dev/null | tr -d '\r')")
            local needs_update="true"

            if [ -f "$win_home/.wslconfig" ]; then
                local current_memory=$(grep -E "^memory=" "$win_home/.wslconfig" | sed -E 's/memory=([0-9]+)GB.*/\1/')
                local current_swap=$(grep -E "^swap=" "$win_home/.wslconfig" | sed -E 's/swap=([0-9]+)GB.*/\1/')

                if [ "$current_memory" == "$memory_gb" ] && [ "$current_swap" == "$swap_gb" ]; then
                    echo "WSL config already has correct memory=${memory_gb}GB and swap=${swap_gb}GB settings"
                    needs_update="false"
                else
                    echo "WSL config needs update: Current memory=${current_memory}GB, swap=${current_swap}GB"
                    echo "New settings: memory=${memory_gb}GB, swap=${swap_gb}GB"
                fi
            fi

            # Update config if needed
            if [ "$needs_update" == "true" ]; then
                echo "Creating/updating WSL config file with memory=${memory_gb}GB and swap=${swap_gb}GB..."

                # Create backup if file exists
                if [ -f "$win_home/.wslconfig" ]; then
                    cp "$win_home/.wslconfig" "$win_home/.wslconfig.bak"
                fi

                # Create WSL configuration with calculated values
                cat > "$win_home/.wslconfig" << EOF
[wsl2]
memory=${memory_gb}GB
processors=8
swap=${swap_gb}GB
EOF
                echo "Updated WSL config at $win_home/.wslconfig"
                changes_made="true"
            fi

        else
            # Regular Linux - check if swap already exists and has correct size
            echo "Running on regular Linux"
            local swap_exists=false
            local current_swap_mb=0

            if swapon --show | grep -q "/"; then
                swap_exists=true
                current_swap_mb=$(free -m | grep "Swap:" | awk '{print $2}')
                echo "Current swap size: ${current_swap_mb}MB"
            fi

            # Calculate required swap size
            local total_memory_mb=$(free -m | grep "Mem:" | awk '{print $2}')
            local memory_mb=$((total_memory_mb / 2))

            # Ensure at least 16GB total (memory + swap)
            local total_mb=$((memory_mb * 2))
            if [ "$total_mb" -lt 16384 ]; then
                local swap_mb=$((16384 - memory_mb))
            else
                local swap_mb="$memory_mb"
            fi

            # Check if current swap is sufficient
            if $swap_exists && [ "$current_swap_mb" -ge "$((swap_mb * 9 / 10))" ]; then
                echo "Existing swap (${current_swap_mb}MB) is sufficient (required ${swap_mb}MB)"
                # No changes needed
            else
                echo "Need to configure swap: required ${swap_mb}MB"

                # Check if we have sudo rights
                if ! command -v sudo &> /dev/null || ! sudo -n true 2>/dev/null; then
                    echo "ERROR: Need sudo rights to create swap file"
                    echo "Please run this command manually with sudo or as root"
                    return 1
                fi

                # Check available disk space on /
                local available_space_mb=$(df -BM / | awk 'NR==2 {gsub(/M/,"",$4); print $4}')
                echo "Available disk space on /: ${available_space_mb}MB"

                if [ "$available_space_mb" -lt "$swap_mb" ]; then
                    echo "ERROR: Not enough disk space to create swap file"
                    echo "Required: ${swap_mb}MB, Available: ${available_space_mb}MB"
                    return 1
                fi

                # Ask for user confirmation if not in silent mode
                if [ "${SILENT:-false}" != "true" ]; then
                    read -p "Do you want to create a swap file of size ${swap_mb}MB? (y/N) " -n 1 -r
                    echo
                    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
                        echo "Swap file creation cancelled by user"
                        return 0
                    fi
                fi

                # If swap exists, turn it off first
                if $swap_exists; then
                    echo "Disabling existing swap first"
                    sudo swapoff -a
                fi

                # Create and set up swap file
                echo "Creating swap file with size ${swap_mb}MB..."
                sudo fallocate -l ${swap_mb}M /swapfile
                sudo chmod 600 /swapfile
                sudo mkswap /swapfile
                sudo swapon /swapfile

                # Make swap permanent by adding to fstab if not already there
                if ! grep -q "/swapfile" /etc/fstab; then
                    echo "Adding swap entry to /etc/fstab"
                    # Remove any existing swap entries first
                    sudo sed -i '/swap/d' /etc/fstab
                    echo "/swapfile none swap sw 0 0" | sudo tee -a /etc/fstab
                fi

                echo "Swap file configured and enabled"
                swapon --show
                changes_made="true"
            fi
        fi

    elif [[ "$os_type" == "Darwin" ]]; then
        echo "Running on MacOS"

        # Get total physical memory
        local total_memory_mb=$(sysctl hw.memsize | awk '{print int($2/1024/1024)}')
        local memory_mb=$((total_memory_mb / 2))

        # Ensure at least 16GB total (memory + swap)
        local total_mb=$((memory_mb * 2))
        if [ "$total_mb" -lt 16384 ]; then
            local swap_mb=$((16384 - memory_mb))
        else
            local swap_mb="$memory_mb"
        fi

        # MacOS manages swap automatically, but we can check current settings
        local current_swap=$(sysctl vm.swapusage | awk '{print $4}' | sed 's/M//')

        echo "Current swap: ${current_swap}MB"
        echo "Recommended swap: ${swap_mb}MB"

        echo "Note: MacOS manages swap dynamically. Checking current settings:"
        sysctl vm.swapusage

        # Check if current swap is within reasonable range (at least 80% of recommended)
        if [ "$current_swap" -ge "$((swap_mb * 8 / 10))" ]; then
            echo "Current swap size is sufficient"
        else
            echo "Current swap size is less than recommended"

            # We can only change the swap size if we're running as root
            if [ "$EUID" -eq 0 ]; then
                echo "Running as root, adjusting swap settings"
                # MacOS dynamic pager settings
                sudo sysctl -w vm.swapfile.maxpages=$((swap_mb * 256))
                changes_made="true"
            else
                echo "Not running as root, cannot adjust swap settings"
                echo "For MacOS, dynamic_pager manages swap automatically."
                echo "You can adjust settings manually if needed using sudo"
            fi
        fi
    else
        echo "Unsupported OS for swap setup"
    fi

    # Apply changes and check for Docker Desktop if needed
    apply_changes "$changes_made"

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
    elif [[ "$os_type" == "Darwin" ]]; then
        # On MacOS, use sysctl to get memory
        local total_memory_mb=$(sysctl hw.memsize | awk '{print int($2/1024/1024)}')
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