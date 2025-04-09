# MeshCentral REST API

This document describes the REST API for MeshCentral, which wraps MeshCentral's functionality with a REST interface.

## Authentication

Authentication is handled transparently by the API. The MeshCentral login token is automatically injected into all API requests from the token stored in the MeshCentral server container at `${MESH_DIR}/mesh_token`.

No authentication headers or parameters need to be provided by API consumers.

### Token Refresh

Token refresh is handled automatically by the system using the `setup_mesh_token()` function in `meshcentral-functions.sh`. This function:

1. Checks if a valid token exists in `${MESH_DIR}/mesh_token`
2. If the token is missing or invalid, generates a new token using MeshCentral CLI
3. Stores the token in `${MESH_DIR}/mesh_token` for future use

API consumers do not need to handle token refresh or expiration - this is managed entirely by the server.

## API Endpoints

### List Devices

```
GET /api/devices
```

Optional Query Parameters:
- `filter`: Filter devices using MeshCentral filter syntax (e.g., `?filter=group:Office`)

Response:
```json
{
  "devices": [
    {
      "id": "device123",
      "name": "Office PC",
      "connected": true,
      "type": "Linux",
      "user": "user@example.com",
      "ip": "192.168.1.100"
    }
  ]
}
```

### Get Device Information

```
GET /api/devices/{device_id}
```

Response:
```json
{
  "id": "device123",
  "name": "Office PC",
  "description": "Main office computer",
  "icon": 1,
  "protocol": 2,
  "agent_version": "1.0.0",
  "os_name": "Ubuntu 20.04",
  "ip_addresses": "192.168.1.100",
  "last_connect_time": "2023-04-01 12:30:45"
}
```

### Run Command on Device

```
POST /api/devices/{device_id}/command
```

Request Body:
```json
{
  "command": "echo Hello World",
  "powershell": false
}
```

Response:
```json
{
  "device_id": "device123",
  "command": "echo Hello World",
  "result": "Hello World\n"
}
```

### Create Tunnel Connection

```
POST /api/devices/{device_id}/tunnel
```

Request Body:
```json
{
  "type": "terminal"  # Options: "terminal", "desktop", "files"
}
```

Response:
```json
{
  "device_id": "device123",
  "type": "terminal",
  "protocol": "1",
  "ws_url": "wss://meshcentral.example.com:8383/meshrelay.ashx?id=device123&auth=YOUR_TOKEN&p=1&rtc=0"
}
```

**Note:** For interactive connections, you must use the WebSocket URL returned by this endpoint. The REST API only provides the connection information, while the actual interactive session takes place over WebSocket.

## Curl Examples

### List devices:
```bash
curl -X GET http://localhost:80/api/devices
```

### Get device info:
```bash
curl -X GET http://localhost:80/api/devices/device123
```

### Run command on device:
```bash
curl -X POST http://localhost:80/api/devices/device123/command \
  -H "Content-Type: application/json" \
  -d '{"command":"echo Hello World","powershell":false}'
```

### Create tunnel for remote terminal:
```bash
curl -X POST http://localhost:80/api/devices/device123/tunnel \
  -H "Content-Type: application/json" \
  -d '{"type":"terminal"}'
```
