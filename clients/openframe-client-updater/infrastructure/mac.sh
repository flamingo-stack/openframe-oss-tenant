#!/usr/bin/env bash
# Installs or uninstalls the OpenFrame Client Updater service on macOS.
#
# Usage:
#   sudo ./mac.sh --server-url openframe.example.com
#   sudo ./mac.sh --uninstall

set -euo pipefail

BINARY_NAME="openframe-client-updater"
INSTALL_PATH="/usr/local/bin/$BINARY_NAME"
DATA_DIR="/Library/Application Support/OpenFrame"
AGENT_CONFIG_PATH="$DATA_DIR/secured/agent_config.json"
SERVICE_NAME="com.openframe.client-updater"
PLIST_PATH="/Library/LaunchDaemons/$SERVICE_NAME.plist"

SERVER_URL=""
UNINSTALL=0

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*"; }
die() { echo "ERROR: $*" >&2; exit 1; }

# ── Argument parsing ──────────────────────────────────────────────────────────
while [[ $# -gt 0 ]]; do
    case "$1" in
        --server-url) SERVER_URL="$2"; shift 2 ;;
        --uninstall)  UNINSTALL=1; shift ;;
        *) die "Unknown argument: $1" ;;
    esac
done

[[ "$(id -u)" -eq 0 ]] || die "This script must be run as root (sudo)."

# ── Uninstall ─────────────────────────────────────────────────────────────────
if [[ $UNINSTALL -eq 1 ]]; then
    log "Uninstalling OpenFrame Client Updater..."

    if launchctl list | grep -q "$SERVICE_NAME" 2>/dev/null; then
        launchctl unload "$PLIST_PATH" 2>/dev/null || true
        log "Service unloaded."
    fi

    [[ -f "$PLIST_PATH" ]]    && rm -f "$PLIST_PATH"    && log "Plist removed."
    [[ -f "$INSTALL_PATH" ]]  && rm -f "$INSTALL_PATH"  && log "Binary removed."

    log "Uninstall complete."
    exit 0
fi

# ── Install ───────────────────────────────────────────────────────────────────
[[ -n "$SERVER_URL" ]] || die "--server-url is required for installation."

# Verify main client has registered
[[ -f "$AGENT_CONFIG_PATH" ]] || \
    die "agent_config.json not found at $AGENT_CONFIG_PATH. Install and start openframe-client first."

MACHINE_ID=$(python3 -c "import json,sys; d=json.load(open('$AGENT_CONFIG_PATH')); print(d.get('machine_id',''))" 2>/dev/null || true)
[[ -n "$MACHINE_ID" ]] || \
    die "machine_id is empty in agent_config.json. Ensure openframe-client has completed registration."

log "Main client registered (machine_id: $MACHINE_ID). Proceeding."

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    arm64)  ARCH_SUFFIX="aarch64" ;;
    x86_64) ARCH_SUFFIX="x86_64" ;;
    *)      die "Unsupported architecture: $ARCH" ;;
esac

DOWNLOAD_URL="https://$SERVER_URL/openframe_public/${BINARY_NAME}-macos-${ARCH_SUFFIX}"
TEMP_PATH="/tmp/$BINARY_NAME"

log "Downloading from $DOWNLOAD_URL ..."
curl -fsSL --retry 3 --retry-delay 2 -o "$TEMP_PATH" "$DOWNLOAD_URL" || \
    die "Download failed."

FILE_SIZE=$(stat -f%z "$TEMP_PATH" 2>/dev/null || stat -c%s "$TEMP_PATH")
[[ $FILE_SIZE -ge 102400 ]] || die "Downloaded file is too small — download may have failed."

# Place binary
install -m 755 "$TEMP_PATH" "$INSTALL_PATH"
rm -f "$TEMP_PATH"

# Strip quarantine flag (Gatekeeper)
xattr -d com.apple.quarantine "$INSTALL_PATH" 2>/dev/null || true

log "Binary installed to $INSTALL_PATH"

# Register service via the binary's own install command
log "Registering service..."
"$INSTALL_PATH" install || die "Service registration failed."

log "OpenFrame Client Updater installed successfully."
