#!/bin/bash
# MeshAgent installation script for macOS (Apple Silicon) with MacPorts OpenSSL 1.1

# Enable logging to file
LOGFILE="/var/log/meshagent-install.log"
exec > "$LOGFILE" 2>&1
set -x   # echo commands for debug logging

# Define build directory
BUILD_DIR="/tmp/meshagent_build"

# Function to cleanup existing Mesh Agent installation
cleanup_existing_installation() {
    echo "Cleaning up existing Mesh Agent installation..."
    
    # Kill any running mesh processes
    if pgrep -f meshagent > /dev/null; then
        echo "Stopping running Mesh Agent processes..."
        sudo pkill -f meshagent
        sleep 2
    fi

    # Remove existing installation directory and files
    INSTALL_PATHS=(
        "/Applications/MeshAgent"
        "$HOME/Library/Application\ Support/MeshAgent"
        "/Library/LaunchAgents/meshagent.plist"
        "/Library/LaunchDaemons/meshagent.plist"
        "$BUILD_DIR"
    )

    for path in "${INSTALL_PATHS[@]}"; do
        if [ -e "${path}" ]; then
            echo "Removing ${path}..."
            sudo rm -rf "${path}"
        fi
    done

    # Clean up any leftover log files
    sudo rm -f /var/log/meshagent*.log

    echo "Cleanup completed."
}

# Run cleanup before proceeding with installation
cleanup_existing_installation

# Default parameters (if any)
SERVER_URL="localhost"
SERVER_PORT="8383"
MESH_NAME="TacticalRMM"
WS_MODE="ws"

# Parse parameters
while getopts "u:p:g:w:" OPT; do
  case "$OPT" in
    u) SERVER_URL="$OPTARG" ;;
    p) SERVER_PORT="$OPTARG" ;;
    g) MESH_NAME="$OPTARG" ;;
    w) WS_MODE="$OPTARG" ;;
  esac
done

if [[ -z "$SERVER_URL" || -z "$SERVER_PORT" || -z "$MESH_NAME" || -z "$WS_MODE" ]]; then
  echo "Usage: $0 -u <ServerURL> -p <Port> -g <DeviceGroup> -w <ws|wss>"
  exit 1
fi

echo "Installing Node.js and OpenSSL 1.1 via MacPorts..."
# Install Node.js (if not installed)
if ! command -v node >/dev/null 2>&1; then
  sudo port selfupdate
  sudo port install nodejs18 npm8
fi

# Install OpenSSL 1.1 (openssl11) via MacPorts
if ! port installed openssl11 | grep -q "openssl11 .* (active)"; then
  sudo port install openssl11
fi

# Export MacPorts OpenSSL paths for compiler/linker
export OPENSSL_ROOT_DIR="/opt/local"
export OPENSSL_INCLUDE_DIR="/opt/local/include"
export OPENSSL_LIB_DIR="/opt/local/lib"

# Updated CFLAGS and LDFLAGS for proper OpenSSL linking
export CFLAGS="-target arm64-apple-macos11 -std=gnu99 -Wall -g -DJPEGMAXBUF=0 -DMESH_AGENTID=29 -D_POSIX -D_DEBUG -DMICROSTACK_PROXY -D__APPLE__ -fno-strict-aliasing -I. -I/opt/local/include/openssl -I/opt/local/include -Imicrostack -Imicroscript -Imeshcore -Imeshconsole -D_LINKVM -D_NOHECI -DMICROSTACK_TLS_DETECT -O0 -D_FORTIFY_SOURCE=2 -Wformat -Wformat-security -fstack-protector"
export LDFLAGS="-L/opt/local/lib -lssl -lcrypto -Wl,-rpath,/opt/local/lib"
export PKG_CONFIG_PATH="/opt/local/lib/pkgconfig"

echo "Cloning MeshAgent source and building for Apple Silicon..."
# Create and enter build directory
mkdir -p "$BUILD_DIR"
cd "$BUILD_DIR" || exit 1

# Get MeshAgent source
if [ ! -d "MeshAgent" ]; then
    git clone https://github.com/Ylianst/MeshAgent.git
fi
cd MeshAgent || exit 1

# Clean any previous builds
make clean

# Create a local Makefile.mac to override the default SSL paths
cat << EOF > Makefile.mac
SSL_PATH=/opt/local
CFLAGS += -I\$(SSL_PATH)/include
LDFLAGS += -L\$(SSL_PATH)/lib
EOF

# Build for macOS ARM64 (ARCHID=29) with multiple cores
make macos ARCHID=29 DEBUG=1 -j$(sysctl -n hw.logicalcpu)

# After build, determine output binary name
BUILD_BIN="meshagent_osx-arm-64"
if [ ! -f "$BUILD_BIN" ]; then
  echo "ERROR: MeshAgent binary not found after build. Check $LOGFILE for compilation errors."
  exit 1
fi

# Prepare installation files
echo "Preparing MeshAgent files for installation..."
INSTALL_DIR="/Applications/MeshAgent"
DATA_DIR="${HOME}/Library/Application Support/MeshAgent"
# Escape spaces in paths
DATA_DIR_ESCAPED="${DATA_DIR// /\\ }"
LOG_DIR="${DATA_DIR}/logs"
LOG_DIR_ESCAPED="${LOG_DIR// /\\ }"

# Create installation directories with proper permissions
sudo mkdir -p "${INSTALL_DIR}"
mkdir -p "${DATA_DIR}"
mkdir -p "${LOG_DIR}"

# Copy binary and set permissions
sudo cp "${BUILD_BIN}" "${INSTALL_DIR}/meshagent"
sudo chmod 755 "${INSTALL_DIR}/meshagent"

# Set proper ownership and permissions
sudo chown -R root:wheel "${INSTALL_DIR}"
sudo chmod -R 755 "${INSTALL_DIR}"
chown -R "${USER}:staff" "${DATA_DIR}"
chmod -R 755 "${DATA_DIR}"

# Create meshagent.msh configuration with debug logging
echo "Creating Mesh Agent configuration file..."
CFG_FILE="${DATA_DIR}/meshagent.msh"
CFG_FILE_ESCAPED="${CFG_FILE// /\\ }"

# Create configuration with proper formatting and database path
cat << EOF > "${CFG_FILE}"
{
    "MeshName": "${MESH_NAME}",
    "MeshType": 2,
    "Debug": 1,
    "DatabasePath": "${DATA_DIR_ESCAPED}",
    "LogPath": "${LOG_DIR_ESCAPED}",
    "MeshServer": "${WS_MODE}://${SERVER_URL}:${SERVER_PORT}/agent.ashx"
}
EOF

# Set proper permissions for config file
chmod 600 "${CFG_FILE}"

# Verify configuration file
if [ ! -f "${CFG_FILE}" ]; then
    echo "ERROR: Failed to create configuration file at ${CFG_FILE}"
    exit 1
fi

echo "Configuration file created successfully at ${CFG_FILE}"
echo "Configuration contents:"
cat "${CFG_FILE}"

# Run the agent directly with debug output
echo "Running MeshAgent in debug mode..."
cd "${INSTALL_DIR}"

# Create a wrapper script to handle paths with spaces
WRAPPER_SCRIPT="${INSTALL_DIR}/run_meshagent.sh"
cat << EOF | sudo tee "${WRAPPER_SCRIPT}"
#!/bin/bash
DYLD_LIBRARY_PATH=/opt/local/lib ./meshagent -debug -configuration "${CFG_FILE}" -dbpath "${DATA_DIR}" "\$@"
EOF
sudo chmod +x "${WRAPPER_SCRIPT}"

# Run the agent using the wrapper script
sudo "${WRAPPER_SCRIPT}" 2>&1 | tee "${LOG_DIR}/meshagent_debug.log"

echo "MeshAgent debug log saved to ${LOG_DIR}/meshagent_debug.log"
