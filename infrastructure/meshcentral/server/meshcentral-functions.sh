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
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral --user ${MESH_USER} --pass ${MESH_PASS} --configfile ${MESH_DIR}/config.json --logintokenkey"
  mesh_token=$(node ${MESH_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${MESH_DIR}/config.json \
    --logintokenkey)
  

  if [[ ${#mesh_token} -eq 160 ]]; then
    echo ${mesh_token} >${MESH_DIR}/mesh_token
    echo "Mesh token ${mesh_token} set in filesystem"
  else
    echo "Failed to generate mesh token. Fix the error and restart the mesh container"
    exit 1
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
  echo "Setting up MeshCentral device group..."

  # First check if the device group already exists
  echo "Executing: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ws://${MESH_HOST}:${MESH_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} ListDeviceGroups"
  GROUP_CHECK=$(node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
    --url ws://${MESH_HOST}:${MESH_PORT} \
    --loginuser ${MESH_USER} \
    --loginpass ${MESH_PASS} \
    ListDeviceGroups 2>&1 | grep -c "${MESH_DEVICE_GROUP}" || true)

  if [ "$GROUP_CHECK" -gt 0 ]; then
    echo "MeshCentral device group ${MESH_DEVICE_GROUP} already exists, skipping creation"
  else
    echo "Executing: node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js --url ws://${MESH_HOST}:${MESH_PORT} --loginuser ${MESH_USER} --loginpass ${MESH_PASS} AddDeviceGroup --name ${MESH_DEVICE_GROUP}"
    node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
      --url ws://${MESH_HOST}:${MESH_PORT} \
      --loginuser ${MESH_USER} \
      --loginpass ${MESH_PASS} \
      AddDeviceGroup \
      --name ${MESH_DEVICE_GROUP}

    echo "MeshCentral device group ${MESH_DEVICE_GROUP} created"
  fi

  sleep 2
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
  echo "Waiting for MeshCentral to be fully operational..."
  
  local max_attempts=30
  local attempt=1
  local delay=5

  while [ $attempt -le $max_attempts ]; do
    echo "Attempt $attempt of $max_attempts: Checking MeshCentral readiness..."
    
    # Try to get server info via meshctrl.js
    if node ${MESH_DIR}/node_modules/meshcentral/meshctrl.js \
      --url ws://${MESH_HOST}:${MESH_PORT} \
      --loginuser ${MESH_USER} \
      --loginpass ${MESH_PASS} \
      ServerInfo > /dev/null 2>&1; then
      
      echo "MeshCentral server is fully operational!"
      return 0
    fi
    
    echo "MeshCentral not ready yet, waiting ${delay} seconds..."
    sleep $delay
    
    # Increment attempt counter
    attempt=$((attempt + 1))
  done
  
  echo "ERROR: MeshCentral server failed to become ready after $((max_attempts * delay)) seconds"
  return 1
}

function wait_for_meshcentral_to_stop() {
  echo "Waiting for MeshCentral to stop..."
  while pgrep -f "node.*meshcentral" >/dev/null; do
    sleep 2
  done
  echo "MeshCentral has stopped"
}
