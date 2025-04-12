#!/bin/bash
source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

# Log request details
log_request

echo "Debug: Starting commands.sh script" >&2
echo "Debug: REQUEST_METHOD=$REQUEST_METHOD" >&2
echo "Debug: PATH_INFO=$PATH_INFO" >&2

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

echo "Debug: Authenticating..." >&2
if ! authenticate; then
  echo "Debug: Authentication failed" >&2
  send_error "Authentication failed" 401
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
  
  local cmd="node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
    --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
    --loginuser ${MESH_USER} \
    --loginpass ${MESH_PASS} \
    RunCommand \
    --id \"$DEVICE_ID\" \
    --run \"$COMMAND\" \
    $OPTIONS"
  
  echo "========== EXECUTING COMMAND ==========" >&2
  echo "$cmd" >&2
  echo "=====================================" >&2
  
  RESULT=$(eval "$cmd" 2>&1)
  COMMAND_EXIT_CODE=$?
  
  echo "========== COMMAND RESULT ==========" >&2
  echo "Exit Code: $COMMAND_EXIT_CODE" >&2
  echo "Output:" >&2
  echo "$RESULT" >&2
  echo "===================================" >&2
  
  if [ $COMMAND_EXIT_CODE -ne 0 ]; then
    echo "Debug: RunCommand failed" >&2
    send_error "Failed to run command: $RESULT" 500
  fi
  
  JSON_RESULT="{\"device_id\":\"$DEVICE_ID\",\"command\":\"$COMMAND\",\"result\":\"$(echo "$RESULT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')\"}"
  
  send_json "$JSON_RESULT"
else
  send_error "Method not allowed" 405
fi
