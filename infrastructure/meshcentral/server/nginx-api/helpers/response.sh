
send_headers() {
  local content_type="${1:-application/json}"
  local status="${2:-200}"
  
  echo "Content-Type: $content_type"
  echo "Status: $status"
  echo "Cache-Control: no-cache, no-store, must-revalidate"
  echo "Access-Control-Allow-Origin: *"
  echo "Access-Control-Allow-Methods: GET, POST, OPTIONS"
  echo "Access-Control-Allow-Headers: Content-Type, X-MeshAuth"
  echo ""
}

send_error() {
  local message="$1"
  local status="${2:-400}"
  
  send_headers "application/json" "$status"
  echo "{\"error\":\"$message\"}"
  exit 0
}

send_json() {
  local data="$1"
  
  send_headers "application/json" "200"
  echo "$data"
  exit 0
}

handle_options() {
  send_headers "text/plain" "204"
  exit 0
}
