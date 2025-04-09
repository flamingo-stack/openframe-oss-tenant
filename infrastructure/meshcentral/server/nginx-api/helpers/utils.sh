
get_auth_token() {
  local token="$HTTP_X_MESHAUTH"
  
  if [ -z "$token" ] && [ -n "$QUERY_STRING" ]; then
    token=$(echo "$QUERY_STRING" | grep -oP 'auth=\K[^&]+')
  fi
  
  echo "$token"
}

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
  local token=$(get_auth_token)
  
  if [ -z "$token" ]; then
    token=$(get_stored_token)
    if [ -z "$token" ]; then
      return 1
    fi
  fi
  
  if is_token_valid "$token"; then
    echo "$token"
    return 0
  fi
  
  return 1
}

parse_json_input() {
  local field="$1"
  grep -o "\"$field\":[^,}]*" | sed 's/"'"$field"'":"\{0,1\}\([^",}]*\)"\{0,1\}/\1/'
}
