#!/bin/bash

function setup_mesh_token() {
  echo "Checking for existing mesh token..."

  # First check if token exists in filesystem
  if [[ -f "${MESH_DIR}/mesh_token" ]]; then
    local_token=$(cat "${MESH_DIR}/mesh_token")
    if [[ -n "$local_token" && ${#local_token} -eq 160 ]]; then
      echo "Mesh token found in filesystem, using existing token"
      return 0
    fi
  fi

  # If we get here, we need to generate a new token
  echo "Generating new mesh token..."
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral --configfile ${MESH_DIR}/config.json --logintoken user//${MESH_USER}"
  mesh_token=$(node ${MESH_DIR}/node_modules/meshcentral \
    --configfile ${MESH_DIR}/config.json \
    --logintoken user//${MESH_USER})

  if [[ ${#mesh_token} -eq 160 ]]; then
    echo ${mesh_token} >${MESH_DIR}/mesh_token
    echo "Mesh token ${mesh_token} set in filesystem"
  else
    echo "Failed to generate mesh token. Fix the error and restart the mesh container"
    # exit 1
  fi

  sleep 2
}

function setup_mesh_user() {
  echo "Checking if MeshCentral user already exists..."
  echo "Setting up MeshCentral user..."

  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral --user ${MESH_USER} --pass ${MESH_PASS} --configfile ${MESH_DIR}/config.json --createaccount ${MESH_USER} --email ${MESH_USER}"
  node ${MESH_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${MESH_DIR}/config.json \
    --createaccount ${MESH_USER} \
    --email ${MESH_USER}

  sleep 2

  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral --user ${MESH_USER} --pass ${MESH_PASS} --configfile ${MESH_DIR}/config.json --adminaccount ${MESH_USER}"

  node ${MESH_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${MESH_DIR}/config.json \
    --adminaccount ${MESH_USER}

  sleep 2
}

function setup_mesh_device_group() {
  echo "Setting up MeshCentral device group with retry mechanism..."

  local max_attempts=5
  local attempt=1
  local delay=5

  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts: Checking if device group exists..."

    GROUP_CHECK=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
      --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
      --loginuser ${MESH_USER} \
      --loginpass ${MESH_PASS} \
      ListDeviceGroups 2>&1 | grep -c "${MESH_DEVICE_GROUP}" || true)

    if [ "$GROUP_CHECK" -gt 0 ]; then
      echo "MeshCentral device group ${MESH_DEVICE_GROUP} already exists, skipping creation"
      # Even if group exists, get its ID
      DEVICE_GROUP_ID=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
        --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
        --loginuser ${MESH_USER} \
        --loginpass ${MESH_PASS} \
        ListDeviceGroups 2>&1 | grep "${MESH_DEVICE_GROUP}" | awk -F',' '{print $1}' | tr -d '"')

      if [ ! -z "$DEVICE_GROUP_ID" ]; then
        echo "Device Group ID: $DEVICE_GROUP_ID"
        echo "$DEVICE_GROUP_ID" >${MESH_DIR}/mesh_device_group_id

        # Convert device group ID to MeshID format
        # Convert the base64 (with @ and $) back to standard base64
        STANDARD_BASE64=$(echo "$DEVICE_GROUP_ID" | tr '@$' '+/')
        # Convert to hex and prefix with 0x
        MESH_ID="0x$(echo "$STANDARD_BASE64" | base64 -d | xxd -p | tr -d '\n' | tr '[:lower:]' '[:upper:]')"
        echo "Mesh ID: $MESH_ID"
        echo "$MESH_ID" >"${MESH_DIR}/mesh_id"
        echo "Saved mesh ID to ${MESH_DIR}/mesh_id"
        generate_msh_file
        return 0
      fi
    else
      echo "Creating device group: ${MESH_DEVICE_GROUP}"
      node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
        --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
        --loginuser ${MESH_USER} \
        --loginpass ${MESH_PASS} \
        AddDeviceGroup \
        --name ${MESH_DEVICE_GROUP}

      sleep 2

      DEVICE_GROUP_ID=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
        --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
        --loginuser ${MESH_USER} \
        --loginpass ${MESH_PASS} \
        ListDeviceGroups 2>&1 | grep "${MESH_DEVICE_GROUP}" | awk -F',' '{print $1}' | tr -d '"')

      if [ ! -z "$DEVICE_GROUP_ID" ]; then
        echo "Device Group ID: $DEVICE_GROUP_ID"
        echo "$DEVICE_GROUP_ID" >${MESH_DIR}/mesh_device_group_id

        # Convert device group ID to MeshID format
        # Convert the base64 (with @ and $) back to standard base64
        STANDARD_BASE64=$(echo "$DEVICE_GROUP_ID" | tr '@$' '+/')
        # Convert to hex and prefix with 0x
        MESH_ID="0x$(echo "$STANDARD_BASE64" | base64 -d | xxd -p | tr -d '\n' | tr '[:lower:]' '[:upper:]')"
        echo "Mesh ID: $MESH_ID"
        echo "$MESH_ID" >"${MESH_DIR}/mesh_id"
        echo "Saved mesh ID to ${MESH_DIR}/mesh_id"
        echo "MeshCentral device group ${MESH_DEVICE_GROUP} created successfully"
        generate_msh_file
        return 0
      else
        echo "Failed to create device group, retrying in ${delay} seconds..."
        sleep $delay
        attempt=$((attempt + 1))
      fi
    fi
  done

  echo "ERROR: Failed to create MeshCentral device group after $max_attempts attempts"
  return 1
}

function start_meshcentral() {
  echo "Starting MeshCentral"
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral --configfile ${MESH_DIR}/config.json"
  node ${MESH_DIR}/node_modules/meshcentral --configfile ${MESH_DIR}/config.json
}

function stop_meshcentral() {
  echo "Stopping MeshCentral"
  pkill -f "node.*meshcentral"
}

function wait_for_meshcentral_to_start() {
  echo "Starting MeshCentral readiness check..."

  local max_attempts=10
  local attempt=1
  local delay=5

  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts: Checking MeshCentral WebSocket readiness..."

    echo "Executing ServerInfo command..."
    RESPONSE=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
      --url ${MESH_PROTOCOL}://${MESH_NGINX_HOST}:${MESH_EXTERNAL_PORT} \
      --loginuser ${MESH_USER} \
      --loginpass ${MESH_PASS} \
      ServerInfo 2>&1)

    # Extract and save ServerID from agentCertHash
    if echo "$RESPONSE" | grep -q "agentCertHash"; then
      # Extract and save ServerID from agentCertHash (without @ and $ characters)
      AGENT_CERT_HASH=$(echo "$RESPONSE" | grep "agentCertHash" | awk -F': ' '{print $2}')
      if [ ! -z "$AGENT_CERT_HASH" ]; then
        # Convert the base64 (with @ and $) back to standard base64
        SERVER_ID=$(echo "$AGENT_CERT_HASH" | tr '@$' '+/' | base64 -d | xxd -p | tr -d '\n' | tr '[:lower:]' '[:upper:]')
        echo "Server ID: $SERVER_ID"
        echo "$SERVER_ID" >"${MESH_DIR}/mesh_server_id"
        echo "Saved server ID to ${MESH_DIR}/mesh_server_id"
      fi
    fi

    if echo "$RESPONSE" | grep -q "server"; then
      echo "Level 1 passed: MeshCentral WebSocket is responsive!"
      break
    else
      echo "MeshCentral WebSocket not ready yet!"
      echo "Waiting ${delay} seconds before retrying..."
      sleep $delay
      attempt=$((attempt + 1))
    fi
  done

  if [ $attempt -gt $max_attempts ]; then
    echo "ERROR: MeshCentral WebSocket failed to become ready after $((max_attempts * delay)) seconds"
    return 1
  fi

  return 0
}

function wait_for_meshcentral_to_stop() {
  echo "Waiting for MeshCentral to stop..."
  while pgrep -f "node.*meshcentral" >/dev/null; do
    sleep 2
  done
  echo "MeshCentral has stopped"
}

function generate_msh_file() {
  echo "Generating MSH file..."

  # Read the IDs from files
  local mesh_id=$(cat "${MESH_DIR}/mesh_id")
  local server_id=$(cat "${MESH_DIR}/mesh_server_id")

  # Create the MSH file content with environment variable substitution
  cat >"${MESH_DIR}/meshagent.msh" <<EOL
MeshName=${MESH_DEVICE_GROUP}
MeshType=2
MeshID=${mesh_id}
ignoreProxyFile=1
ServerID=${server_id}
MeshServer=${MESH_PROTOCOL}://${MESH_NGINX_NAT_HOST}:${MESH_EXTERNAL_PORT}/agent.ashx
EOL

  # Make sure the file is owned by the node user
  chown node:node "${MESH_DIR}/meshagent.msh"
  chmod 644 "${MESH_DIR}/meshagent.msh"

  echo "MSH file generated at ${MESH_DIR}/meshagent.msh"

  # Display the contents of the generated file
  echo "MSH file contents:"
  cat "${MESH_DIR}/meshagent.msh"

  mkdir -p "${MESH_DIR}/nginx/openframe_public"
  cp "${MESH_DIR}/meshagent.msh" "${MESH_DIR}/nginx/openframe_public/meshagent.msh"

  echo "MSH file copied to ${MESH_DIR}/nginx/openframe_public/meshagent.msh"
}

configure_and_start_nginx() {
  echo "Configuring and starting Nginx..."
  # Create nginx config template to be processed by envsubst at runtime
  mkdir -p /etc/nginx
  
  mkdir -p ${MESH_DIR}/nginx-api/api ${MESH_DIR}/nginx-api/helpers
  
  if [ -d "/nginx-api" ]; then
    cp -r /nginx-api/* ${MESH_DIR}/nginx-api/ 2>/dev/null || true
  fi
  
  # Ensure proper permissions for API scripts
  chmod -R +x ${MESH_DIR}/nginx-api/api/*.sh 2>/dev/null || true
  chmod -R +x ${MESH_DIR}/nginx-api/helpers/*.sh 2>/dev/null || true
  
  echo "Starting fcgiwrap..."
  mkdir -p /var/run
  
  # Kill any existing fcgiwrap processes
  pkill fcgiwrap || true
  
  # Remove existing socket if present
  rm -f /var/run/fcgiwrap.socket || true
  
  # Start fcgiwrap with explicit error logging
  spawn-fcgi -s /var/run/fcgiwrap.socket -u node -g node -U nginx -G nginx -P /var/run/fcgiwrap.pid -F 1 -- /usr/bin/fcgiwrap -f 2>&1 | tee /dev/stderr &
  
  # Wait for socket creation and set permissions
  for i in {1..5}; do
    if [ -S /var/run/fcgiwrap.socket ]; then
      echo "fcgiwrap socket created successfully"
      chmod 660 /var/run/fcgiwrap.socket
      chown node:nginx /var/run/fcgiwrap.socket
      break
    fi
    echo "Waiting for fcgiwrap socket... attempt $i"
    sleep 1
  done
  
  if [ ! -S /var/run/fcgiwrap.socket ]; then
    echo "ERROR: fcgiwrap socket failed to create"
    exit 1
  fi
  
  # Test fcgiwrap socket
  echo "Testing fcgiwrap connection..."
  if ! cgi-fcgi -connect /var/run/fcgiwrap.socket /dev/null; then
    echo "ERROR: Failed to connect to fcgiwrap socket"
    exit 1
  fi
  
  # Ensure API directories exist and have correct permissions
  mkdir -p ${MESH_DIR}/nginx/openframe_public
  chown -R node:node ${MESH_DIR}/nginx-api
  chmod -R 755 ${MESH_DIR}/nginx-api
  
  envsubst '${MESH_DIR}' </nginx.conf.template >/etc/nginx/nginx.conf
  
  echo "Nginx config file: /etc/nginx/nginx.conf"
  
  # Start Nginx
  nginx &
  echo "Nginx started"
  
  # Verify nginx is running
  if ! pgrep nginx >/dev/null; then
    echo "ERROR: Nginx failed to start"
    exit 1
  fi
}
