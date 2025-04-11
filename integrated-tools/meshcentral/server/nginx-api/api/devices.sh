#!/bin/bash

# Enable debug mode
set -x

source ${MESH_DIR}/nginx-api/helpers/utils.sh
source ${MESH_DIR}/nginx-api/helpers/response.sh

echo "Debug: Starting devices.sh script" >&2
echo "Debug: REQUEST_METHOD=$REQUEST_METHOD" >&2
echo "Debug: PATH_INFO=$PATH_INFO" >&2
echo "Debug: QUERY_STRING=$QUERY_STRING" >&2

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

# List all devices
list_devices() {
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json ListDevices" >&2
  
  local result=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
    --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
    --loginuser ${MESH_USER} \
    --loginpass ${MESH_PASS} \
    --configfile ${MESH_DIR}/config.json \
    ListDevices)
  
  local exit_code=$?
  echo "Debug: ListDevices command exit code: $exit_code" >&2
  echo "Debug: ListDevices result length: ${#result}" >&2
  
  if [ $exit_code -eq 0 ]; then
    send_json_response "$result"
  else
    send_error_response "Failed to list devices"
  fi
}

# Get device info
get_device_info() {
  local device_id="$1"
  
  if [ -z "$device_id" ]; then
    send_error_response "Device ID is required"
    return 1
  fi
  
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json DeviceInfo --id $device_id" >&2
  
  local result=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
    --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
    --loginuser ${MESH_USER} \
    --loginpass ${MESH_PASS} \
    --configfile ${MESH_DIR}/config.json \
    DeviceInfo \
    --id "$device_id")
  
  local exit_code=$?
  echo "Debug: DeviceInfo command exit code: $exit_code" >&2
  echo "Debug: DeviceInfo result length: ${#result}" >&2
  
  if [ $exit_code -eq 0 ]; then
    send_json_response "$result"
  else
    send_error_response "Failed to get device info"
  fi
}

if [ "$REQUEST_METHOD" = "GET" ] && [ -z "$PATH_INFO" ]; then
  FILTER=""
  if echo "$QUERY_STRING" | grep -q "filter="; then
    FILTER="--filter \"$(echo "$QUERY_STRING" | grep -oP 'filter=\K[^&]+' | sed 's/%20/ /g')\""
    echo "Debug: Using filter: $FILTER" >&2
  fi
  
  echo "Debug: Executing ListDevices command..." >&2
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json ListDevices --json $FILTER" >&2
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json ListDevices --json $FILTER)
  COMMAND_EXIT_CODE=$?
  
  echo "Debug: ListDevices exit code: $COMMAND_EXIT_CODE" >&2
  echo "Debug: Result length: ${#RESULT}" >&2
   
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    echo "Debug: ListDevices command failed" >&2
    send_error "Failed to list devices: $RESULT" 500
  fi
  
  send_json "$RESULT"
  
elif [ "$REQUEST_METHOD" = "GET" ] && [ -n "$PATH_INFO" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    echo "Debug: Missing device ID" >&2
    send_error "Missing device ID" 400
  fi
  
  echo "Debug: Getting device info for ID: $DEVICE_ID" >&2
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json DeviceInfo --id \"$DEVICE_ID\"" >&2
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json DeviceInfo --id "$DEVICE_ID")
  COMMAND_EXIT_CODE=$?
  
  echo "Debug: DeviceInfo exit code: $COMMAND_EXIT_CODE" >&2
  echo "Debug: Result length: ${#RESULT}" >&2
  
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    echo "Debug: DeviceInfo command failed" >&2
    send_error "Failed to get device info: $RESULT" 500
  fi
  
  send_json "$RESULT"
else
  send_error "Method not allowed" 405
fi
