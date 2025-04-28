#!/bin/bash
# OpenFrame Uninstall Script

echo "Uninstalling OpenFrame..."

# Unload and remove LaunchDaemon
if [ -f "/Library/LaunchDaemons/com.openframe.agent.plist" ]; then
    echo "Unloading LaunchDaemon..."
    launchctl unload "/Library/LaunchDaemons/com.openframe.agent.plist" 2>/dev/null || echo "WARNING: Failed to unload launch daemon"
    echo "Removing LaunchDaemon plist..."
    rm -f "/Library/LaunchDaemons/com.openframe.agent.plist" || echo "WARNING: Failed to remove LaunchDaemon plist"
fi

# Remove application bundle
if [ -d "/Applications/OpenFrame.app" ]; then
    echo "Removing OpenFrame application..."
    rm -rf "/Applications/OpenFrame.app" || echo "WARNING: Failed to remove application bundle"
fi

# Remove support and log directories
echo "Removing support directories..."
rm -rf "/Library/Application Support/OpenFrame" || echo "WARNING: Failed to remove support directory"
rm -rf "/Library/Logs/OpenFrame" || echo "WARNING: Failed to remove logs directory"

# Kill any running processes
echo "Stopping any running OpenFrame processes..."
pkill -f openframe 2>/dev/null || echo "No OpenFrame processes found or failed to kill"

echo "OpenFrame uninstallation completed."
exit 0 