#!/bin/bash
# Linux package building script for OpenFrame
# Creates both DEB and RPM packages
# TODO: Replace placeholder comments with actual implementation

set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

# Parse arguments
FORCE_DEV_MODE=0

for arg in "$@"; do
  case $arg in
    --dev)
      FORCE_DEV_MODE=1
      shift
      ;;
  esac
done

echo -e "${BLUE}Building OpenFrame for Linux...${NC}"

# Setup directory paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
TARGET_DIR="$CLIENT_DIR/target"
PKG_DIR="$TARGET_DIR/pkg_build"
PAYLOAD_ROOT="$PKG_DIR/payload_root"
APP_DIR="$PAYLOAD_ROOT/usr/bin"
LOGS_DIR="$PAYLOAD_ROOT/var/log/openframe"
SUPPORT_DIR="$PAYLOAD_ROOT/var/lib/openframe"
SYSTEMD_DIR="$PAYLOAD_ROOT/etc/systemd/system"
DIST_DIR="$TARGET_DIR/dist"
ASSETS_DIR="$CLIENT_DIR/assets"
PKG_ASSETS_DIR="$ASSETS_DIR/pkg"

echo -e "${BLUE}Cleaning target directory...${NC}"
# Clean the target directory
cargo clean
if [ -d "$TARGET_DIR" ]; then
    # Use sudo to clean up any files with permission issues
    sudo rm -rf "$TARGET_DIR"
fi
mkdir -p "$TARGET_DIR" "$PKG_DIR" "$DIST_DIR"
mkdir -p "$APP_DIR" "$LOGS_DIR" "$SUPPORT_DIR" "$SYSTEMD_DIR"

echo -e "${BLUE}Setting up build environment...${NC}"

# Check if Rust is installed
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Check if cargo is installed
if ! command -v cargo &> /dev/null; then
    echo "Installing Cargo..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source $HOME/.cargo/env
fi

# Check if DEB/RPM packaging tools are installed
if ! command -v dpkg-deb &> /dev/null; then
    echo "Installing DEB packaging tools..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y dpkg-dev
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y dpkg
    fi
fi

if ! command -v rpmbuild &> /dev/null; then
    echo "Installing RPM packaging tools..."
    if [ -f /etc/debian_version ]; then
        sudo apt-get update
        sudo apt-get install -y rpm
    elif [ -f /etc/redhat-release ]; then
        sudo yum install -y rpm-build
    fi
fi

# Verify required files exist
if [ ! -f "$CLIENT_DIR/config/agent.toml" ]; then
    echo -e "${RED}Error: config/agent.toml not found${NC}"
    exit 1
fi

echo -e "${BLUE}Building release version...${NC}"
cargo build --release

echo -e "${BLUE}Creating package structure...${NC}"

# Copy the binary to the app directory
cp "$TARGET_DIR/release/openframe" "$APP_DIR/openframe"
chmod 755 "$APP_DIR/openframe"

# Generate a unique agent ID using UUID
AGENT_UUID=$(uuidgen | tr '[:upper:]' '[:lower:]')
echo -e "${BLUE}Setting default agent ID to $AGENT_UUID...${NC}"

# Create a temporary copy with the updated agent ID
TMP_CONFIG=$(mktemp)
cat "$CLIENT_DIR/config/agent.toml" | sed "s/id = \"\"/id = \"$AGENT_UUID\"/" > "$TMP_CONFIG"

# Also ensure debug logging is enabled for initial deployment
echo "Setting debug logging in agent configuration..."
sed -i 's/log_level = "info"/log_level = "debug"/' "$TMP_CONFIG"

# Ensure log path is explicitly set
if ! grep -q "log_path" "$TMP_CONFIG"; then
    echo "Adding explicit log path to configuration..."
    sed -i '/\[logging\]/a\
log_path = "/var/log/openframe"  # Explicit log path for Linux' "$TMP_CONFIG"
fi

# Copy the modified config
cp "$TMP_CONFIG" "$SUPPORT_DIR/agent.toml"
rm "$TMP_CONFIG"

# Create systemd service file
cat > "$SYSTEMD_DIR/openframe.service" << EOF
[Unit]
Description=OpenFrame Client
After=network.target

[Service]
Type=simple
ExecStart=/usr/bin/openframe
Restart=always
RestartSec=10
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

# Create preinstall script for DEB/RPM
mkdir -p "$PKG_DIR/scripts"
cat > "$PKG_DIR/scripts/preinstall.sh" << 'EOF'
#!/bin/bash
# Create required directories if they don't exist
mkdir -p /var/log/openframe
mkdir -p /var/lib/openframe

# Set proper permissions
chmod 755 /var/log/openframe
chmod 755 /var/lib/openframe
EOF
chmod 755 "$PKG_DIR/scripts/preinstall.sh"

# Create postinstall script for DEB/RPM
cat > "$PKG_DIR/scripts/postinstall.sh" << 'EOF'
#!/bin/bash
# Reload systemd
systemctl daemon-reload

# Enable and start the service
systemctl enable openframe.service
systemctl start openframe.service

echo "OpenFrame has been installed and started."
EOF
chmod 755 "$PKG_DIR/scripts/postinstall.sh"

# Create uninstall script
cat > "$PKG_DIR/scripts/uninstall.sh" << 'EOF'
#!/bin/bash
# Stop and disable the service
systemctl stop openframe.service
systemctl disable openframe.service

# Remove service file
rm -f /etc/systemd/system/openframe.service

# Remove application files
rm -f /usr/bin/openframe

# Remove data directories (optional, comment if you want to preserve data)
rm -rf /var/log/openframe
rm -rf /var/lib/openframe

echo "OpenFrame has been uninstalled."
EOF
chmod 755 "$PKG_DIR/scripts/uninstall.sh"

# Build DEB Package
echo -e "${BLUE}Building DEB package...${NC}"

# Create DEB control file
mkdir -p "$PKG_DIR/DEBIAN"
cat > "$PKG_DIR/DEBIAN/control" << EOF
Package: openframe
Version: 0.1.0
Section: utils
Priority: optional
Architecture: amd64
Maintainer: Flamingo Team <support@openframe.org>
Description: OpenFrame system management and monitoring
 OpenFrame provides system management, monitoring, and remote
 control capabilities for enterprise environments.
EOF

# Copy pre/post scripts
cp "$PKG_DIR/scripts/preinstall.sh" "$PKG_DIR/DEBIAN/preinst"
cp "$PKG_DIR/scripts/postinstall.sh" "$PKG_DIR/DEBIAN/postinst"

# Build the DEB package
DEB_PATH="$DIST_DIR/openframe_0.1.0_amd64.deb"
dpkg-deb --build "$PKG_DIR" "$DEB_PATH"

# Build RPM Package
echo -e "${BLUE}Building RPM package...${NC}"

# Create RPM spec file
cat > "$PKG_DIR/openframe.spec" << EOF
Name: openframe
Version: 0.1.0
Release: 1%{?dist}
Summary: OpenFrame system management and monitoring
License: MIT
Requires: systemd

%description
OpenFrame provides system management, monitoring, and remote
control capabilities for enterprise environments.

%prep
# No prep needed, this is built from local files

%install
cp -r $PAYLOAD_ROOT/* %{buildroot}/

%pre
$PKG_DIR/scripts/preinstall.sh

%post
$PKG_DIR/scripts/postinstall.sh

%preun
# Stop service on uninstall
if [ \$1 -eq 0 ]; then
    systemctl stop openframe.service
    systemctl disable openframe.service
fi

%files
/usr/bin/openframe
/var/lib/openframe/agent.toml
/etc/systemd/system/openframe.service
%dir /var/log/openframe
%dir /var/lib/openframe

%changelog
* $(date +"%a %b %d %Y") Flamingo Team <support@openframe.org> - 0.1.0-1
- Initial release of OpenFrame
EOF

# TODO: Build the actual RPM
# This is a placeholder - actual implementation needed
echo -e "${YELLOW}TODO: Build RPM package using rpmbuild or similar${NC}"
RPM_PATH="$DIST_DIR/openframe-0.1.0-1.x86_64.rpm"
# rpmbuild -bb --define "_topdir $PKG_DIR" --buildroot "$PAYLOAD_ROOT" "$PKG_DIR/openframe.spec"

echo -e "${GREEN}Build and packaging complete!${NC}"
echo -e "${GREEN}DEB package: $DEB_PATH${NC}"
echo -e "${GREEN}RPM package: $RPM_PATH (TODO)${NC}" 