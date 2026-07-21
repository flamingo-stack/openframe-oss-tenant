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
        <string>{TARGET_VERSION}</string>
        <string>{BOOT_MARKER_PATH}</string>
        <string>{LKG_PATH}</string>
        <string>{BOOT_MARKER_WAIT_SECS}</string>
        <string>{ROLLBACK_ONLY}</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>StandardOutPath</key>
    <string>{TRANSCRIPT_PATH}</string>
    <key>StandardErrorPath</key>
    <string>{TRANSCRIPT_PATH}</string>
</dict>
</plist>"#;

pub const UPDATE_SCRIPT_MACOS: &str = r#"#!/bin/bash

BINARY_PATH="$1"
SERVICE_LABEL="$2"
TARGET_EXE="$3"
UPDATE_STATE_PATH="$4"
TARGET_VERSION="$5"
BOOT_MARKER_PATH="$6"
LKG_PATH="$7"
BOOT_MARKER_WAIT_SECS="${8:-90}"
ROLLBACK_ONLY="${9:-0}"

PLIST_PATH="/Library/LaunchDaemons/${SERVICE_LABEL}.plist"
PREV_PATH="${TARGET_EXE}.prev"

log() {
    echo "$(date -u +%Y-%m-%dT%H:%M:%SZ) $*"
}

set_update_phase() {
    PHASE="$1"
    if [ -n "$UPDATE_STATE_PATH" ] && [ -f "$UPDATE_STATE_PATH" ]; then
        STATE_TMP="${UPDATE_STATE_PATH}.tmp"
        if sed 's/"phase"[[:space:]]*:[[:space:]]*"[^"]*"/"phase": "'"$PHASE"'"/' "$UPDATE_STATE_PATH" > "$STATE_TMP" 2>/dev/null \
            && [ -f "$UPDATE_STATE_PATH" ] \
            && mv "$STATE_TMP" "$UPDATE_STATE_PATH" 2>/dev/null; then
            log "Update state phase set to '$PHASE'"
        else
            rm -f "$STATE_TMP" 2>/dev/null
            log "Failed to stamp update phase '$PHASE'"
        fi
    fi
}

agent_uninstalled() {
    [ "$ROLLBACK_ONLY" != "1" ] && [ -n "$UPDATE_STATE_PATH" ] && [ ! -f "$UPDATE_STATE_PATH" ]
}

restore_reserve() {
    if [ -n "$LKG_PATH" ] && [ -f "$LKG_PATH" ]; then
        RESTORE_SOURCE="$LKG_PATH"
        log "Restoring from last-known-good reserve: $LKG_PATH"
    elif [ -f "$PREV_PATH" ]; then
        RESTORE_SOURCE="$PREV_PATH"
        log "Restoring from pre-swap copy: $PREV_PATH"
    else
        log "No reserve available for rollback (checked '$LKG_PATH' and '$PREV_PATH')"
        return 1
    fi
    rm -f "$TARGET_EXE" 2>/dev/null
    cp "$RESTORE_SOURCE" "$TARGET_EXE" || return 1
    chmod 755 "$TARGET_EXE" 2>/dev/null
    return 0
}

cleanup() {
    if [ -n "$BINARY_PATH" ] && [ -f "$BINARY_PATH" ]; then
        rm -f "$BINARY_PATH" 2>/dev/null
    fi
    # launchctl remove may terminate this script - keep it last
    UPDATER_PLIST="/tmp/com.openframe.updater.plist"
    if [ -f "$UPDATER_PLIST" ]; then
        rm -f "$UPDATER_PLIST" 2>/dev/null
        launchctl remove "com.openframe.updater" 2>/dev/null
    fi
}

service_loaded() {
    launchctl list "$SERVICE_LABEL" >/dev/null 2>&1
}

stop_service() {
    if service_loaded; then
        launchctl unload "$PLIST_PATH" 2>/dev/null
    fi
    STOP_ELAPSED=0
    while service_loaded && [ $STOP_ELAPSED -lt 30 ]; do
        sleep 1
        STOP_ELAPSED=$((STOP_ELAPSED + 1))
    done
    if service_loaded; then
        return 1
    fi
    sleep 2
    return 0
}

fail_rollback() {
    log "Updater failed: $1"

    if agent_uninstalled; then
        log "Update state file is gone (agent uninstalled mid-update) - standing down without touching the service"
        cleanup
        exit 1
    fi

    stop_service

    RESTORED=0
    for RESTORE_ATTEMPT in 1 2 3; do
        if restore_reserve; then
            RESTORED=1
            break
        fi
        log "Restore attempt $RESTORE_ATTEMPT failed"
        sleep 2
    done

    if [ $RESTORED -eq 1 ]; then
        if launchctl load "$PLIST_PATH" 2>/dev/null; then
            RB_ELAPSED=0
            while ! service_loaded && [ $RB_ELAPSED -lt 30 ]; do
                sleep 1
                RB_ELAPSED=$((RB_ELAPSED + 1))
            done
            if service_loaded; then
                set_update_phase "rolled_back"
                log "Rollback complete, service restarted"
            else
                log "Service did not come up after rollback"
            fi
        else
            log "Failed to load service after rollback"
        fi
    else
        log "All restore attempts failed"
        launchctl load "$PLIST_PATH" 2>/dev/null
    fi

    cleanup
    exit 1
}

fail_preswap() {
    log "Updater failed before the binary swap: $1"

    if agent_uninstalled; then
        log "Update state file is gone (agent uninstalled mid-update) - standing down without touching the service"
        cleanup
        exit 1
    fi

    if ! service_loaded; then
        launchctl load "$PLIST_PATH" 2>/dev/null && log "Service restarted with the untouched binary"
    fi
    cleanup
    exit 1
}

log "Updater starting: target version '$TARGET_VERSION', target exe '$TARGET_EXE'"

if [ "$ROLLBACK_ONLY" = "1" ]; then
    if [ ! -f "$PLIST_PATH" ]; then
        log "Service plist not found: $PLIST_PATH - nothing to roll back"
        cleanup
        exit 1
    fi
    fail_rollback "Rollback-only mode requested"
fi

# Validate inputs
if [ ! -f "$BINARY_PATH" ]; then
    fail_preswap "New binary not found: $BINARY_PATH"
fi
if [ ! -f "$TARGET_EXE" ]; then
    fail_preswap "Target executable not found: $TARGET_EXE"
fi

BINARY_SIZE=$(stat -f%z "$BINARY_PATH" 2>/dev/null || stat -c%s "$BINARY_PATH" 2>/dev/null)
if [ "$BINARY_SIZE" -lt 102400 ]; then
    fail_preswap "New binary too small ($BINARY_SIZE bytes), likely corrupted"
fi

if [ ! -f "$PLIST_PATH" ]; then
    fail_preswap "Service plist not found: $PLIST_PATH"
fi

# Stop the service
if ! stop_service; then
    fail_preswap "Service did not stop within 30 seconds"
fi

if ! mv "$TARGET_EXE" "$PREV_PATH"; then
    fail_preswap "Failed to move current binary to $PREV_PATH"
fi

# Replace binary
if ! cp "$BINARY_PATH" "$TARGET_EXE"; then
    fail_rollback "Failed to copy new binary into place"
fi
if ! chmod 755 "$TARGET_EXE"; then
    fail_rollback "Failed to set executable permissions"
fi

if [ -n "$BOOT_MARKER_PATH" ]; then
    rm -f "$BOOT_MARKER_PATH" 2>/dev/null
fi

# Start service
if ! launchctl load "$PLIST_PATH"; then
    fail_rollback "Failed to load service"
fi

sleep 3
if ! service_loaded; then
    fail_rollback "Service failed to start"
fi

MARKER_OK=0
if [ -n "$BOOT_MARKER_PATH" ] && [ -n "$TARGET_VERSION" ]; then
    ELAPSED=0
    while [ $ELAPSED -lt "$BOOT_MARKER_WAIT_SECS" ]; do
        if [ -f "$BOOT_MARKER_PATH" ]; then
            MARKER_VERSION=$(cat "$BOOT_MARKER_PATH" 2>/dev/null | tr -d '[:space:]')
            if [ "$MARKER_VERSION" = "$TARGET_VERSION" ]; then
                MARKER_OK=1
                break
            fi
            if [ -n "$MARKER_VERSION" ]; then
                log "Boot marker reports '$MARKER_VERSION', expected '$TARGET_VERSION' - wrong binary booted"
                break
            fi
        fi
        sleep 2
        ELAPSED=$((ELAPSED + 2))
    done
else
    log "No boot marker path/target version provided, skipping boot check"
    MARKER_OK=1
fi

if [ $MARKER_OK -ne 1 ]; then
    fail_rollback "New binary did not report target version '$TARGET_VERSION' within $BOOT_MARKER_WAIT_SECS seconds"
fi

log "Boot marker matched target version '$TARGET_VERSION'"

set_update_phase "verifying"

# Cleanup (removes temp binary and updater plist)
cleanup
exit 0
"#;
