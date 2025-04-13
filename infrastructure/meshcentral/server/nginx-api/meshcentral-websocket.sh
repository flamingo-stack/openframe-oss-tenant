
log() {
    echo "[$(date)] $1" >> ${MESH_DIR}/nginx-api/websocket.log
}

send_response() {
    local status="$1"
    local data="$2"
    
    echo "Status: $status"
    echo "Content-Type: application/json"
    echo "Access-Control-Allow-Origin: *"
    echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
    echo "Access-Control-Allow-Headers: Content-Type, X-MeshAuth"
    echo ""
    echo "$data"
}

if [ "$REQUEST_METHOD" = "OPTIONS" ]; then
    echo "Status: 204"
    echo "Access-Control-Allow-Origin: *"
    echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
    echo "Access-Control-Allow-Headers: Content-Type, X-MeshAuth"
    echo ""
    exit 0
fi

DEVICE_ID=$(echo "$QUERY_STRING" | grep -oP 'id=\K[^&]+' || echo "")
PROTOCOL=$(echo "$QUERY_STRING" | grep -oP 'p=\K[^&]+' || echo "1")
RTC=$(echo "$QUERY_STRING" | grep -oP 'rtc=\K[^&]+' || echo "0")

if [ -z "$DEVICE_ID" ]; then
    send_response "400" "{\"error\": \"Missing device ID parameter\"}"
    exit 1
fi

AUTH_STRING=$(echo -n "${MESH_USER}:${MESH_PASS}" | base64)

WS_URL="${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT}/meshrelay.ashx?id=${DEVICE_ID}&auth=${AUTH_STRING}&p=${PROTOCOL}&rtc=${RTC}"

send_response "200" "{\"ws_url\":\"$WS_URL\"}"

log "Generated WebSocket URL for device $DEVICE_ID with protocol $PROTOCOL"
