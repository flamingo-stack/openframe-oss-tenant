

echo "Setting up test environment..."
TEST_DIR="/tmp/test_meshcentral"
mkdir -p $TEST_DIR

cat > $TEST_DIR/meshcentral-functions.sh << 'EOF'

setup_mesh_token() {
  echo "Simulating token refresh..."
  echo "refreshed_valid_token_$(date +%s)" > ${MESH_DIR}/mesh_token
  echo "Token refreshed and stored at ${MESH_DIR}/mesh_token"
}
EOF

chmod +x $TEST_DIR/meshcentral-functions.sh

cat > $TEST_DIR/utils.sh << 'EOF'

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
  
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken \"$token\" ServerInfo"
  
  if [[ "$token" == valid_* ]] || [[ "$token" == refreshed_valid_* ]]; then
    return 0
  else
    return 1
  fi
}

authenticate() {
  local max_retries=3
  local retry_count=0
  local token=""

  while [ $retry_count -lt $max_retries ]; do
    token=$(get_stored_token)
    
    if [ -z "$token" ]; then
      echo "Token not found, refreshing (attempt $((retry_count+1))/$max_retries)..." >&2
      source ${MESH_DIR}/meshcentral-functions.sh
      setup_mesh_token
      retry_count=$((retry_count + 1))
      continue
    fi
    
    if is_token_valid "$token"; then
      echo "$token"
      return 0
    fi
    
    echo "Token validation failed, refreshing token (attempt $((retry_count+1))/$max_retries)..." >&2
    source ${MESH_DIR}/meshcentral-functions.sh
    setup_mesh_token
    
    retry_count=$((retry_count+1))
    
    if [ $retry_count -lt $max_retries ]; then
      sleep 1
    fi
  done
  
  echo "Failed to obtain a valid token after $max_retries attempts" >&2
  return 1
}
EOF

echo "=== Test 1: Valid token ==="
echo "valid_token_123" > $TEST_DIR/mesh_token
export MESH_DIR=$TEST_DIR
source $TEST_DIR/utils.sh
TOKEN=$(authenticate)
echo "Result: $TOKEN"
echo ""

echo "=== Test 2: Invalid token with refresh ==="
echo "invalid_token_123" > $TEST_DIR/mesh_token
export MESH_DIR=$TEST_DIR
source $TEST_DIR/utils.sh
TOKEN=$(authenticate)
echo "Result: $TOKEN"
echo ""

echo "=== Test 3: Multiple invalid tokens (testing retry logic) ==="
cat > $TEST_DIR/meshcentral-functions-test3.sh << 'EOF'

ATTEMPT=0

setup_mesh_token() {
  ATTEMPT=$((ATTEMPT+1))
  
  if [ $ATTEMPT -lt 3 ]; then
    echo "Simulating failed token refresh (attempt $ATTEMPT)..."
    echo "still_invalid_token_$ATTEMPT" > ${MESH_DIR}/mesh_token
  else
    echo "Simulating successful token refresh (attempt $ATTEMPT)..."
    echo "valid_token_after_retries" > ${MESH_DIR}/mesh_token
  fi
}
EOF

chmod +x $TEST_DIR/meshcentral-functions-test3.sh
echo "invalid_token_start" > $TEST_DIR/mesh_token
export MESH_DIR=$TEST_DIR
cat > $TEST_DIR/utils-test3.sh << 'EOF'

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
  
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken \"$token\" ServerInfo"
  
  if [[ "$token" == valid_* ]]; then
    return 0
  else
    return 1
  fi
}

authenticate() {
  local max_retries=3
  local retry_count=0
  local token=""

  while [ $retry_count -lt $max_retries ]; do
    token=$(get_stored_token)
    
    if [ -z "$token" ]; then
      echo "Token not found, refreshing (attempt $((retry_count+1))/$max_retries)..." >&2
      source ${MESH_DIR}/meshcentral-functions-test3.sh
      setup_mesh_token
      retry_count=$((retry_count + 1))
      continue
    fi
    
    if is_token_valid "$token"; then
      echo "$token"
      return 0
    fi
    
    echo "Token validation failed, refreshing token (attempt $((retry_count+1))/$max_retries)..." >&2
    source ${MESH_DIR}/meshcentral-functions-test3.sh
    setup_mesh_token
    
    retry_count=$((retry_count+1))
    
    if [ $retry_count -lt $max_retries ]; then
      sleep 1
    fi
  done
  
  echo "Failed to obtain a valid token after $max_retries attempts" >&2
  return 1
}
EOF

source $TEST_DIR/utils-test3.sh
TOKEN=$(authenticate)
echo "Result: $TOKEN"
echo ""

echo "=== Test 4: Exceeding max retries ==="
cat > $TEST_DIR/meshcentral-functions-test4.sh << 'EOF'

setup_mesh_token() {
  echo "Simulating failed token refresh..."
  echo "always_invalid_token_$(date +%s)" > ${MESH_DIR}/mesh_token
}
EOF

chmod +x $TEST_DIR/meshcentral-functions-test4.sh
echo "invalid_token_start" > $TEST_DIR/mesh_token
export MESH_DIR=$TEST_DIR
cat > $TEST_DIR/utils-test4.sh << 'EOF'

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
  
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --logintoken \"$token\" ServerInfo"
  
  if [[ "$token" == valid_* ]]; then
    return 0
  else
    return 1
  fi
}

authenticate() {
  local max_retries=3
  local retry_count=0
  local token=""

  while [ $retry_count -lt $max_retries ]; do
    token=$(get_stored_token)
    
    if [ -z "$token" ]; then
      echo "Token not found, refreshing (attempt $((retry_count+1))/$max_retries)..." >&2
      source ${MESH_DIR}/meshcentral-functions-test4.sh
      setup_mesh_token
      retry_count=$((retry_count + 1))
      continue
    fi
    
    if is_token_valid "$token"; then
      echo "$token"
      return 0
    fi
    
    echo "Token validation failed, refreshing token (attempt $((retry_count+1))/$max_retries)..." >&2
    source ${MESH_DIR}/meshcentral-functions-test4.sh
    setup_mesh_token
    
    retry_count=$((retry_count+1))
    
    if [ $retry_count -lt $max_retries ]; then
      sleep 1
    fi
  done
  
  echo "Failed to obtain a valid token after $max_retries attempts" >&2
  return 1
}
EOF

source $TEST_DIR/utils-test4.sh
TOKEN=$(authenticate)
echo "Result: $TOKEN"
echo "Exit code: $?"
echo ""

echo "All tests completed."
