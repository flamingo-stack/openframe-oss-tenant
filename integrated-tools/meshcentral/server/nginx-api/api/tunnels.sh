
source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

TOKEN=$(authenticate)

if [ -z "$TOKEN" ]; then
  send_error "MeshCentral token not found or invalid after multiple attempts" 500
fi

if [ "$REQUEST_METHOD" = "POST" ]; then
  DEVICE_ID=$(echo "$PATH_INFO" | cut -d'/' -f2)
  
  if [ -z "$DEVICE_ID" ]; then
    send_error "Missing device ID" 400
  fi
  
  read -n $CONTENT_LENGTH POST_DATA
  
  TYPE=$(echo "$POST_DATA" | parse_json_input "type")
  
  if [ -z "$TYPE" ]; then
    send_error "Missing tunnel type parameter" 400
  fi
  
  PROTOCOL=""
  case "$TYPE" in
    "terminal")
      PROTOCOL="1"
      ;;
    "desktop")
      PROTOCOL="2"
      ;;
    "files")
      PROTOCOL="5"
      ;;
    *)
      send_error "Invalid tunnel type. Supported types: terminal, desktop, files" 400
      ;;
  esac
  
  WS_URL="${MESH_PROTOCOL}://${MESH_NGINX_NAT_HOST}:${MESH_EXTERNAL_PORT}/meshrelay.ashx?id=${DEVICE_ID}&auth=${TOKEN}&p=${PROTOCOL}&rtc=0"
  
  send_json "{\"device_id\":\"$DEVICE_ID\",\"type\":\"$TYPE\",\"protocol\":\"$PROTOCOL\",\"ws_url\":\"$WS_URL\"}"
else
  send_error "Method not allowed" 405
fi
