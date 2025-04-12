#!/bin/bash

# Log to debug file
log() {
    echo "[$(date)] $1" >> ${MESH_DIR}/nginx-api/api.log
}

# Send JSON response
send_response() {
    local status="$1"
    local data="$2"
    
    echo "Status: $status"
    echo "Content-Type: application/json"
    echo "Access-Control-Allow-Origin: *"
    echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
    echo "Access-Control-Allow-Headers: Content-Type, X-MeshAuth"
    echo ""
    echo "$data"
}

# Handle OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    send_response "204" "{}"
    exit 0
fi

# Get the command from URL (everything after /api/)
COMMAND=$(echo "$PATH_INFO" | sed 's/^\/api\///')

if [ -z "$COMMAND" ]; then
    send_response "400" "{\"error\": \"No command specified\"}"
    exit 1
fi

# Build the base command
CMD="node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js"
CMD="$CMD --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT}"
CMD="$CMD --loginuser ${MESH_USER} --loginpass ${MESH_PASS}"
CMD="$CMD ${COMMAND}"  # Capitalize first letter of command

# Add query parameters as arguments (e.g., ?filter=online -> --filter online)
if [ -n "$QUERY_STRING" ]; then
    while IFS='=' read -r key value; do
        if [ -n "$value" ]; then
            # URL decode the value
            value=$(printf '%b' "${value//%/\\x}")
            CMD="$CMD --$key \"$value\""
        fi
    done <<< "${QUERY_STRING//&/$'\n'}"
fi

# Add POST data as arguments if present
if [ "$REQUEST_METHOD" = "POST" ] && [ "$CONTENT_LENGTH" -gt 0 ]; then
    read -n "$CONTENT_LENGTH" POST_DATA
    while IFS=':' read -r key value; do
        key=$(echo "$key" | tr -d '"{} ')
        value=$(echo "$value" | tr -d '"{},')
        if [ -n "$key" ] && [ -n "$value" ]; then
            CMD="$CMD --$key \"$value\""
        fi
    done <<< "$POST_DATA"
fi

# Always output as JSON
CMD="$CMD --json"

# Log the command
log "Executing: $CMD"

# Run the command
RESULT=$(eval "$CMD" 2>&1)
EXIT_CODE=$?

# Log the result
log "Exit code: $EXIT_CODE"
log "Result: $RESULT"

# Send response
if [ $EXIT_CODE -eq 0 ]; then
    send_response "200" "$RESULT"
else
    send_response "500" "{\"error\": \"$RESULT\"}"
fi 