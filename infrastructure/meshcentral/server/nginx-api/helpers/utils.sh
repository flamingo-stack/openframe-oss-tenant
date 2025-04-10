
get_stored_token() {
  if [ -f "${MESH_DIR}/mesh_token" ]; then
    cat "${MESH_DIR}/mesh_token"
    return 0
  fi
  return 1
}

is_token_valid() {
  local token="$1"
  
  if [ -z "$token" ]; then
    return 1
  fi
  
  local result=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken "$token" ServerInfo 2>&1)
  
  if echo "$result" | grep -q "server"; then
    return 0
  else
    return 1
  fi
}

authenticate() {
  local token=$(get_stored_token)
  local max_retries=3
  local retry_count=0
  
  if [ -z "$token" ]; then
    return 1
  fi
  
  while [ $retry_count -lt $max_retries ]; do
    if is_token_valid "$token"; then
      echo "$token"
      return 0
    fi
    
    echo "Token validation failed, refreshing token (attempt $((retry_count+1))/$max_retries)..." >&2
    source /meshcentral-functions.sh
    setup_mesh_token
    
    token=$(get_stored_token)
    if [ -z "$token" ]; then
      return 1
    fi
    
    retry_count=$((retry_count+1))
    
    if [ $retry_count -lt $max_retries ]; then
      sleep 2
    fi
  done
  
  echo "Failed to obtain valid token after $max_retries attempts" >&2
  return 1
}

parse_json_input() {
  local field="$1"
  grep -o "\"$field\":[^,}]*" | sed 's/"'"$field"'":"\{0,1\}\([^",}]*\)"\{0,1\}/\1/'
}
