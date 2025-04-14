# MeshCentral WebSocket Connection Guide

This document provides a comprehensive guide to establishing WebSocket connections with MeshCentral for remote device access.

## Understanding WebSocket URLs

MeshCentral uses WebSocket connections for remote device access through the `/meshrelay.ashx` endpoint. The URL structure is:

```
wss://meshcentral.example.com/meshrelay.ashx?id=DEVICE_ID&auth=AUTH_TOKEN&p=PROTOCOL&rtc=RTC_FLAG
```

Parameters:
- `id`: Device ID (required)
- `auth`: Authentication token or Base64-encoded username:password (required)
- `p`: Protocol code (1=Terminal, 2=Desktop, 5=Files)
- `rtc`: WebRTC flag (0=No, 1=Yes)
- `browser`: Browser flag (1=Yes)
- `nodeid`: Alternative device ID format (used by the web UI)

## Authentication Methods

MeshCentral supports multiple authentication methods for WebSocket connections:

### 1. Session Cookies

When connecting from a browser that's already logged in, MeshCentral uses session cookies for authentication:

```
Cookie: xid=SESSION_ID; xid.sig=SIGNATURE
```

This is the method used by the MeshCentral web UI.

### 2. Auth Token

You can use an authentication token in the URL:

```
wss://meshcentral.example.com/meshrelay.ashx?id=DEVICE_ID&auth=TOKEN
```

### 3. Base64-encoded Username:Password

You can encode your username and password in Base64 format:

```bash
AUTH=$(echo -n "username:password" | base64)
wss://meshcentral.example.com/meshrelay.ashx?id=DEVICE_ID&auth=$AUTH
```

## Device ID Formats

MeshCentral uses different device ID formats in different contexts:

1. Full ID with prefix: `node//DEVICE_ID`
2. ID with @ prefix: `@DEVICE_ID`
3. Raw ID: `DEVICE_ID`

For WebSocket connections, you typically need the format with the @ prefix.

## Protocol Codes

MeshCentral uses different protocol codes for different types of connections:

- `1`: Terminal
- `2`: Desktop
- `5`: Files

## Connection Process

1. Establish WebSocket connection to the URL
2. Send the protocol code as the first message
3. Handle the binary/text protocol for the specific session type

## Command Line Examples

### Using wscat

```bash
# Generate Base64 auth string
AUTH=$(echo -n "username:password" | base64)

# Connect to terminal tunnel (protocol 1)
wscat -n -c "wss://meshcentral.example.com/meshrelay.ashx?id=@DEVICE_ID&auth=$AUTH&p=1"
```

After connecting, send "1" as the first message.

### Using MeshCtrl

```bash
# Terminal access
node meshctrl.js --url wss://meshcentral.example.com --loginuser username --loginpass password shell --id "@DEVICE_ID"

# Desktop access
node meshctrl.js --url wss://meshcentral.example.com --loginuser username --loginpass password desktop --id "@DEVICE_ID"

# File transfer
node meshctrl.js --url wss://meshcentral.example.com --loginuser username --loginpass password upload --id "@DEVICE_ID" --file "local.txt" --target "remote.txt"
```

## Troubleshooting

### Connection Immediately Closes

If the WebSocket connection establishes but immediately closes with code 1005:

1. Check if you need session cookies from the browser
2. Verify the device ID format is correct
3. Ensure the device is online and connected to MeshCentral
4. Try sending the protocol code immediately after connection

### Invalid NodeID Error

If you get "Invalid NodeID" errors:

1. Try different device ID formats:
   - `@DEVICE_ID`
   - `node//@DEVICE_ID`
   - `DEVICE_ID` (without any prefix)
2. Ensure the device ID is correctly URL-encoded, especially if it contains special characters

### Authentication Failures

If authentication fails:

1. Verify your username and password are correct
2. Check if your auth token is valid and not expired
3. Try using session cookies from a browser that's already logged in

## Nginx Integration

When integrating with Nginx, use this configuration for WebSocket proxying:

```nginx
location /meshrelay.ashx {
    proxy_pass https://meshcentral-backend/meshrelay.ashx;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header Origin $scheme://$host;
    proxy_read_timeout 86400;
    
    # Pass through all headers and cookies
    proxy_pass_request_headers on;
}
```

This ensures that all necessary headers and cookies are passed to the MeshCentral server.
