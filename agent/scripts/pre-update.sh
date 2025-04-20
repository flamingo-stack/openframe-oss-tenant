#!/bin/bash
set -e

# Backup configuration
echo "Backing up configuration..."
cp config/agent.toml config/agent.toml.bak

# Stop the agent service
if [ "$(uname)" == "Darwin" ]; then
    sudo launchctl unload /Library/LaunchDaemons/com.openframe.agent.plist
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    sudo systemctl stop openframe-agent
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    net stop OpenFrameAgent
fi

echo "Pre-update tasks completed successfully" 