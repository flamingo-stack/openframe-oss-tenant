#!/bin/bash
# MeshAgent installation script for macOS (Apple Silicon) with MacPorts OpenSSL 1.1

# Set error handling
set -e

# Function to check and request full disk access
check_full_disk_access() {
    log "Checking for Full Disk Access permission..."
    
    # Check if we have full disk access by attempting to write to a protected location
    if ! sudo touch /Library/Application\ Support/test.tmp 2>/dev/null; then
        log "Full Disk Access permission is required for MeshAgent installation."
        log "Please follow these steps:"
        log "1. Open System Settings"
        log "2. Click on Privacy & Security"
        log "3. Scroll down to Full Disk Access"
        log "4. Click the + button"
        log "5. Navigate to /Applications/Terminal.app and add it"
        log "6. Check the box next to Terminal"
        log "7. Press Enter when you have completed these steps"
        read -r
    else
        sudo rm -f /Library/Application\ Support/test.tmp
    fi
}

# Setup logging
LOGFILE="/var/log/meshagent-install.log"
sudo rm -f "$LOGFILE"
sudo touch "$LOGFILE"
sudo chown "${USER}:admin" "$LOGFILE"
sudo chmod 644 "$LOGFILE"

# Logging function
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | sudo tee -a "$LOGFILE"
}

# Error handling
handle_error() {
    log "ERROR: Command failed at line $1"
    exit 1
}

trap 'handle_error $LINENO' ERR

# Function to check command success
check_success() {
    if [ $? -eq 0 ]; then
        log "SUCCESS: $1"
    else
        log "FAILED: $1"
        exit 1
    fi
}

# Function to ensure proper permissions
ensure_permissions() {
    local path="$1"
    local perms="$2"
    local owner="$3"
    local group="$4"
    
    if [ ! -e "$path" ]; then
        sudo mkdir -p "$path"
    fi
    
    sudo chown "$owner:$group" "$path"
    sudo chmod "$perms" "$path"
}

# Function to request necessary permissions for MeshAgent
request_agent_permissions() {
    log "Requesting necessary permissions for MeshAgent..."
    
    # Request Full Disk Access
    log "Please grant Full Disk Access to MeshAgent:"
    log "1. Open System Settings"
    log "2. Click on Privacy & Security"
    log "3. Scroll down to Full Disk Access"
    log "4. Click the + button"
    log "5. Navigate to /Applications/MeshAgent/meshagent and add it"
    log "6. Check the box next to meshagent"
    log "7. Press Enter when you have completed these steps"
    read -r

    # Request Accessibility Access
    log "Please grant Accessibility Access to MeshAgent:"
    log "1. Open System Settings"
    log "2. Click on Privacy & Security"
    log "3. Scroll down to Accessibility"
    log "4. Click the + button"
    log "5. Navigate to /Applications/MeshAgent/meshagent and add it"
    log "6. Check the box next to meshagent"
    log "7. Press Enter when you have completed these steps"
    read -r
}

log "Starting MeshAgent installation..."

# Check for full disk access before proceeding
check_full_disk_access

# Function to cleanup existing Mesh Agent installation
cleanup_existing_installation() {
    # Temporarily disable logging to the file we're about to delete
    local temp_log="/tmp/meshagent_cleanup.log"
    local original_log="$LOGFILE"
    
    # Create temporary log with proper permissions
    sudo touch "$temp_log"
    sudo chown "${USER}:admin" "$temp_log"
    sudo chmod 644 "$temp_log"
    
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | sudo tee -a "$temp_log"
    }
    
    log "Stage 1: Cleaning up existing installation..."
    
    # Kill any running mesh processes
    if pgrep -f meshagent > /dev/null 2>&1; then
        log "Stopping running Mesh Agent processes..."
        sudo pkill -f meshagent || true
        sleep 2
        
        # Force kill if still running
        if pgrep -f meshagent > /dev/null 2>&1; then
            log "Force killing remaining Mesh Agent processes..."
            sudo pkill -9 -f meshagent || true
            sleep 1
        fi
    else
        log "No running Mesh Agent processes found."
    fi

    # Remove existing installation directory and files
    INSTALL_PATHS=(
        "/Applications/MeshAgent"
        "$HOME/Library/Application Support/MeshAgent"
        "/Library/LaunchAgents/meshagent.plist"
        "/Library/LaunchAgents/com.meshagent.plist"
        "/Library/LaunchDaemons/meshagent.plist"
        "/Library/LaunchDaemons/com.meshagent.plist"
        "/Library/LaunchDaemons/com.meshagent.service.plist"
        "/Library/LaunchDaemons/com.meshcentral.meshagent.plist"
        "$BUILD_DIR"
        "/var/lib/meshagent"
        "/var/log/meshagent"
        "$HOME/.meshagent"
        "/tmp/meshagent_tmp"
    )

    for path in "${INSTALL_PATHS[@]}"; do
        if [ -e "${path}" ]; then
            log "Removing ${path}..."
            sudo rm -rf "${path}" || {
                log "Warning: Failed to remove ${path}"
                true
            }
        fi
    done

    # Clean up any remaining log files
    find /var/log -name "meshagent*.log" -type f -delete 2>/dev/null || true
    find "$HOME/.meshagent" -name "*.log" -type f -delete 2>/dev/null || true

    # Clean up any remaining database files and WAL files
    find /var/lib/meshagent -name "*.db*" -type f -delete 2>/dev/null || true
    find "$HOME/.meshagent" -name "*.db*" -type f -delete 2>/dev/null || true
    find /var/lib/meshagent -name "*.db-wal" -type f -delete 2>/dev/null || true
    find /var/lib/meshagent -name "*.db-shm" -type f -delete 2>/dev/null || true

    # Unload any existing LaunchDaemon
    sudo launchctl unload -w "/Library/LaunchDaemons/com.meshagent.plist" 2>/dev/null || true
    sudo launchctl unload -w "/Library/LaunchDaemons/com.meshagent.service.plist" 2>/dev/null || true
    sudo launchctl unload -w "/Library/LaunchDaemons/com.meshcentral.meshagent.plist" 2>/dev/null || true
    sudo launchctl unload -w "/Library/LaunchAgents/com.meshagent.plist" 2>/dev/null || true

    # Now safely remove the installation log file
    if [ -f "$original_log" ]; then
        sudo rm -f "$original_log"
    fi

    # Restore original logging function
    log() {
        echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | sudo tee -a "$LOGFILE"
    }

    # Copy cleanup log to main log file if it exists
    if [ -f "$temp_log" ]; then
        sudo cp "$temp_log" "$LOGFILE" 2>/dev/null || true
        sudo chown "${USER}:admin" "$LOGFILE"
        sudo chmod 644 "$LOGFILE"
        rm -f "$temp_log"
    fi

    log "Cleanup completed."
    return 0
}

# Parse command line arguments
log "Stage 2: Parsing command line arguments..."
SERVER_URL="localhost"
SERVER_PORT="8383"
MESH_NAME="TacticalRMM"
WS_MODE="ws"

while getopts "u:p:g:w:" OPT; do
  case "$OPT" in
    u) SERVER_URL="$OPTARG" ;;
    p) SERVER_PORT="$OPTARG" ;;
    g) MESH_NAME="$OPTARG" ;;
    w) WS_MODE="$OPTARG" ;;
  esac
done

if [[ -z "$SERVER_URL" || -z "$SERVER_PORT" || -z "$MESH_NAME" || -z "$WS_MODE" ]]; then
  log "ERROR: Missing required parameters"
  log "Usage: $0 -u <ServerURL> -p <Port> -g <DeviceGroup> -w <ws|wss>"
  exit 1
fi

log "Parameters validated successfully"

# Run cleanup
cleanup_existing_installation
check_success "Cleanup phase"

# Install dependencies
log "Stage 3: Installing dependencies..."

# Install Node.js (if not installed)
if ! command -v node >/dev/null 2>&1; then
  log "Installing Node.js..."
  sudo port selfupdate
  sudo port install nodejs18 npm8
  check_success "Node.js installation"
fi

# Install OpenSSL 1.1
if ! port installed openssl11 | grep -q "openssl11 .* (active)"; then
  log "Installing OpenSSL 1.1..."
  sudo port install openssl11
  check_success "OpenSSL 1.1 installation"
fi

# Install SQLite3
if ! port installed sqlite3 | grep -q "sqlite3 .* (active)"; then
  log "Installing SQLite3..."
  sudo port install sqlite3
  check_success "SQLite3 installation"
fi

log "All dependencies installed successfully"

# Define build directory with proper permissions
BUILD_DIR="/tmp/meshagent_build"
if [ ! -w "/tmp" ]; then
    echo "ERROR: No write permission to /tmp"
    exit 1
fi

# Export build environment variables
log "Stage 4: Setting up build environment..."

# Export MacPorts paths for compiler/linker
export OPENSSL_ROOT_DIR="/opt/local"
export OPENSSL_INCLUDE_DIR="/opt/local/include"
export OPENSSL_LIB_DIR="/opt/local/lib"
export SQLITE_ROOT_DIR="/opt/local"
export SQLITE_INCLUDE_DIR="/opt/local/include"
export SQLITE_LIB_DIR="/opt/local/lib"

# Add SQLite debugging flags
export SQLITE_DEBUG=1
export SQLITE_ENABLE_COLUMN_METADATA=1
export SQLITE_ENABLE_EXPLAIN_COMMENTS=1
export SQLITE_ENABLE_SQLLOG=1

# Set up CFLAGS and LDFLAGS
export CFLAGS="-target arm64-apple-macos11 -std=gnu99 -Wall -g -DJPEGMAXBUF=0 -DMESH_AGENTID=29 -D_POSIX -D_DEBUG -DMICROSTACK_PROXY -D__APPLE__ -fno-strict-aliasing -I. -I/opt/local/include/openssl -I/opt/local/include -Imicrostack -Imicroscript -Imeshcore -Imeshconsole -D_LINKVM -D_NOHECI -DMICROSTACK_TLS_DETECT -O0 -D_FORTIFY_SOURCE=2 -Wformat -Wformat-security -fstack-protector"
export LDFLAGS="-L/opt/local/lib -lssl -lcrypto -lsqlite3 -Wl,-rpath,/opt/local/lib"
export PKG_CONFIG_PATH="/opt/local/lib/pkgconfig"

log "Build environment configured"

# Build MeshAgent
log "Stage 5: Building MeshAgent..."

# Create and enter build directory
log "Creating build directory..."
mkdir -p "$BUILD_DIR" || { log "Failed to create build directory"; exit 1; }
cd "$BUILD_DIR" || { log "Failed to change to build directory"; exit 1; }

# Clone source code
log "Cloning MeshAgent source..."
if [ ! -d "MeshAgent" ]; then
    if ! git clone https://github.com/Ylianst/MeshAgent.git; then
        log "ERROR: Failed to clone MeshAgent repository"
        exit 1
    fi
fi

cd MeshAgent || { log "Failed to change to MeshAgent directory"; exit 1; }
check_success "Source code preparation"

# Clean any previous builds
log "Cleaning previous builds..."
make clean
check_success "Build cleanup"

# Create local Makefile.mac
log "Creating Makefile.mac..."
cat << EOF > Makefile.mac
SSL_PATH=/opt/local
CFLAGS += -I\$(SSL_PATH)/include
LDFLAGS += -L\$(SSL_PATH)/lib
EOF
check_success "Makefile.mac creation"

# Build for macOS ARM64
log "Building MeshAgent..."
if ! make macos ARCHID=29 DEBUG=1 -j$(sysctl -n hw.logicalcpu); then
    log "ERROR: Build failed"
    exit 1
fi
check_success "MeshAgent build"

# Verify build output
BUILD_BIN="meshagent_osx-arm-64"
if [ ! -f "$BUILD_BIN" ]; then
    log "ERROR: MeshAgent binary not found after build"
    exit 1
fi
check_success "Build verification"

# Prepare installation
log "Stage 6: Preparing installation..."

# Setup directories with proper permissions
INSTALL_DIR="/Applications/MeshAgent"
DATA_DIR="/var/lib/meshagent"
LOG_DIR="${DATA_DIR}/logs"
DB_DIR="${DATA_DIR}/db"
DB_FILE="${DB_DIR}/meshagent.db"

# Create and set permissions for all directories
log "Creating installation directories with proper permissions..."
ensure_permissions "$INSTALL_DIR" "755" "root" "admin"
ensure_permissions "$DATA_DIR" "755" "root" "admin"
ensure_permissions "$LOG_DIR" "777" "root" "admin"
ensure_permissions "$DB_DIR" "777" "root" "admin"

# Copy and set permissions for binary
log "Installing MeshAgent binary..."
sudo cp "${BUILD_BIN}" "${INSTALL_DIR}/meshagent"
sudo chmod 755 "${INSTALL_DIR}/meshagent"
sudo chown root:admin "${INSTALL_DIR}/meshagent"

check_success "Installation preparation"

# Initialize SQLite database
log "Stage 7: Initializing SQLite database..."

# Remove any existing database file and WAL files
sudo rm -f "${DB_FILE}"*

# Create and initialize the database with proper permissions
sudo sqlite3 "${DB_FILE}" << 'EOF'
PRAGMA journal_mode=WAL;
PRAGMA synchronous=NORMAL;
PRAGMA auto_vacuum=FULL;
PRAGMA temp_store=MEMORY;

CREATE TABLE IF NOT EXISTS debug_log (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    message TEXT
);

CREATE INDEX IF NOT EXISTS idx_debug_log_timestamp ON debug_log(timestamp);

INSERT INTO debug_log (message) VALUES ('Database initialized successfully');
EOF

# Set database file permissions
sudo chmod 666 "${DB_FILE}"      # Allow everyone to read/write

# Create empty WAL and SHM files with proper permissions
sudo touch "${DB_FILE}-wal"
sudo touch "${DB_FILE}-shm"
sudo chmod 666 "${DB_FILE}-wal"  # Allow everyone to read/write WAL file
sudo chmod 666 "${DB_FILE}-shm"  # Allow everyone to read/write SHM file

# Verify database access
if ! sqlite3 "${DB_FILE}" "SELECT COUNT(*) FROM debug_log;"; then
    log "ERROR: Unable to access database after initialization"
    exit 1
fi

log "Database initialized successfully with proper permissions"

# Create configuration
log "Stage 8: Creating configuration..."
CFG_FILE="${DATA_DIR}/meshagent.msh"

# Create configuration file
log "Writing configuration file..."
cat << EOF | sudo tee "${CFG_FILE}" > /dev/null
{
    "MeshName": "${MESH_NAME}",
    "MeshType": 2,
    "Debug": 1,
    "DatabasePath": "${DB_FILE}",
    "LogPath": "${LOG_DIR}",
    "MeshServer": "${WS_MODE}://${SERVER_URL}:${SERVER_PORT}/agent.ashx"
}
EOF

# Set config permissions
sudo chmod 644 "${CFG_FILE}"
sudo chown root:admin "${CFG_FILE}"
check_success "Configuration creation"

# Create wrapper script
log "Stage 9: Creating wrapper script..."
WRAPPER_SCRIPT="${INSTALL_DIR}/run_meshagent.sh"

cat << 'EOF' | sudo tee "${WRAPPER_SCRIPT}" > /dev/null
#!/bin/bash
set -e

# Environment setup
export DYLD_LIBRARY_PATH=/opt/local/lib
export SQLITE_DEBUG=1
export SQLITE_ENABLE_COLUMN_METADATA=1
export SQLITE_ENABLE_EXPLAIN_COMMENTS=1
export SQLITE_ENABLE_SQLLOG=1

# Set up SQLite temporary directory
export SQLITE_TMPDIR="/tmp/meshagent_tmp"
sudo mkdir -p "${SQLITE_TMPDIR}"
sudo chmod 777 "${SQLITE_TMPDIR}"

# Ensure database directory permissions
DB_DIR=$(dirname "$2")
if [ ! -w "${DB_DIR}" ]; then
    echo "ERROR: Database directory ${DB_DIR} is not writable"
    sudo chmod 777 "${DB_DIR}"
fi

# Ensure log directory permissions
LOG_DIR=$(dirname "$1")/logs
sudo mkdir -p "${LOG_DIR}"
sudo chmod 777 "${LOG_DIR}"

# Change to installation directory
cd "/Applications/MeshAgent" || exit 1

# Create a log file that we can access
LOG_FILE="${LOG_DIR}/meshagent_debug.log"
sudo rm -f "${LOG_FILE}"  # Remove existing log file
sudo touch "${LOG_FILE}"
sudo chmod 666 "${LOG_FILE}"
sudo chown root:admin "${LOG_FILE}"

# Log startup information
{
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MeshAgent..."
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Environment:"
    env
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Current directory: $(pwd)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Binary exists: $([ -f "./meshagent" ] && echo "yes" || echo "no")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Binary permissions: $(ls -l ./meshagent)"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log file: ${LOG_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log directory permissions: $(ls -ld "${LOG_DIR}")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Log file permissions: $(ls -l "${LOG_FILE}")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configuration file: $1"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database file: $2"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configuration file exists: $([ -f "$1" ] && echo "yes" || echo "no")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database file exists: $([ -f "$2" ] && echo "yes" || echo "no")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configuration file permissions: $(ls -l "$1")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Database file permissions: $(ls -l "$2")"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Configuration file contents:"
    cat "$1"
} | sudo tee -a "${LOG_FILE}"

# Test log file writing
if ! echo "[$(date '+%Y-%m-%d %H:%M:%S')] Testing log file write access..." | sudo tee -a "${LOG_FILE}" > /dev/null; then
    echo "ERROR: Cannot write to log file ${LOG_FILE}"
    exit 1
fi

# Start agent with enhanced debugging and explicit log redirection
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting MeshAgent process..." | sudo tee -a "${LOG_FILE}"

# Run the agent in the background and capture its PID
sudo ./meshagent \
    -debug \
    -debuglevel 10 \
    -configuration "$1" \
    -dbpath "$2" \
    -sqlitedebug \
    -logfile "${LOG_FILE}" \
    -nofullscreen \
    -noprivileges \
    -noconsole \
    -nohide \
    -nofork \
    2>&1 | sudo tee -a "${LOG_FILE}" &

AGENT_PID=$!

# Wait a moment to see if the process is still running
sleep 2

if ! kill -0 $AGENT_PID 2>/dev/null; then
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: MeshAgent process terminated immediately" | sudo tee -a "${LOG_FILE}"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] Checking system logs for errors..." | sudo tee -a "${LOG_FILE}"
    sudo log show --predicate 'process == "meshagent"' --last 5s | sudo tee -a "${LOG_FILE}"
    exit 1
fi

echo "[$(date '+%Y-%m-%d %H:%M:%S')] MeshAgent started successfully with PID: ${AGENT_PID}" | sudo tee -a "${LOG_FILE}"

# Keep the script running
while kill -0 $AGENT_PID 2>/dev/null; do
    sleep 1
done

# Log the exit code
EXIT_CODE=$?
echo "[$(date '+%Y-%m-%d %H:%M:%S')] MeshAgent exited with code: ${EXIT_CODE}" | sudo tee -a "${LOG_FILE}"

# Exit with the same code
exit ${EXIT_CODE}
EOF

sudo chmod 755 "${WRAPPER_SCRIPT}"
sudo chown root:admin "${WRAPPER_SCRIPT}"

# Create a LaunchDaemon to run MeshAgent with proper permissions
log "Creating LaunchDaemon..."
PLIST_FILE="/Library/LaunchDaemons/com.meshagent.plist"

# First, ensure all related LaunchDaemons are unloaded
log "Unloading existing LaunchDaemons..."
sudo launchctl unload -w "/Library/LaunchDaemons/com.meshagent.plist" 2>/dev/null || true
sudo launchctl unload -w "/Library/LaunchDaemons/com.meshagent.service.plist" 2>/dev/null || true
sudo launchctl unload -w "/Library/LaunchDaemons/com.meshcentral.meshagent.plist" 2>/dev/null || true
sudo launchctl unload -w "/Library/LaunchAgents/com.meshagent.plist" 2>/dev/null || true

# Kill any remaining processes
sudo pkill -f meshagent || true
sleep 2

# Verify log directory and file permissions
log "Verifying log directory and file permissions..."
sudo mkdir -p "${LOG_DIR}"
sudo chmod 777 "${LOG_DIR}"
sudo touch "${LOG_DIR}/meshagent_debug.log"
sudo chmod 666 "${LOG_DIR}/meshagent_debug.log"
sudo chown root:admin "${LOG_DIR}/meshagent_debug.log"

cat << EOF | sudo tee "${PLIST_FILE}" > /dev/null
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.meshagent</string>
    <key>ProgramArguments</key>
    <array>
        <string>/Applications/MeshAgent/run_meshagent.sh</string>
        <string>/var/lib/meshagent/meshagent.msh</string>
        <string>/var/lib/meshagent/db/meshagent.db</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/lib/meshagent/logs/meshagent_debug.log</string>
    <key>StandardErrorPath</key>
    <string>/var/lib/meshagent/logs/meshagent_debug.log</string>
    <key>UserName</key>
    <string>root</string>
    <key>GroupName</key>
    <string>admin</string>
    <key>InitGroups</key>
    <true/>
    <key>ProcessType</key>
    <string>Interactive</string>
    <key>WorkingDirectory</key>
    <string>/Applications/MeshAgent</string>
    <key>EnvironmentVariables</key>
    <dict>
        <key>DYLD_LIBRARY_PATH</key>
        <string>/opt/local/lib</string>
        <key>SQLITE_DEBUG</key>
        <string>1</string>
        <key>SQLITE_ENABLE_COLUMN_METADATA</key>
        <string>1</string>
        <key>SQLITE_ENABLE_EXPLAIN_COMMENTS</key>
        <string>1</string>
        <key>SQLITE_ENABLE_SQLLOG</key>
        <string>1</string>
        <key>PATH</key>
        <string>/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:/opt/local/bin</string>
    </dict>
    <key>ThrottleInterval</key>
    <integer>30</integer>
    <key>ExitTimeout</key>
    <integer>30</integer>
    <key>MachServices</key>
    <dict>
        <key>com.meshagent</key>
        <true/>
    </dict>
    <key>EnableTransactions</key>
    <true/>
</dict>
</plist>
EOF

sudo chmod 644 "${PLIST_FILE}"
sudo chown root:admin "${PLIST_FILE}"

# Load the LaunchDaemon with proper bootstrapping
log "Loading LaunchDaemon..."
sudo launchctl bootout system "${PLIST_FILE}" 2>/dev/null || true
sleep 2

# Verify wrapper script permissions
sudo chmod 755 "${WRAPPER_SCRIPT}"
sudo chown root:admin "${WRAPPER_SCRIPT}"

# Verify binary permissions
sudo chmod 755 "${INSTALL_DIR}/meshagent"
sudo chown root:admin "${INSTALL_DIR}/meshagent"

# Load the LaunchDaemon
sudo launchctl bootstrap system "${PLIST_FILE}" || {
    log "Warning: Failed to load LaunchDaemon with bootstrap, trying alternative method..."
    sudo launchctl load -w "${PLIST_FILE}" || {
        log "Warning: Failed to load LaunchDaemon with load -w, trying direct method..."
        sudo launchctl load "${PLIST_FILE}" || {
            log "ERROR: All attempts to load LaunchDaemon failed"
            log "Checking system logs for detailed errors..."
            sudo log show --predicate 'process == "launchd"' --last 10s | grep -i error || true
            log "Checking wrapper script execution..."
            sudo /Applications/MeshAgent/run_meshagent.sh /var/lib/meshagent/meshagent.msh /var/lib/meshagent/db/meshagent.db || {
                log "ERROR: Direct execution failed"
                log "Checking wrapper script contents..."
                sudo cat "${WRAPPER_SCRIPT}" || true
                exit 1
            }
        }
    }
}

# Force start the service if needed
log "Ensuring service is running..."
sudo launchctl kickstart -k system/com.meshagent || true

# Verify the service is running
sleep 3
if ! pgrep -f meshagent > /dev/null 2>&1; then
    log "Warning: MeshAgent process not found after loading LaunchDaemon"
    log "Checking LaunchDaemon status..."
    sudo launchctl list | grep meshagent || true
    log "Checking system logs for errors..."
    sudo log show --predicate 'process == "launchd"' --last 10s | grep -i error || true
    log "Checking wrapper script execution..."
    sudo /Applications/MeshAgent/run_meshagent.sh /var/lib/meshagent/meshagent.msh /var/lib/meshagent/db/meshagent.db || {
        log "ERROR: Direct execution failed"
        log "Checking wrapper script contents..."
        sudo cat "${WRAPPER_SCRIPT}" || true
        exit 1
    }
fi

# Check log file
log "Checking log file..."
if [ -f "${LOG_DIR}/meshagent_debug.log" ]; then
    log "Log file exists at ${LOG_DIR}/meshagent_debug.log"
    log "Log file permissions: $(ls -l "${LOG_DIR}/meshagent_debug.log")"
    log "Log file contents:"
    sudo cat "${LOG_DIR}/meshagent_debug.log" || true
else
    log "WARNING: Log file not found at ${LOG_DIR}/meshagent_debug.log"
    log "Checking log directory contents:"
    ls -la "${LOG_DIR}" || true
fi

# Before starting the agent, request permissions
log "Stage 10: Requesting necessary permissions..."
request_agent_permissions

# Final verification
log "Stage 11: Final verification..."

# Verify file permissions
if [ ! -x "${WRAPPER_SCRIPT}" ]; then
    log "ERROR: Wrapper script not executable"
    exit 1
fi

if [ ! -r "${CFG_FILE}" ]; then
    log "ERROR: Cannot read configuration file"
    exit 1
fi

if [ ! -x "${INSTALL_DIR}/meshagent" ]; then
    log "ERROR: MeshAgent binary not executable"
    exit 1
fi

# Explicitly start the agent and verify it's running
log "Starting MeshAgent explicitly..."
sudo /Applications/MeshAgent/run_meshagent.sh /var/lib/meshagent/meshagent.msh /var/lib/meshagent/db/meshagent.db &
sleep 5  # Give the agent time to start

# Check if the agent is running
if ! pgrep -f meshagent > /dev/null 2>&1; then
    log "ERROR: MeshAgent failed to start"
    log "Checking system logs for errors..."
    sudo log show --predicate 'process == "launchd"' --last 10s | grep -i error || true
    exit 1
fi

# Get the process ID
AGENT_PID=$(pgrep -f meshagent)
log "MeshAgent is running with PID: ${AGENT_PID}"

# Check the log file
log "Checking MeshAgent logs..."
if [ -f "${LOG_DIR}/meshagent_debug.log" ]; then
    log "Log file exists at ${LOG_DIR}/meshagent_debug.log"
    log "Log file permissions: $(ls -l "${LOG_DIR}/meshagent_debug.log")"
    log "Last 50 lines of log file:"
    sudo tail -n 50 "${LOG_DIR}/meshagent_debug.log" || true
else
    log "WARNING: Log file not found at ${LOG_DIR}/meshagent_debug.log"
    log "Checking log directory contents:"
    ls -la "${LOG_DIR}" || true
fi

# Verify the agent is responding
log "Verifying agent connectivity..."
sleep 2
if curl -s "http://localhost:8383/agentinfo" > /dev/null; then
    log "SUCCESS: Agent is responding on port 8383"
else
    log "WARNING: Agent is not responding on port 8383"
fi

log "MeshAgent installation completed successfully"
