# MeshCentral REST API

This document describes the REST API for MeshCentral, which wraps MeshCentral's functionality with a REST interface for OpenFrame integration.

## Authentication

Authentication is handled transparently by the API. The MeshCentral login token is automatically injected into all API requests from the token stored in the MeshCentral server container.

No authentication headers or parameters need to be provided by API consumers.

### Token Refresh

Token refresh is handled automatically by the system using the `setup_mesh_token()` function in `meshcentral-functions.sh`. This function:

1. Checks if a valid token exists in `${MESH_DIR}/mesh_token`
2. If the token is missing or invalid, generates a new token using MeshCentral CLI
3. Stores the token in `${MESH_DIR}/mesh_token` for future use

API consumers do not need to handle token refresh or expiration - this is managed entirely by the server.

## API Endpoints

### List Device Groups

```
GET /api/listdevicegroups
```

Response:
```json
[
  {
    "_id": "mesh//IJHkvnLcFn@moQgwb8FTVksPYyHcbIlkVphm@BRe8JbvoHIhdAwojnvKBPtD@Qn0",
    "type": "mesh",
    "name": "OpenFrame",
    "mtype": 2,
    "desc": null,
    "domain": "",
    "links": {
      "user//mesh@openframe.io": {
        "name": "mesh@openframe.io",
        "rights": 4294967295
      }
    },
    "creation": 1744833788846,
    "creatorid": "user//mesh@openframe.io",
    "creatorname": "mesh@openframe.io"
  }
]
```

### List Devices

```
GET /api/listdevices
```

Response:
```json
[
  {
    "_id": "node//Lsj8pwjqKG7ekEZYWTDQ3i30KmbQ2Gum8eJZpjBJ5Qz$4dvqt5FG86i9ZwyIMCCv",
    "type": "node",
    "mtype": 2,
    "icon": 8,
    "name": "DESKTOP-057QV01",
    "rname": "DESKTOP-057QV01",
    "domain": "",
    "agent": {
      "ver": 0,
      "id": 3,
      "caps": 31,
      "core": "Mar 6 2025, 3791275116",
      "root": true
    },
    "host": "192.168.65.1",
    "ip": "192.168.65.1",
    "osdesc": "Microsoft Windows 11 Pro - 24H2/26100",
    "av": [
      {
        "product": "Windows Defender",
        "updated": true,
        "enabled": true
      }
    ],
    "wsc": {
      "antiVirus": "OK",
      "autoUpdate": "OK",
      "firewall": "PROBLEM"
    },
    "users": [
      "DESKTOP-057QV01\\Michael Assraf"
    ],
    "lusers": [],
    "lastbootuptime": 1744853978000,
    "defender": {
      "RealTimeProtection": true,
      "TamperProtected": false
    },
    "conn": 1,
    "pwr": 1,
    "agct": 1744852051059,
    "sessions": {
      "kvm": {
        "user//mesh@openframe.io": 1
      }
    },
    "meshid": "mesh//IJHkvnLcFn@moQgwb8FTVksPYyHcbIlkVphm@BRe8JbvoHIhdAwojnvKBPtD@Qn0",
    "groupname": "OpenFrame"
  }
]
```

### Get Device Information

```
GET /api/deviceinfo?id={device_id}
```

Returns detailed device information including:
- General information (server name, IP, antivirus status)
- Operating system details
- Mesh agent information
- Network configuration
- BIOS and motherboard details
- Memory and storage information

### Run Command on Device

```
POST /api/runcommand
```

Parameters:
- `id`: Device ID
- `command`: Command to execute
- `powershell`: (optional) Set to true to run command in PowerShell

### Create Tunnel Connection

```
POST /api/tunnel
```

Parameters:
- `id`: Device ID
- `type`: Connection type (terminal, desktop, files)

### Error Handling

If an invalid command is provided, the API will return a list of available commands with an error message listing all possible commands.

## Curl Examples

### List device groups:
```bash
curl -X GET https://meshcentral.example.com/api/listdevicegroups
```

### List devices:
```bash
curl -X GET https://meshcentral.example.com/api/listdevices
```

### Get device info:
```bash
curl -X GET "https://meshcentral.example.com/api/deviceinfo?id=node//Lsj8pwjqKG7ekEZYWTDQ3i30KmbQ2Gum8eJZpjBJ5Qz\$4dvqt5FG86i9ZwyIMCCv"
```

### Run command on device:
```bash
curl -X POST https://meshcentral.example.com/api/runcommand \
  -H "Content-Type: application/json" \
  -d '{
    "id": "node//Lsj8pwjqKG7ekEZYWTDQ3i30KmbQ2Gum8eJZpjBJ5Qz$4dvqt5FG86i9ZwyIMCCv",
    "command": "echo Hello World",
    "powershell": false
  }'
```

## Integration with OpenFrame

The MeshCentral API is integrated with OpenFrame through the gateway service, which proxies requests to the MeshCentral REST API. This allows unified access to device management capabilities within the OpenFrame platform.