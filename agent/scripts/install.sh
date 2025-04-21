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

echo -e "${BLUE}Installing OpenFrame...${NC}"

# Determine OS and set paths
if [ "$(uname)" == "Darwin" ]; then
    INSTALL_DIR="/Applications/openframe"
    SERVICE_DIR="/Library/LaunchDaemons"
    SERVICE_FILE="com.openframe.plist"
elif [ "$(expr substr $(uname -s) 1 5)" == "Linux" ]; then
    INSTALL_DIR="/opt/openframe"
    SERVICE_DIR="/etc/systemd/system"
    SERVICE_FILE="openframe.service"
else
    echo -e "${RED}Unsupported operating system${NC}"
    exit 1
fi

# Create installation directory
echo -e "${BLUE}Creating installation directory...${NC}"
mkdir -p "$INSTALL_DIR"

# Copy files
echo -e "${BLUE}Copying files...${NC}"
cp openframe "$INSTALL_DIR/"
cp agent.toml "$INSTALL_DIR/"
cp manifest.json "$INSTALL_DIR/"

# Set permissions
echo -e "${BLUE}Setting permissions...${NC}"
chmod 755 "$INSTALL_DIR/openframe"
chmod 644 "$INSTALL_DIR/agent.toml"
chmod 644 "$INSTALL_DIR/manifest.json"

# Create log directory
mkdir -p /var/log/openframe

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
    <string>com.openframe</string>
    <key>ProgramArguments</key>
    <array>
        <string>$INSTALL_DIR/openframe</string>
        <string>service</string>
    </array>
    <key>WorkingDirectory</key>
    <string>$INSTALL_DIR</string>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>StandardOutPath</key>
    <string>/var/log/openframe/stdout.log</string>
    <key>StandardErrorPath</key>
    <string>/var/log/openframe/stderr.log</string>
</dict>
</plist>
EOF
    chmod 644 "$SERVICE_DIR/$SERVICE_FILE"
    launchctl load "$SERVICE_DIR/$SERVICE_FILE"
else
    # Create systemd service
    cat > "$SERVICE_DIR/$SERVICE_FILE" << EOF
[Unit]
Description=OpenFrame Service
After=network.target

[Service]
Type=simple
ExecStart=$INSTALL_DIR/openframe service
WorkingDirectory=$INSTALL_DIR
Restart=always
User=root
StandardOutput=append:/var/log/openframe/stdout.log
StandardError=append:/var/log/openframe/stderr.log

[Install]
WantedBy=multi-user.target
EOF
    chmod 644 "$SERVICE_DIR/$SERVICE_FILE"
    systemctl daemon-reload
    systemctl enable openframe
    systemctl start openframe
fi

echo -e "${GREEN}Installation completed successfully!${NC}"

# Show status
echo -e "\n${BLUE}Service status:${NC}"
if [ "$(uname)" == "Darwin" ]; then
    launchctl list | grep com.openframe || echo "Service not running"
else
    systemctl status openframe || echo "Service not running"
fi 