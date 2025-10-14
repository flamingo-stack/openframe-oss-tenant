#!/bin/bash

# Log to debug file
log() {
    echo "[$(date)] $1" >> ${MESH_DIR}/nginx-api/custom-msh.log
}

# Send MSH file response
send_msh_response() {
    local content="$1"
    
    echo "Status: 200"
    echo "Content-Type: application/octet-stream"
    echo "Content-Disposition: attachment; filename=meshagent.msh"
    echo "Access-Control-Allow-Origin: *"
    echo "Access-Control-Allow-Methods: GET, OPTIONS"
    echo "Access-Control-Allow-Headers: Content-Type"
    echo ""
    echo "$content"
}

# Send error response
send_error() {
    local status="$1"
    local message="$2"
    
    echo "Status: $status"
    echo "Content-Type: application/json"
    echo "Access-Control-Allow-Origin: *"
    echo ""
    echo "{\"error\": \"$message\"}"
}

# Handle OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "Status: 204"
    echo "Access-Control-Allow-Origin: *"
    echo "Access-Control-Allow-Methods: GET, OPTIONS"
    echo "Access-Control-Allow-Headers: Content-Type"
    echo ""
    exit 0
fi

# Parse query parameters
parse_query_string() {
    local query="$1"
    local param="$2"
    
    echo "$query" | grep -o "${param}=[^&]*" | cut -d= -f2 | sed 's/%2F/\//g; s/%3A/:/g; s/%3F/?/g; s/%3D/=/g; s/%26/\&/g'
}

# Extract host parameter from query string
CUSTOM_HOST=$(parse_query_string "$QUERY_STRING" "host")

if [ -z "$CUSTOM_HOST" ]; then
    log "ERROR: Missing 'host' parameter"
    send_error "400" "Missing required parameter: host"
    exit 1
fi

log "Generating custom MSH file for host: $CUSTOM_HOST"

# Check if required files exist
if [ ! -f "${MESH_DIR}/mesh_id" ]; then
    log "ERROR: mesh_id file not found"
    send_error "500" "Mesh ID not initialized"
    exit 1
fi

if [ ! -f "${MESH_DIR}/mesh_server_id" ]; then
    log "ERROR: mesh_server_id file not found"
    send_error "500" "Server ID not initialized"
    exit 1
fi

# Read the IDs from files
MESH_ID=$(cat "${MESH_DIR}/mesh_id")
SERVER_ID=$(cat "${MESH_DIR}/mesh_server_id")

if [ -z "$MESH_ID" ] || [ -z "$SERVER_ID" ]; then
    log "ERROR: Empty mesh_id or server_id"
    send_error "500" "Invalid mesh configuration"
    exit 1
fi

# Determine the protocol (default to wss for custom host)
PROTOCOL="wss"
if [[ "$CUSTOM_HOST" == http://* ]]; then
    PROTOCOL="ws"
fi

# Remove protocol prefix if present
CLEAN_HOST=$(echo "$CUSTOM_HOST" | sed 's|^https\?://||' | sed 's|^wss\?://||')

# Build the mesh server URL with custom host
MESH_SERVER_URL="${PROTOCOL}://${CLEAN_HOST}/ws/tools/agent/meshcentral-server/agent.ashx"

log "Generated URL: $MESH_SERVER_URL"

# Generate the MSH file content
MSH_CONTENT="MeshName=${MESH_DEVICE_GROUP}
MeshType=2
MeshID=${MESH_ID}
ignoreProxyFile=1
ServerID=${SERVER_ID}
MeshServer=${MESH_SERVER_URL}"

log "MSH file generated successfully"

# Send the response
send_msh_response "$MSH_CONTENT"

