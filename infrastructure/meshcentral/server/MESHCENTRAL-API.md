# MeshCentral REST API

This document describes the REST API for MeshCentral, which wraps MeshCentral's functionality with a REST interface.

## Authentication

All API endpoints require authentication with a MeshCentral login token, which can be provided in one of the following ways:

- As a header: `X-MeshAuth: YOUR_TOKEN`
- As a query parameter: `?auth=YOUR_TOKEN`

If no token is provided, the API will use the token stored in the MeshCentral server container at `${MESH_DIR}/mesh_token`.

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
curl -X GET http://localhost:80/api/devices \
  -H "X-MeshAuth: YOUR_TOKEN"
```

### Get device info:
```bash
curl -X GET http://localhost:80/api/devices/device123 \
  -H "X-MeshAuth: YOUR_TOKEN"
```

### Run command on device:
```bash
curl -X POST http://localhost:80/api/devices/device123/command \
  -H "Content-Type: application/json" \
  -H "X-MeshAuth: YOUR_TOKEN" \
  -d '{"command":"echo Hello World","powershell":false}'
```

### Create tunnel for remote terminal:
```bash
curl -X POST http://localhost:80/api/devices/device123/tunnel \
  -H "Content-Type: application/json" \
  -H "X-MeshAuth: YOUR_TOKEN" \
  -d '{"type":"terminal"}'
```
