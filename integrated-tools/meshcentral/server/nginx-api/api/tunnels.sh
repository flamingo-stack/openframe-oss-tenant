#!/bin/bash

# Enable debug mode
set -x

source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

echo "Debug: Starting tunnels.sh script" >&2
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
  
  TYPE=$(echo "$POST_DATA" | parse_json_input "type")
  
  if [ -z "$TYPE" ]; then
    echo "Debug: Missing tunnel type parameter" >&2
    send_error "Missing tunnel type parameter" 400
  fi
  
  echo "Debug: Setting up tunnel for device $DEVICE_ID" >&2
  echo "Debug: Tunnel type: $TYPE" >&2
  
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
      echo "Debug: Invalid tunnel type: $TYPE" >&2
      send_error "Invalid tunnel type. Supported types: terminal, desktop, files" 400
      ;;
  esac
  
  echo "Debug: Selected protocol: $PROTOCOL" >&2
  
  WS_URL="${MESH_PROTOCOL}://${MESH_NGINX_NAT_HOST}:${MESH_EXTERNAL_PORT}/meshrelay.ashx?id=${DEVICE_ID}&auth=${TOKEN}&p=${PROTOCOL}&rtc=0"
  echo "Debug: Generated WebSocket URL: $WS_URL" >&2
  
  send_json "{\"device_id\":\"$DEVICE_ID\",\"type\":\"$TYPE\",\"protocol\":\"$PROTOCOL\",\"ws_url\":\"$WS_URL\"}"
else
  send_error "Method not allowed" 405
fi
