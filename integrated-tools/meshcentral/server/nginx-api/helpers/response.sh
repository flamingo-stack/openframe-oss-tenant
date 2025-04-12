#!/bin/bash

# Function to write debug logs
debug_log() {
  mkdir -p /var/log/meshcentral
  touch /var/log/meshcentral/debug.log
  echo "[fastcgi] $*" >> /var/log/meshcentral/debug.log
}

log_request() {
  debug_log "========== REQUEST INFO =========="
  debug_log "Script: $SCRIPT_FILENAME"
  debug_log "Method: $REQUEST_METHOD"
  debug_log "Path Info: $PATH_INFO"
  debug_log "Query String: $QUERY_STRING"
  debug_log "Content Type: $CONTENT_TYPE"
  debug_log "Content Length: $CONTENT_LENGTH"
  debug_log "==================================="
}

send_headers() {
  local content_type="${1:-application/json}"
  local status="${2:-200}"
  
  debug_log "========== RESPONSE HEADERS =========="
  debug_log "Status: $status"
  debug_log "Content-Type: $content_type"
  debug_log "======================================"
  
  # Send FastCGI headers to stdout without any debug output
  printf "Status: %d\r\n" "$status"
  printf "Content-Type: %s\r\n" "$content_type"
  printf "Cache-Control: no-cache, no-store, must-revalidate\r\n"
  printf "Access-Control-Allow-Origin: *\r\n"
  printf "Access-Control-Allow-Methods: GET, POST, OPTIONS\r\n"
  printf "Access-Control-Allow-Headers: Content-Type, X-MeshAuth\r\n"
  printf "\r\n"
}

send_error() {
  local message="$1"
  local status="${2:-400}"
  
  debug_log "========== ERROR RESPONSE =========="
  debug_log "Status: $status"
  debug_log "Message: $message"
  debug_log "===================================="
  
  # Send error response to stdout
  send_headers "application/json" "$status"
  printf '{"error":"%s"}\n' "$message"
}

send_json() {
  local data="$1"
  
  debug_log "========== JSON RESPONSE =========="
  debug_log "Data Length: ${#data}"
  debug_log "Data Preview: ${data:0:100}..."
  debug_log "=================================="
  
  # Send JSON response to stdout
  send_headers "application/json" "200"
  printf "%s" "$data"
}

handle_options() {
  debug_log "========== OPTIONS RESPONSE =========="
  debug_log "Handling OPTIONS request"
  debug_log "======================================"
  
  # Send OPTIONS response to stdout
  send_headers "text/plain" "204"
}
