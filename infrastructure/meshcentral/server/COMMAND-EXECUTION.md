# MeshCentral Command Execution Guide

This document provides a comprehensive guide to executing commands on remote devices using MeshCentral, both through the command line interface and the REST API wrapper.

## Command Line Interface

### Basic Command Execution

To execute a command on a remote device using the MeshCentral CLI:

```bash
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url wss://meshcentral.example.com:443 \
  --loginuser username --loginpass password \
  RunCommand --id "@DEVICE_ID" --run "command_to_execute"
```

### PowerShell Command Execution

To execute a PowerShell command:

```bash
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url wss://meshcentral.example.com:443 \
  --loginuser username --loginpass password \
  RunCommand --id "@DEVICE_ID" --run "command_to_execute" --powershell
```

### Command Execution with Output

To execute a command and see its output:

```bash
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url wss://meshcentral.example.com:443 \
  --loginuser username --loginpass password \
  RunCommand --id "@DEVICE_ID" --run "command_to_execute" --reply
```

### Interactive Shell

To open an interactive shell:

```bash
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url wss://meshcentral.example.com:443 \
  --loginuser username --loginpass password \
  shell --id "@DEVICE_ID"
```

For PowerShell:

```bash
node /opt/mesh/node_modules/meshcentral/meshctrl.js --url wss://meshcentral.example.com:443 \
  --loginuser username --loginpass password \
  shell --id "@DEVICE_ID" --powershell
```

## REST API Wrapper

The REST API wrapper provides HTTP endpoints for executing commands on remote devices.

### Execute Command

```bash
curl -X POST https://meshcentral.example.com/api/devices/@DEVICE_ID/command \
  -H "Content-Type: application/json" \
  -d '{"command":"dir","powershell":false}'
```

For PowerShell commands:

```bash
curl -X POST https://meshcentral.example.com/api/devices/@DEVICE_ID/command \
  -H "Content-Type: application/json" \
  -d '{"command":"Get-Process","powershell":true}'
```

### Create Terminal Tunnel

```bash
curl -X POST https://meshcentral.example.com/api/devices/@DEVICE_ID/tunnel \
  -H "Content-Type: application/json" \
  -d '{"type":"terminal"}'
```

Response:
```json
{
  "device_id": "@DEVICE_ID",
  "type": "terminal",
  "protocol": "1",
  "ws_url": "wss://meshcentral.example.com/meshrelay.ashx?id=@DEVICE_ID&auth=BASE64_AUTH&p=1&rtc=0"
}
```

### Get WebSocket URL with Authentication

```bash
curl -X GET "https://meshcentral.example.com/api/websocket?id=@DEVICE_ID&p=1"
```

Response:
```json
{
  "device_id": "@DEVICE_ID",
  "type": "1",
  "ws_url": "wss://meshcentral.example.com/meshrelay.ashx?id=@DEVICE_ID&auth=BASE64_AUTH&p=1&rtc=0"
}
```

## Important Notes

1. **Device ID Format**: Always use the `@` prefix with device IDs:
   - Correct: `@yh4xyf6kS2ZZwHMmS$tLks3s3xPFCwk4zfu2@eBugsFKEOgZWM7yUfgMlFMG@YA`
   - Incorrect: `node//@yh4xyf6kS2ZZwHMmS$tLks3s3xPFCwk4zfu2@eBugsFKEOgZWM7yUfgMlFMG@YA`

2. **Authentication**: The REST API wrapper handles authentication automatically using:
   - Stored token from `${MESH_DIR}/mesh_token`
   - Username/password from environment variables for WebSocket URLs

3. **Protocol Codes**:
   - Terminal: Protocol code 1
   - Desktop: Protocol code 2
   - Files: Protocol code 5

4. **WebSocket Connections**: For interactive sessions (terminal, desktop, files), the client must:
   1. Get the WebSocket URL from the API
   2. Connect to the WebSocket URL
   3. Send the appropriate protocol code as the first message
   4. Handle the binary/text protocol for the specific session type

## Troubleshooting

1. **Invalid NodeID Error**: Ensure you're using the correct device ID format with the `@` prefix.

2. **Authentication Failures**: Verify that:
   - The token file exists and contains a valid token
   - Username and password environment variables are set correctly
   - The token has not expired (the API wrapper handles token refresh automatically)

3. **Connection Issues**: Check that:
   - The device is online and connected to MeshCentral
   - The WebSocket URL is correctly formatted
   - The protocol code matches the desired session type
