
source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

if [ -f "$MESH_TOKEN" ]; then
  TOKEN=$(cat "$MESH_TOKEN")
else
  TOKEN=$(authenticate)
fi

if [ -z "$TOKEN" ]; then
  send_error "MeshCentral token not found or invalid" 500
fi

if [ "$REQUEST_METHOD" = "POST" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    send_error "Missing device ID" 400
  fi
  
  read -n $CONTENT_LENGTH POST_DATA
  
  COMMAND=$(echo "$POST_DATA" | parse_json_input "command")
  POWERSHELL=$(echo "$POST_DATA" | grep -o '"powershell":\(true\|false\)' | sed 's/"powershell"://;s/"//')
  
  if [ -z "$COMMAND" ]; then
    send_error "Missing command parameter" 400
  fi
  
  OPTIONS=""
  if [ "$POWERSHELL" = "true" ]; then
    OPTIONS="$OPTIONS --powershell"
  fi
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$TOKEN" RunCommand --id "$DEVICE_ID" --run "$COMMAND" $OPTIONS)
  
  JSON_RESULT="{\"device_id\":\"$DEVICE_ID\",\"command\":\"$COMMAND\",\"result\":\"$(echo "$RESULT" | sed 's/"/\\"/g' | sed ':a;N;$!ba;s/\n/\\n/g')\"}"
  
  send_json "$JSON_RESULT"
else
  send_error "Method not allowed" 405
fi
