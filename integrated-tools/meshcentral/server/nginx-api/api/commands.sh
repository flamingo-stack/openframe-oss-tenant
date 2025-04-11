#!/bin/bash

# Enable debug mode
set -x

source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

echo "Debug: Starting commands.sh script" >&2
echo "Debug: REQUEST_METHOD=$REQUEST_METHOD" >&2
echo "Debug: PATH_INFO=$PATH_INFO" >&2

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

if [ "$REQUEST_METHOD" = "POST" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    echo "Debug: Missing device ID" >&2
    send_error "Missing device ID" 400
  fi
  
  read -n $CONTENT_LENGTH POST_DATA
  echo "Debug: Received POST data: $POST_DATA" >&2
  
  COMMAND=$(echo "$POST_DATA" | parse_json_input "command")
  POWERSHELL=$(echo "$POST_DATA" | grep -o '"powershell":\(true\|false\)' | sed 's/"powershell"://;s/"//')
  
  if [ -z "$COMMAND" ]; then
    echo "Debug: Missing command parameter" >&2
    send_error "Missing command parameter" 400
  fi
  
  echo "Debug: Running command on device $DEVICE_ID" >&2
  echo "Debug: Command to run: $COMMAND" >&2
  echo "Debug: PowerShell mode: $POWERSHELL" >&2
  
  OPTIONS=""
  if [ "$POWERSHELL" = "true" ]; then
    OPTIONS="$OPTIONS --powershell"
  fi
  
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --logintoken \"$TOKEN\" --configfile ${MESH_DIR}/config.json RunCommand --id \"$DEVICE_ID\" --run \"$COMMAND\" $OPTIONS" >&2
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --logintoken "$TOKEN" --configfile ${MESH_DIR}/config.json RunCommand --id "$DEVICE_ID" --run "$COMMAND" $OPTIONS)
  COMMAND_EXIT_CODE=$?
  
  echo "Debug: RunCommand exit code: $COMMAND_EXIT_CODE" >&2
  echo "Debug: Result length: ${#RESULT}" >&2
  
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    echo "Debug: RunCommand failed" >&2
    send_error "Failed to run command: $RESULT" 500
  fi
  
  JSON_RESULT="{\"device_id\":\"$DEVICE_ID\",\"command\":\"$COMMAND\",\"result\":\"$(echo "$RESULT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')\"}"
  
  send_json "$JSON_RESULT"
else
  send_error "Method not allowed" 405
fi
