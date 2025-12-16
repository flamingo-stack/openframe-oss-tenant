//! macOS bash update script for self-update functionality

pub const UPDATER_PLIST_TEMPLATE: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openframe.updater</string>
    <key>ProgramArguments</key>
    <array>
        <string>{SCRIPT_PATH}</string>
        <string>{BINARY_PATH}</string>
        <string>{SERVICE_LABEL}</string>
        <string>{TARGET_EXE}</string>
        <string>{UPDATE_STATE_PATH}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/tmp/openframe-update-debug.log</string>
    <key>StandardErrorPath</key>
    <string>/tmp/openframe-update-debug.log</string>
</dict>
</plist>"#;

pub const UPDATE_SCRIPT_MACOS: &str = r#"#!/bin/bash

BINARY_PATH="$1"
SERVICE_LABEL="$2"
TARGET_EXE="$3"
UPDATE_STATE_PATH="$4"

BACKUP_PATH=""

cleanup() {
    if [ -f "$BINARY_PATH" ]; then
        rm -f "$BINARY_PATH" 2>/dev/null
    fi
    # Also cleanup the updater plist
    UPDATER_PLIST="/tmp/com.openframe.updater.plist"
    if [ -f "$UPDATER_PLIST" ]; then
        launchctl remove "com.openframe.updater" 2>/dev/null
        rm -f "$UPDATER_PLIST" 2>/dev/null
    fi
}

rollback() {
    if [ -n "$BACKUP_PATH" ] && [ -f "$BACKUP_PATH" ]; then
        cp "$BACKUP_PATH" "$TARGET_EXE" 2>/dev/null
        chmod 755 "$TARGET_EXE" 2>/dev/null
        launchctl load "/Library/LaunchDaemons/${SERVICE_LABEL}.plist" 2>/dev/null
    fi
}

# Validate inputs
if [ ! -f "$BINARY_PATH" ]; then
    exit 1
fi

if [ ! -f "$TARGET_EXE" ]; then
    exit 1
fi

BINARY_SIZE=$(stat -f%z "$BINARY_PATH" 2>/dev/null || stat -c%s "$BINARY_PATH" 2>/dev/null)
if [ "$BINARY_SIZE" -lt 102400 ]; then
    exit 1
fi

PLIST_PATH="/Library/LaunchDaemons/${SERVICE_LABEL}.plist"
if [ ! -f "$PLIST_PATH" ]; then
    exit 1
fi

# Stop the service
if launchctl list "$SERVICE_LABEL" >/dev/null 2>&1; then
    launchctl unload "$PLIST_PATH" 2>/dev/null
fi

# Wait for service to fully stop
TIMEOUT=30
ELAPSED=0
while launchctl list "$SERVICE_LABEL" >/dev/null 2>&1 && [ $ELAPSED -lt $TIMEOUT ]; do
    sleep 1
    ELAPSED=$((ELAPSED + 1))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    launchctl load "$PLIST_PATH" 2>/dev/null
    exit 1
fi

sleep 2

# Create backup
BACKUP_PATH="${TARGET_EXE}.backup.$(date +%Y%m%d%H%M%S)"
if ! cp "$TARGET_EXE" "$BACKUP_PATH"; then
    launchctl load "$PLIST_PATH" 2>/dev/null
    exit 1
fi

# Replace binary
if ! cp "$BINARY_PATH" "$TARGET_EXE"; then
    rollback
    cleanup
    exit 1
fi

# Set executable permissions
if ! chmod 755 "$TARGET_EXE"; then
    rollback
    cleanup
    exit 1
fi

# Mark update as completed
if [ -n "$UPDATE_STATE_PATH" ] && [ -f "$UPDATE_STATE_PATH" ]; then
    sed -i '' 's/"phase"[[:space:]]*:[[:space:]]*"[^"]*"/"phase": "completed"/' "$UPDATE_STATE_PATH" 2>/dev/null
fi

# Start service
if ! launchctl load "$PLIST_PATH"; then
    rollback
    cleanup
    exit 1
fi

# Verify service started
sleep 3
if ! launchctl list "$SERVICE_LABEL" >/dev/null 2>&1; then
    rollback
    cleanup
    exit 1
fi


# Cleanup (removes temp binary and updater plist)
cleanup
exit 0
"#;
