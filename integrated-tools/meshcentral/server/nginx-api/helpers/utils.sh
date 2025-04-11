get_stored_token() {
  echo "Debug: Checking for stored token in ${MESH_DIR}/mesh_token" >&2
  if [ -f "${MESH_DIR}/mesh_token" ]; then
    cat "${MESH_DIR}/mesh_token"
    return 0
  fi
  return 1
}

is_token_valid() {
  local token="$1"
  
  if [ -z "$token" ]; then
    echo "Debug: Token is empty" >&2
    return 1
  fi
  
  echo "Debug: Validating with ServerInfo command" >&2
  echo "Debug: Command: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json ServerInfo" >&2
  
  local result=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} --configfile ${MESH_DIR}/config.json ServerInfo 2>&1)
  local exit_code=$?
  
  echo "Debug: ServerInfo command exit code: $exit_code" >&2
  echo "Debug: ServerInfo result: $result" >&2
  
  if echo "$result" | grep -q "server"; then
    echo "Debug: Validation successful" >&2
    return 0
  else
    echo "Debug: Validation failed" >&2
    return 1
  fi
}

authenticate() {
  local token=$(get_stored_token)
  local max_retries=3
  local retry_count=0
  
  if [ -z "$token" ]; then
    echo "Debug: No stored token found" >&2
    return 1
  fi
  
  while [ $retry_count -lt $max_retries ]; do
    echo "Debug: Attempting token validation (attempt $((retry_count+1))/$max_retries)" >&2
    if is_token_valid "$token"; then
      echo "Debug: Token is valid, returning token" >&2
      echo "$token"
      return 0
    fi
    
    echo "Debug: Token validation failed, refreshing token (attempt $((retry_count+1))/$max_retries)" >&2
    source /meshcentral-functions.sh
    setup_mesh_token
    
    token=$(get_stored_token)
    if [ -z "$token" ]; then
      echo "Debug: Failed to get new token after refresh" >&2
      return 1
    fi
    
    retry_count=$((retry_count+1))
    
    if [ $retry_count -lt $max_retries ]; then
      sleep 2
    fi
  done
  
  echo "Debug: Failed to obtain valid token after $max_retries attempts" >&2
  return 1
}

parse_json_input() {
  local field="$1"
  echo "Debug: Parsing JSON input for field: $field" >&2
  grep -o "\"$field\":[^,}]*" | sed 's/"'"$field"'":"\{0,1\}\([^",}]*\)"\{0,1\}/\1/'
}
