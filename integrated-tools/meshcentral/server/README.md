# MeshCentral REST API

This document describes the REST API for MeshCentral, which wraps MeshCentral's functionality with a REST interface.

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

Response:
```json
{
  "General": {
    "Server Name": "DESKTOP-057QV01",
    "Computer Name": "DESKTOP-057QV01",
    "Hostname": "192.168.65.1",
    "IP Address": "192.168.65.1",
    "Icon": 8,
    "AntiVirus": [
      "Windows Defender, updated, enabled"
    ],
    "WindowsSecurityCenter": {
      "antiVirus": "OK",
      "autoUpdate": "OK",
      "firewall": "PROBLEM"
    }
  },
  "Operating System": {
    "Name": "DESKTOP-057QV01",
    "Version": "Microsoft Windows 11 Pro - 24H2/26100",
    "Architecture": "ARM 64-bit Processor"
  },
  "Mesh Agent": {
    "Mesh Agent": "Windows 32bit service",
    "Last agent connection": "4/17/2025, 1:07:31 AM",
    "Last agent address": "192.168.65.1"
  },
  "Networking": {
    "Ethernet, localdomain": {
      "MAC Layer": "MAC: 00:0C:29:D9:C4:3A",
      "IPv4 Layer": "IP: 172.16.181.129, Mask: 255.255.255.0, Gateway: 172.16.181.2",
      "IPv6 Layer": "IP: fe80::2b86:9a77:f07d:fd02%11"
    }
  },
  "BIOS": {
    "Vendor": "VMware, Inc.",
    "Version": "VMW201.00V.24006586.BA64.2406042154"
  },
  "Motherboard": {
    "Vendor": "VMware, Inc.",
    "Name": "VBSA",
    "Serial": "56AF58A39EA34D56",
    "Version": "1",
    "Identifier": "9EA34D56-58A3-56AF-1A56-A14A5CD9C43A",
    "CPU": "Apple silicon",
    "GPU1": "VMware SVGA 3D"
  },
  "Memory": {
    "RAM slot #0": {
      "Capacity/Speed": "8192 Mb, undefined Mhz",
      "Part Number": "VMware Virtual RAM, VMW-8192MB"
    },
    "RAM slot #1": {
      "Capacity/Speed": "2048 Mb, undefined Mhz",
      "Part Number": "VMware Virtual RAM, VMW-2048MB"
    }
  },
  "Storage": {
    "VMware Virtual NVMe Disk": {
      "Capacity": "65530Mb"
    }
  }
}
```

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

If an invalid command is provided, the API will return a list of available commands:

```
GET /api/invalid_command
```

Response:
```json
{
  "error": "Invalid command. Possible commands are: edituser, listusers, listusersessions, listdevicegroups, listdevices, listusersofdevicegroup, listevents, logintokens, serverinfo, userinfo, adduser, removeuser, adddevicegroup, removedevicegroup, editdevicegroup, broadcast, showevents, addusertodevicegroup, removeuserfromdevicegroup, addusertodevice, removeuserfromdevice, sendinviteemail, generateinvitelink, config, movetodevicegroup, deviceinfo, removedevice, editdevice, addlocaldevice, addamtdevice, addusergroup, listusergroups, removeusergroup, runcommand, shell, upload, download, deviceopenurl, devicemessage, devicetoast, addtousergroup, removefromusergroup, removeallusersfromusergroup, devicesharing, devicepower, indexagenterrorlog, agentdownload, report, grouptoast, groupmessage, webrelay."
}
```

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
