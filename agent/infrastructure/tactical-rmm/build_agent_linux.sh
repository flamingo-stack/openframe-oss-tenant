#!/bin/bash

#
# build_agent_linux.sh
#
# Purpose:
#   - Build Tactical RMM agent for Windows AMD64 from Linux
#   - Cross-compiles Windows binary
#   - Output: Windows executable that can be distributed
#
# Usage:
#   ./build_agent_linux.sh
#   ./build_agent_linux.sh -b "rmmagent" -o "dist" -v "1.0.0" -u "http://example.com:8080"
#
# Requirements:
#   - Ubuntu/Debian Linux
#   - Go 1.21.6 or higher
#   - Git
#   - Cross-compilation tools (gcc-mingw-w64)

# Default values
BUILD_FOLDER="/tmp/rmmagent"
OUTPUT_FOLDER="/tmp/dist"
VERSION="1.0.0"
RMM_SERVER_URL=""

# Parse command line arguments
while getopts "b:o:v:u:h" opt; do
    case $opt in
        b) BUILD_FOLDER="/tmp/$OPTARG";;
        o) OUTPUT_FOLDER="/tmp/$OPTARG";;
        v) VERSION="$OPTARG";;
        u) RMM_SERVER_URL="$OPTARG";;
        h) echo "Usage: $0 [-b build_folder] [-o output_folder] [-v version] [-u rmm_server_url]"; exit 0;;
        \?) echo "Invalid option -$OPTARG" >&2; exit 1;;
    esac
done

# Function to print colored messages
print_message() {
    local color=$1
    local message=$2
    echo -e "${color}${message}${NC}"
}

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Function to install Go
install_go() {
    print_message "$YELLOW" "Installing Go..."

    if command_exists go; then
        print_message "$GREEN" "Go is already installed."
        return
    fi

    # Download Go
    local go_url="https://golang.org/dl/go1.21.6.linux-amd64.tar.gz"
    local go_tar="/tmp/go1.21.6.linux-amd64.tar.gz"
    local go_dir="/tmp/go"

    print_message "$YELLOW" "Downloading Go..."
    wget -q "$go_url" -O "$go_tar"

    # Create Go directory in /tmp
    mkdir -p "$go_dir"

    # Extract Go
    print_message "$YELLOW" "Extracting Go..."
    tar -C "$go_dir" -xzf "$go_tar"

    # Add Go to PATH for current session
    export PATH="$go_dir/go/bin:$PATH"

    # Cleanup
    rm "$go_tar"

    print_message "$GREEN" "Go installed successfully."
}

# Function to install Git
install_git() {
    print_message "$YELLOW" "Installing Git..."

    if command_exists git; then
        print_message "$GREEN" "Git is already installed."
        return
    fi

    sudo apt-get update
    sudo apt-get install -y git

    print_message "$GREEN" "Git installed successfully."
}

# Function to install cross-compilation tools
install_cross_compiler() {
    print_message "$YELLOW" "Installing cross-compilation tools..."

    sudo apt-get update
    sudo apt-get install -y gcc-mingw-w64 binutils-mingw-w64

    print_message "$GREEN" "Cross-compilation tools installed successfully."
}

# Function to clone repository
clone_repository() {
    local repo_url=$1
    local branch=$2
    local folder=$3

    print_message "$YELLOW" "Attempting to clone repository from $repo_url..."

    # Remove existing folder if it exists
    if [ -d "$folder" ]; then
        print_message "$YELLOW" "Removing existing folder '$folder'..."
        rm -rf "$folder"
    fi

    # Print current directory before cloning
    print_message "$BLUE" "Current directory before cloning: $(pwd)"

    # Try cloning with different branch names
    local branches=("$branch" "main" "master")
    local clone_success=false

    for b in "${branches[@]}"; do
        print_message "$YELLOW" "Trying to clone with branch: $b"
        if git clone --branch "$b" "$repo_url" "$folder" 2>&1; then
            print_message "$GREEN" "Successfully cloned repository with branch: $b"
            clone_success=true
            break
        else
            print_message "$RED" "Failed to clone with branch $b"
        fi
    done

    if [ "$clone_success" = false ]; then
        print_message "$RED" "Failed to clone repository with any branch"
        print_message "$YELLOW" "Attempting to clone without specifying branch..."
        if git clone "$repo_url" "$folder" 2>&1; then
            print_message "$GREEN" "Successfully cloned repository without branch specification"
            clone_success=true
        else
            print_message "$RED" "Failed to clone repository"
            print_message "$RED" "Current directory: $(pwd)"
            print_message "$RED" "Directory contents:"
            ls -la
            exit 1
        fi
    fi

    # Verify the folder was created
    if [ ! -d "$folder" ]; then
        print_message "$RED" "Error: Build folder '$folder' was not created"
        print_message "$RED" "Current directory: $(pwd)"
        print_message "$RED" "Directory contents:"
        ls -la
        exit 1
    fi

    # Change to the repository directory
    print_message "$YELLOW" "Changing to directory: $folder"
    if ! cd "$folder"; then
        print_message "$RED" "Failed to change to directory: $folder"
        print_message "$RED" "Current directory: $(pwd)"
        print_message "$RED" "Directory contents:"
        ls -la
        exit 1
    fi

    # Print current directory and contents for debugging
    print_message "$BLUE" "Current directory after cd: $(pwd)"
    print_message "$BLUE" "Directory contents:"
    ls -la

    # Verify repository contents
    if [ ! -d ".git" ]; then
        print_message "$RED" "Error: Not a valid git repository"
        print_message "$RED" "Current directory: $(pwd)"
        print_message "$RED" "Directory contents:"
        ls -la
        exit 1
    fi

    # Try to fetch and update
    print_message "$YELLOW" "Fetching latest changes..."
    if ! git fetch --all; then
        print_message "$RED" "Failed to fetch repository"
        exit 1
    fi

    # Get current branch
    local current_branch=$(git rev-parse --abbrev-ref HEAD)
    print_message "$BLUE" "Current branch: $current_branch"

    # Try to pull latest changes
    print_message "$YELLOW" "Pulling latest changes..."
    if ! git pull; then
        print_message "$RED" "Failed to pull latest changes"
        exit 1
    fi
}

# Function to create manifest file
create_manifest() {
    print_message "$YELLOW" "Creating manifest file for admin privileges..."

    # Create the manifest XML file
    cat > manifest.xml << 'EOL'
<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<assembly xmlns="urn:schemas-microsoft-com:asm.v1" manifestVersion="1.0">
  <assemblyIdentity version="1.0.0.0" processorArchitecture="X86" name="TacticalRMMAgent" type="win32"/>
  <description>Tactical RMM Agent</description>
  <trustInfo xmlns="urn:schemas-microsoft-com:asm.v3">
    <security>
      <requestedPrivileges>
        <requestedExecutionLevel level="requireAdministrator" uiAccess="false"/>
      </requestedPrivileges>
    </security>
  </trustInfo>
</assembly>
EOL

    # Create the resource file directly
    cat > manifest.rc << 'EOL'
#include <winuser.h>

1 RT_MANIFEST "manifest.xml"
EOL

    # Compile resource file
    x86_64-w64-mingw32-windres --input manifest.rc --output manifest.syso --output-format=coff
    if [ $? -ne 0 ]; then
        print_message "$RED" "Failed to compile manifest resource file"
        exit 1
    fi

    print_message "$GREEN" "Manifest file created successfully"
}

# Function to patch NATS WebSocket URL
patch_nats_url() {
    print_message "$YELLOW" "Patching NATS WebSocket URL to support both HTTP and HTTPS..."

    # Find the agent.go file
    local agent_file="agent/agent.go"
    if [ ! -f "$agent_file" ]; then
        print_message "$RED" "Error: agent.go file not found at $agent_file"
        print_message "$RED" "Current directory: $(pwd)"
        print_message "$RED" "Directory contents:"
        ls -la
        exit 1
    fi

    print_message "$YELLOW" "Found agent.go file at: $agent_file"

    # Create backup
    print_message "$YELLOW" "Creating backup of agent.go..."
    cp "$agent_file" "${agent_file}.bak"

    # Create a temporary file for the modified content
    local temp_file=$(mktemp)

    # Read the file content and process it line by line
    local in_nats_block=false
    local block_indent=""
    while IFS= read -r line; do
        if [[ $line =~ ^([[:space:]]*)if[[:space:]]+ac\.NatsStandardPort[[:space:]]*!=?[[:space:]]*\"\"[[:space:]]*\{ ]]; then
            # Found the start of the NATS URL conditional block
            block_indent="${BASH_REMATCH[1]}"
            in_nats_block=true
            echo "$line" >> "$temp_file"
            # Add support for both HTTP and HTTPS with insecure mode
            echo "${block_indent}        // Support both HTTP and HTTPS connections with insecure mode" >> "$temp_file"
            echo "${block_indent}        if ac.Insecure == \"true\" {" >> "$temp_file"
            echo "${block_indent}            natsServer = fmt.Sprintf(\"ws://%s:%s\", ac.APIURL, ac.NatsStandardPort)" >> "$temp_file"
            echo "${block_indent}            natsWsCompression = true" >> "$temp_file"
            echo "${block_indent}        } else if strings.HasPrefix(ac.APIURL, \"https://\") {" >> "$temp_file"
            echo "${block_indent}            natsServer = fmt.Sprintf(\"tls://%s:%s\", ac.APIURL, ac.NatsStandardPort)" >> "$temp_file"
            echo "${block_indent}        } else {" >> "$temp_file"
            echo "${block_indent}            natsServer = fmt.Sprintf(\"ws://%s:%s\", ac.APIURL, ac.NatsStandardPort)" >> "$temp_file"
            echo "${block_indent}            natsWsCompression = true" >> "$temp_file"
            echo "${block_indent}        }" >> "$temp_file"
        elif [[ $in_nats_block = true && $line =~ ^[[:space:]]*\} ]]; then
            # Found the end of the block
            echo "$line" >> "$temp_file"
            in_nats_block=false
        elif [[ $in_nats_block = false ]]; then
            # Not in the NATS block, copy line as is
            echo "$line" >> "$temp_file"
        fi
    done < "$agent_file"

    # Verify the change was made
    if grep -q "if ac.Insecure == \"true\"" "$temp_file"; then
        print_message "$GREEN" "Successfully patched NATS URL in $agent_file"
        mv "$temp_file" "$agent_file"
    else
        print_message "$RED" "Failed to verify patch in $agent_file"
        mv "${agent_file}.bak" "$agent_file"
        rm "$temp_file"
        exit 1
    fi

    # Verify changes
    print_message "$YELLOW" "Verifying changes..."
    if grep -q "if ac.Insecure == \"true\"" "$agent_file"; then
        print_message "$GREEN" "Verified changes in $agent_file"
        rm "${agent_file}.bak"
    else
        print_message "$RED" "Error: Changes were not made to $agent_file"
        mv "${agent_file}.bak" "$agent_file"
        exit 1
    fi

    print_message "$GREEN" "NATS WebSocket URL patched successfully to support both HTTP and HTTPS with insecure mode"
}

# Function to compile agent
compile_agent() {
    print_message "$YELLOW" "Compiling agent..."

    # Create manifest file first
    create_manifest

    # Print current directory and environment for debugging
    print_message "$BLUE" "Current directory: $(pwd)"
    print_message "$BLUE" "Environment variables:"
    print_message "$BLUE" "GOOS: $GOOS"
    print_message "$BLUE" "GOARCH: $GOARCH"
    print_message "$BLUE" "CGO_ENABLED: $CGO_ENABLED"
    print_message "$BLUE" "CC: $CC"
    print_message "$BLUE" "PATH: $PATH"
    print_message "$BLUE" "Go version:"
    go version

    # List all Go files in current directory
    print_message "$BLUE" "Go files in current directory:"
    find . -name "*.go" -type f

    # Set cross-compilation environment variables
    export GOOS=windows
    export GOARCH=amd64
    export CGO_ENABLED=1
    export CC=x86_64-w64-mingw32-gcc
    export CXX=x86_64-w64-mingw32-g++
    export PKG_CONFIG_PATH=/usr/x86_64-w64-mingw32/lib/pkgconfig

    # Check if go.mod exists
    if [ -f "go.mod" ]; then
        print_message "$YELLOW" "Found go.mod file"
        print_message "$BLUE" "go.mod contents:"
        cat "go.mod"
    else
        print_message "$RED" "Error: No go.mod file found"
        print_message "$RED" "Current directory: $(pwd)"
        print_message "$RED" "Directory contents:"
        ls -la
        exit 1
    fi

    # Download dependencies
    print_message "$YELLOW" "Downloading dependencies..."
    go mod download
    if [ $? -ne 0 ]; then
        print_message "$RED" "Failed to download dependencies"
        exit 1
    fi

    # Build with specific flags for Windows executable
    print_message "$YELLOW" "Building agent with verbose output..."
    go build -v \
        -buildvcs=false \
        -ldflags "-s -w -extldflags '-static -Wl,--subsystem,windows' -X main.Version=$VERSION" \
        -tags "windows" \
        -o "tacticalrmm-$VERSION.exe" . 2>&1 | tee build.log

    if [ -f "tacticalrmm-$VERSION.exe" ]; then
        print_message "$GREEN" "Agent compiled successfully."
        # Verify the binary is a Windows executable
        if file "tacticalrmm-$VERSION.exe" | grep -q "PE32+ executable"; then
            print_message "$GREEN" "Binary verified as Windows executable"
            # Additional verification
            print_message "$BLUE" "Binary details:"
            file "tacticalrmm-$VERSION.exe"
        else
            print_message "$RED" "Warning: Binary may not be a valid Windows executable"
            file "tacticalrmm-$VERSION.exe"
            print_message "$RED" "Build log contents:"
            cat build.log
            exit 1
        fi
    else
        print_message "$RED" "Error: Agent compilation failed."
        print_message "$RED" "Build log contents:"
        cat build.log
        print_message "$RED" "Current directory contents:"
        ls -la
        exit 1
    fi
}

# Main script
print_message "$GREEN" "Tactical RMM Agent Build Process Started"
print_message "$GREEN" "======================================"

# Store original directory
ORIGINAL_DIR=$(pwd)

# Change to /tmp for all operations
cd /tmp || {
    print_message "$RED" "Failed to change to /tmp directory"
    exit 1
}

# Create output directory in /tmp
mkdir -p "$OUTPUT_FOLDER"

# Install required tools
install_go
install_git
install_cross_compiler

# Create build directory
if [ -d "$BUILD_FOLDER" ]; then
    print_message "$YELLOW" "Removing existing build folder..."
    rm -rf "$BUILD_FOLDER"
fi
mkdir -p "$BUILD_FOLDER"

# Clone repository
clone_repository "https://github.com/amidaware/rmmagent.git" "master" "$BUILD_FOLDER"

# Ensure we're in the build directory
cd "$BUILD_FOLDER" || {
    print_message "$RED" "Failed to change to build directory"
    print_message "$RED" "Current directory: $(pwd)"
    print_message "$RED" "Directory contents:"
    ls -la
    exit 1
}

# List directory contents for debugging
print_message "$BLUE" "Directory contents:"
ls -la

# Add call to patch_nats_url before compile_agent
patch_nats_url

# Compile agent (staying in the root directory)
compile_agent

# Create a directory structure that matches Windows installation
print_message "$YELLOW" "Creating output directory structure..."
mkdir -p "$OUTPUT_FOLDER/TacticalAgent"

# Copy the compiled binary to output directory with both versioned and unversioned names
print_message "$YELLOW" "Copying compiled binary..."
cp "tacticalrmm-$VERSION.exe" "$OUTPUT_FOLDER/TacticalAgent/tacticalrmm-$VERSION.exe"

# Verify the copy was successful
if [ ! -f "$OUTPUT_FOLDER/TacticalAgent/tacticalrmm-$VERSION.exe" ]; then
    print_message "$RED" "Error: Failed to copy binary to output directory"
    print_message "$RED" "Source: tacticalrmm-$VERSION.exe"
    print_message "$RED" "Destination: $OUTPUT_FOLDER/TacticalAgent/tacticalrmm-$VERSION.exe"
    exit 1
fi

# Create installation script
# Create installation script
print_message "$YELLOW" "Creating installation script..."
cat > "$OUTPUT_FOLDER/TacticalAgent/install.ps1" << 'EOL'
# Run as administrator
if (-NOT ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)) {
    Write-Warning "Please run this script as Administrator"
    Break
}

Write-Host "Starting Tactical RMM Agent installation..." -ForegroundColor Yellow

# Get all arguments passed to the script
$arguments = $args

# Create Program Files directory if it doesn't exist
$programFilesDir = "C:\Program Files\TacticalAgent"
if (-not (Test-Path $programFilesDir)) {
    New-Item -ItemType Directory -Path $programFilesDir -Force | Out-Null
    Write-Host "Created Program Files directory: $programFilesDir"
}

# Copy binary to Program Files with standard name
$sourceBinary = Join-Path $PSScriptRoot "tacticalrmm-$VERSION.exe"
$targetBinary = Join-Path $programFilesDir "tacticalrmm.exe"
Copy-Item -Path $sourceBinary -Destination $targetBinary -Force
Write-Host "Copied binary to: $targetBinary"

Write-Host "Installing agent with provided arguments..." -ForegroundColor Yellow

# Run installation with all provided arguments
& $targetBinary $arguments

Write-Host "Installation completed." -ForegroundColor Green
EOL

# Return to original directory
cd "$ORIGINAL_DIR"

print_message "$GREEN" "Build process completed successfully"
print_message "$GREEN" "Output files are in: $OUTPUT_FOLDER/TacticalAgent/"