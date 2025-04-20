#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

# Check if running as root/sudo
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}Please run as root or with sudo${NC}"
    exit 1
fi

echo -e "${BLUE}Installing OpenFrame Agent...${NC}"

# Determine OS and set paths
if [ "$(uname)" == "Darwin" ]; then
    INSTALL_DIR="/Applications/OpenFrame/Agent"
    SERVICE_DIR="/Library/LaunchDaemons"
    SERVICE_FILE="com.openframe.agent.plist"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    INSTALL_DIR="/opt/openframe/agent"
    SERVICE_DIR="/etc/systemd/system"
    SERVICE_FILE="openframe-agent.service"
else
    echo -e "${RED}Unsupported operating system${NC}"
    exit 1
fi

# Create installation directory
echo -e "${BLUE}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"

# Copy files
echo -e "${BLUE}Copying files...${NC}"
cp -r bin/* "$INSTALL_DIR/"
cp -r config/* "$INSTALL_DIR/"
cp version "$INSTALL_DIR/"

# Set permissions
echo -e "${BLUE}Setting permissions...${NC}"
chmod 755 "$INSTALL_DIR/openframe-agent"
chmod 644 "$INSTALL_DIR/config/agent.toml"

# Install service
echo -e "${BLUE}Installing system service...${NC}"
if [ "$(uname)" == "Darwin" ]; then
    # Create launchd service
    cat > "$SERVICE_DIR/$SERVICE_FILE" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>Label</key>
    <string>com.openframe.agent</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/openframe-agent</string>
    </array>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/openframe-agent.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/openframe-agent.error.log</string>
</dict>
</plist>
EOF
    launchctl load "$SERVICE_DIR/$SERVICE_FILE"
else
    # Create systemd service
    cat > "$SERVICE_DIR/$SERVICE_FILE" << EOF
[Unit]
Description=OpenFrame Agent Service
After=network.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/openframe-agent
Restart=always
User=root

[Install]
WantedBy=multi-user.target
EOF
    systemctl daemon-reload
    systemctl enable openframe-agent
    systemctl start openframe-agent
fi

echo -e "${GREEN}Installation completed successfully!${NC}"

# Show status
echo -e "\n${BLUE}Service status:${NC}"
if [ "$(uname)" == "Darwin" ]; then
    launchctl list | grep com.openframe.agent
else
    systemctl status openframe-agent
fi 