#!/bin/bash
set -e

# Create log directory with proper permissions
if [[ "$(uname)" == "Darwin" ]]; then
    # macOS
    sudo mkdir -p "/Library/Logs/OpenFrame"
    sudo chown -R root:admin "/Library/Logs/OpenFrame"
    sudo chmod 775 "/Library/Logs/OpenFrame"
elif [[ "$(uname)" == "Linux" ]]; then
    # Linux
    sudo mkdir -p /var/log/openframe
    sudo chown -R root:root /var/log/openframe
    sudo chmod 755 /var/log/openframe
fi

# Make sure the agent has write permissions to its log file
if [[ "$(uname)" == "Darwin" ]]; then
    sudo touch "/Library/Logs/OpenFrame/agent.log"
    sudo chown ${USER}:admin "/Library/Logs/OpenFrame/agent.log"
    sudo chmod 644 "/Library/Logs/OpenFrame/agent.log"
else
    sudo touch /var/log/openframe/agent.log
    sudo chown ${USER}:${GROUP} /var/log/openframe/agent.log
    sudo chmod 644 /var/log/openframe/agent.log
fi

echo "Log directory setup completed successfully" 