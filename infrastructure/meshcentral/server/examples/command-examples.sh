

MESH_URL="wss://meshcentral.192.168.100.100.nip.io:443"
MESH_USER="mesh@openframe.io"
MESH_PASS="meshpass@1234"
DEVICE_ID="@1Y7nAfvDVKSppWGlfQxfsWmDsI28Kwv9KX2GSWMJWLLBhnAoJmbBWvly5F0SQ7Ds"

echo "=== MeshCentral Command Execution Examples ==="
echo "URL: $MESH_URL"
echo "User: $MESH_USER"
echo "Device: $DEVICE_ID"
echo ""

echo "=== Example 1: Basic Command Execution ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS RunCommand --id \"$DEVICE_ID\" --run \"dir\""
echo ""

echo "=== Example 2: PowerShell Command Execution ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS RunCommand --id \"$DEVICE_ID\" --run \"Get-Process\" --powershell"
echo ""

echo "=== Example 3: Command Execution with Output ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS RunCommand --id \"$DEVICE_ID\" --run \"echo Hello from MeshCentral\" --reply"
echo ""

echo "=== Example 4: Interactive Shell ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS shell --id \"$DEVICE_ID\""
echo ""

echo "=== Example 5: Interactive PowerShell ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS shell --id \"$DEVICE_ID\" --powershell"
echo ""

echo "=== Example 6: File Upload ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS Upload --id \"$DEVICE_ID\" --file \"local_file.txt\" --target \"C:\\remote_path\\file.txt\""
echo ""

echo "=== Example 7: File Download ==="
echo "Command: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS Download --id \"$DEVICE_ID\" --file \"C:\\remote_path\\file.txt\" --target \"local_file.txt\""
echo ""

echo "=== Example 8: WebSocket URL Generation ==="
AUTH_STRING=$(echo -n "$MESH_USER:$MESH_PASS" | base64)
WS_URL="$MESH_URL/meshrelay.ashx?id=$DEVICE_ID&auth=$AUTH_STRING&p=1&rtc=0"
echo "WebSocket URL: $WS_URL"
echo ""

echo "=== Notes ==="
echo "1. Always use the @ prefix with device IDs"
echo "2. For PowerShell commands, add the --powershell flag"
echo "3. To see command output, add the --reply flag"
echo "4. For interactive sessions, use the 'shell' command instead of 'RunCommand'"
echo ""

echo "=== Troubleshooting ==="
echo "If you get 'Invalid NodeID' errors, try these device ID formats:"
echo "1. @1Y7nAfvDVKSppWGlfQxfsWmDsI28Kwv9KX2GSWMJWLLBhnAoJmbBWvly5F0SQ7Ds"
echo "2. node//@1Y7nAfvDVKSppWGlfQxfsWmDsI28Kwv9KX2GSWMJWLLBhnAoJmbBWvly5F0SQ7Ds"
echo ""

echo "=== Execute a Command Now ==="
echo "Executing: node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS RunCommand --id \"$DEVICE_ID\" --run \"echo Test command execution\" --reply"
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url $MESH_URL --loginuser $MESH_USER --loginpass $MESH_PASS RunCommand --id "$DEVICE_ID" --run "echo Test command execution" --reply
