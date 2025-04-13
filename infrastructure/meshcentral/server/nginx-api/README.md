# MeshCentral API Wrapper

This folder contains the API wrapper scripts for MeshCentral. These scripts provide a REST API interface to MeshCentral's functionality, allowing clients to interact with MeshCentral without needing to use WebSockets directly.

## API Endpoints

### Device Management

- `GET /api/devices` - List all devices
- `GET /api/devices/{id}` - Get device information

### Command Execution

- `POST /api/devices/{id}/command` - Execute a command on a device
  - Parameters:
    - `command`: The command to execute
    - `powershell`: (optional) Set to `true` to execute as PowerShell command

### Tunnel Management

- `POST /api/devices/{id}/tunnel` - Create a tunnel to a device
  - Parameters:
    - `type`: The type of tunnel to create (`terminal`, `desktop`, or `files`)

### WebSocket URL Generation

- `GET /api/websocket?id={device_id}&p={protocol}` - Generate a WebSocket URL with authentication
  - Parameters:
    - `id`: Device ID
    - `p`: Protocol (1=terminal, 2=desktop, 5=files)
    - `rtc`: (optional) WebRTC flag (default: 0)

## Authentication

Authentication is handled transparently by the API wrapper. The wrapper reads the MeshCentral authentication token from the server and includes it in all requests to MeshCentral.

For WebSocket connections, the wrapper can either:
1. Generate a WebSocket URL with the token included
2. Generate a WebSocket URL with base64-encoded username:password

## Usage Examples

### List Devices

```bash
curl -X GET https://meshcentral.example.com/api/devices
```

### Execute Command

```bash
curl -X POST https://meshcentral.example.com/api/devices/@DEVICE_ID/command \
  -H "Content-Type: application/json" \
  -d '{"command":"dir","powershell":true}'
```

### Create Terminal Tunnel

```bash
curl -X POST https://meshcentral.example.com/api/devices/@DEVICE_ID/tunnel \
  -H "Content-Type: application/json" \
  -d '{"type":"terminal"}'
```

### Get WebSocket URL with Authentication

```bash
curl -X GET "https://meshcentral.example.com/api/websocket?id=@DEVICE_ID&p=1"
```
