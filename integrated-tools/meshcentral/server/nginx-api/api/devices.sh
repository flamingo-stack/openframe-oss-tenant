#!/bin/bash

# Enable debug mode
set -x

source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

echo "Debug: Starting devices.sh script" >&2
echo "Debug: REQUEST_METHOD=$REQUEST_METHOD" >&2
echo "Debug: PATH_INFO=$PATH_INFO" >&2
echo "Debug: MESH_DIR=$MESH_DIR" >&2

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

echo "Debug: Authenticating..." >&2
TOKEN=$(authenticate)
echo "Debug: Authentication result: $?" >&2

if [ -z "$TOKEN" ]; then
  echo "Debug: Token is empty" >&2
  send_error "MeshCentral token not found or invalid after multiple attempts" 500
fi

if [ "$REQUEST_METHOD" = "GET" ] && [ -z "$PATH_INFO" ]; then
  FILTER=""
  if echo "$QUERY_STRING" | grep -q "filter="; then
    FILTER="--filter \"$(echo "$QUERY_STRING" | grep -oP 'filter=\K[^&]+' | sed 's/%20/ /g')\""
  fi
  
  echo "Debug: Executing ListDevices command..." >&2
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken \"$TOKEN\" ListDevices --json $FILTER" >&2
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$TOKEN" ListDevices --json $FILTER)
  COMMAND_EXIT_CODE=$?
  
  echo "Debug: ListDevices exit code: $COMMAND_EXIT_CODE" >&2
  echo "Debug: Result length: ${#RESULT}" >&2
  
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    echo "Debug: Command failed" >&2
    send_error "Failed to list devices: $RESULT" 500
  fi
  
  send_json "$RESULT"
  
elif [ "$REQUEST_METHOD" = "GET" ] && [ -n "$PATH_INFO" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    send_error "Missing device ID" 400
  fi
  
  echo "Debug: Executing DeviceInfo command..." >&2
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$TOKEN" DeviceInfo --id "$DEVICE_ID" --json)
  COMMAND_EXIT_CODE=$?
  
  echo "Debug: DeviceInfo exit code: $COMMAND_EXIT_CODE" >&2
  
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    send_error "Failed to get device info: $RESULT" 500
  fi
  
  send_json "$RESULT"
else
  send_error "Method not allowed" 405
fi
