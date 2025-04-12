#!/bin/bash

source "${MESH_DIR}/nginx-api/helpers/utils.sh"
source "${MESH_DIR}/nginx-api/helpers/response.sh"

# Log request details
log_request

debug_log "Starting devices.sh script"
debug_log "REQUEST_METHOD=${REQUEST_METHOD}"
debug_log "PATH_INFO=${PATH_INFO}"
debug_log "QUERY_STRING=${QUERY_STRING}"

# Handle OPTIONS request
if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
  exit 0
fi

# Handle GET request
if [ "$REQUEST_METHOD" = "GET" ]; then
  # Check if we have a specific device ID
  DEVICE_ID=""
  if [ -n "$PATH_INFO" ]; then
    # Remove leading slash if present
    DEVICE_ID=$(echo "$PATH_INFO" | sed 's/^\///')
  fi
  
  if [ -z "$DEVICE_ID" ]; then
    # List all devices
    debug_log "Listing all devices..."
    
    FILTER=""
    if [ -n "$QUERY_STRING" ] && echo "$QUERY_STRING" | grep -q "filter="; then
      FILTER="--filter \"$(echo "$QUERY_STRING" | grep -oP 'filter=\K[^&]+' | sed 's/%20/ /g')\""
    fi
    
    # Prepare command with proper quoting
    cmd=(node "${MESH_DIR}/node_modules/meshcentral/meshctrl.js"
      --url "${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT}"
      --loginuser "${MESH_USER}"
      --loginpass "${MESH_PASS}"
      ListDevices
      --json)
    
    if [ -n "$FILTER" ]; then
      cmd+=($FILTER)
    fi
    
    debug_log "========== EXECUTING COMMAND =========="
    debug_log "Command: ${cmd[*]}"
    debug_log "======================================"
    
    # Execute command and capture output and error
    RESULT=""
    ERROR=""
    {
      RESULT=$("${cmd[@]}" 2> >(tee /dev/fd/3))
      COMMAND_EXIT_CODE=$?
    }
    
    debug_log "========== COMMAND RESULT =========="
    debug_log "Exit Code: $COMMAND_EXIT_CODE"
    debug_log "Output: $RESULT"
    debug_log "===================================="
    
    # Check if the output is valid JSON
    if ! (echo "$RESULT" | jq -e . >/dev/null 2>&1); then
      debug_log "Invalid JSON output"
      send_error "Invalid response format from MeshCentral" 500
      exit 1
    fi
    
    if [ $COMMAND_EXIT_CODE -ne 0 ]; then
      debug_log "ListDevices command failed"
      ERROR_MSG=$(echo "$RESULT" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
      send_error "Failed to list devices: $ERROR_MSG" 500
      exit 1
    fi
    
    # Send the JSON response using the helper function
    send_json "$RESULT"
    exit 0
  else
    # Get specific device info
    debug_log "Getting device info for ID: $DEVICE_ID"
    
    # Prepare command with proper quoting
    cmd=(node "${MESH_DIR}/node_modules/meshcentral/meshctrl.js"
      --url "${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT}"
      --loginuser "${MESH_USER}"
      --loginpass "${MESH_PASS}"
      DeviceInfo
      --id "$DEVICE_ID"
      --json)
    
    debug_log "========== EXECUTING COMMAND =========="
    debug_log "Command: ${cmd[*]}"
    debug_log "======================================"
    
    # Execute command and capture output and error
    RESULT=""
    ERROR=""
    {
      RESULT=$("${cmd[@]}" 2> >(tee /dev/fd/3))
      COMMAND_EXIT_CODE=$?
    }
    
    debug_log "========== COMMAND RESULT =========="
    debug_log "Exit Code: $COMMAND_EXIT_CODE"
    debug_log "Output: $RESULT"
    debug_log "===================================="
    
    # Check if the output is valid JSON
    if ! (echo "$RESULT" | jq -e . >/dev/null 2>&1); then
      debug_log "Invalid JSON output"
      send_error "Invalid response format from MeshCentral" 500
      exit 1
    fi
    
    if [ $COMMAND_EXIT_CODE -ne 0 ]; then
      debug_log "DeviceInfo command failed"
      ERROR_MSG=$(echo "$RESULT" | jq -r '.error // "Unknown error"' 2>/dev/null || echo "Unknown error")
      send_error "Failed to get device info: $ERROR_MSG" 500
      exit 1
    fi
    
    # Send the JSON response using the helper function
    send_json "$RESULT"
    exit 0
  fi
else
  send_error "Method not allowed" 405
  exit 1
fi
