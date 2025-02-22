#!/usr/bin/env bash

set -e

TACTICAL_DIR=/opt/tactical
export TACTICAL_DIR
TACTICAL_TEMP_DIR=/tmp/tactical
export TACTICAL_TEMP_DIR

setup_mesh_token() {
  echo "Generating mesh token..."
  mesh_token=$(node ${TACTICAL_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${TACTICAL_DIR}/config.json \
    --logintokenkey)

  if [[ ${#mesh_token} -eq 160 ]]; then
    echo ${mesh_token} >${TACTICAL_DIR}/mesh_token
    redis-cli -h tactical-redis -p 6379 set mesh_token ${mesh_token}
    echo "Mesh token ${mesh_token} set in redis under key mesh_token"
  else
    echo "Failed to generate mesh token. Fix the error and restart the mesh container"
    exit 1
  fi
}

setup_mesh_user() {
  echo "Setting up MeshCentral user..."

  node ${TACTICAL_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${TACTICAL_DIR}/config.json \
    --createaccount ${MESH_USER} \
    --email ${MESH_USER}
  sleep 1

  node ${TACTICAL_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${TACTICAL_DIR}/config.json \
    --adminaccount ${MESH_USER}
  sleep 1
}

setup_mesh_device_group() {

  echo "Setting up MeshCentral device group..."

  node ${TACTICAL_DIR}/node_modules/meshcentral/meshctrl.js \
    --url ${WS_PROTO}://${MESH_SERVICE}:${MESH_PORT} \
    --loginuser ${MESH_USER} \
    --loginpass ${MESH_PASS} \
    AddDeviceGroup \
    --name ${MESH_DEVICE_GROUP}

  echo "MeshCentral device group ${MESH_DEVICE_GROUP} set up"

  sleep 1
}

start_meshcentral() {
  echo "Starting MeshCentral"
  node ${TACTICAL_DIR}/node_modules/meshcentral \
    --user ${MESH_USER} \
    --pass ${MESH_PASS} \
    --configfile ${TACTICAL_DIR}/config.json
}

stop_meshcentral() {
  echo "Stopping MeshCentral"
  pkill -f "node.*meshcentral"
}

wait_for_meshcentral_to_start() {
  echo "Waiting for MeshCentral to be ready..."
  while ! curl -s http://localhost:${MESH_PORT}/health.ashx >/dev/null; do
    sleep 2
  done
  echo "MeshCentral is up!"
}

wait_for_meshcentral_to_stop() {
  echo "Waiting for MeshCentral to stop..."
  while pgrep -f "node.*meshcentral" >/dev/null; do
    sleep 2
  done
  echo "MeshCentral has stopped"
}

# If the config file does not exist or the MESH_PERSISTENT_CONFIG environment variable is set to 0, copy the files from the temporary directory to the Tactical directory
if [ ! -f "${TACTICAL_DIR}/config.json" ] || [[ "${MESH_PERSISTENT_CONFIG}" -eq 0 ]]; then

  echo "Copying files from ${TACTICAL_TEMP_DIR} to ${TACTICAL_DIR}"
  cp -rf ${TACTICAL_TEMP_DIR}/* ${TACTICAL_DIR}

  echo "Creating data directory"
  mkdir -p ${TACTICAL_DIR}/data
  chown -R node:node ${TACTICAL_DIR}

  echo "Creating log file"
  mkdir -p ${TACTICAL_DIR}/logs

  ENCODED_URI=$(node -p "encodeURI('mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@tactical-mongodb:27017')")
  export ENCODED_URI

  echo "Substituting environment variables in config.json"
  envsubst <${TACTICAL_TEMP_DIR}/config.json >${TACTICAL_DIR}/config.json

  echo "Making all folders readable by node"
  chmod -R 755 ${TACTICAL_DIR}

  echo "Making all files readable by node"
  chmod -R 644 ${TACTICAL_DIR}

  echo "Making all folders writable by node"
  chmod -R 775 ${TACTICAL_DIR}

  echo "Making all files writable by node"
  chmod -R 664 ${TACTICAL_DIR}

  echo "Making all folders executable by node"
  chmod -R 755 ${TACTICAL_DIR}

  echo "Making all files executable by node"
  chmod -R 755 ${TACTICAL_DIR}

  echo "Setting the owner of all files and folders to node"
  chown -R node:node ${TACTICAL_DIR}
fi

if [ ! -f "${TACTICAL_DIR}/mesh_token" ]; then

  # Setup the token
  setup_mesh_token

  # Setup the user
  setup_mesh_user

  # Start MeshCentral in the background
  start_meshcentral &

  # Wait for MeshCentral to be ready
  wait_for_meshcentral_to_start

  # Setup the device group  
  setup_mesh_device_group

  # Kill the background MeshCentral process
  stop_meshcentral

  # Wait for MeshCentral to stop
  wait_for_meshcentral_to_stop

fi

# Start MeshCentral in the foreground
start_meshcentral
