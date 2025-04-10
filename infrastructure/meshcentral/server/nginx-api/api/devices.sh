
source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

TOKEN=$(authenticate)

if [ -z "$TOKEN" ]; then
  send_error "MeshCentral token not found or invalid after multiple attempts" 500
fi

if [ "$REQUEST_METHOD" = "GET" ] && [ -z "$PATH_INFO" ]; then
  FILTER=""
  if echo "$QUERY_STRING" | grep -q "filter="; then
    FILTER="--filter \"$(echo "$QUERY_STRING" | grep -oP 'filter=\K[^&]+' | sed 's/%20/ /g')\""
  fi
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$TOKEN" ListDevices --json $FILTER)
  
  send_json "$RESULT"
  
elif [ "$REQUEST_METHOD" = "GET" ] && [ -n "$PATH_INFO" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    send_error "Missing device ID" 400
  fi
  
  RESULT=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$TOKEN" DeviceInfo --id "$DEVICE_ID" --json)
  
  send_json "$RESULT"
else
  send_error "Method not allowed" 405
fi
