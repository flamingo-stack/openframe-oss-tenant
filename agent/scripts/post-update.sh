#!/bin/bash
set -e

# Restore configuration if needed
if [ -f config/agent.toml.bak ]; then
    echo "Restoring configuration..."
    cp config/agent.toml.bak config/agent.toml
    rm config/agent.toml.bak
fi

# Start the agent service
if [ "$(uname)" == "Darwin" ]; then
    sudo launchctl load /Library/LaunchDaemons/com.openframe.agent.plist
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    sudo systemctl start openframe-agent
elif [ "$(expr substr $(uname -s) 1 10)" == "MINGW32_NT" ]; then
    net start OpenFrameAgent
fi

echo "Post-update tasks completed successfully" 