
source "$(dirname "$0")/../helpers/utils.sh"
source "$(dirname "$0")/../helpers/response.sh"

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
  handle_options
fi

DEVICE_ID=$(echo "$QUERY_STRING" | grep -oP 'id=\K[^&]+' || echo "")
PROTOCOL=$(echo "$QUERY_STRING" | grep -oP 'p=\K[^&]+' || echo "1")
RTC=$(echo "$QUERY_STRING" | grep -oP 'rtc=\K[^&]+' || echo "0")

if [ -z "$DEVICE_ID" ]; then
  send_error "Missing device ID parameter" 400
fi

AUTH_STRING=$(echo -n "${MESH_USER}:${MESH_PASS}" | base64)

WS_URL="${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT}/meshrelay.ashx?id=${DEVICE_ID}&auth=${AUTH_STRING}&p=${PROTOCOL}&rtc=${RTC}"

send_json "{\"device_id\":\"$DEVICE_ID\",\"type\":\"$PROTOCOL\",\"ws_url\":\"$WS_URL\"}"
