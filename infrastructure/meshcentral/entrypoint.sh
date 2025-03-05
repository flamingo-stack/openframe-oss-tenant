#!/usr/bin/env bash

set -e

source /meshcentral-functions.sh

if [ ! -f "${MESH_DIR}/mesh_token" ]; then
  echo "Creating data directory"
  mkdir -p ${MESH_DIR}/data

  echo "Creating log file"
  mkdir -p ${MESH_DIR}/logs

  echo "Substituting environment variables in config.json"
  envsubst <${MESH_TEMP_DIR}/config.json >${MESH_DIR}/config.json

  echo "Copying disable-origin-check.patch"
  cp -rf ${MESH_TEMP_DIR}/disable-origin-check.patch ${MESH_DIR}/disable-origin-check.patch

  echo "Making all folders readable by node"
  chmod -R 755 ${MESH_DIR}

  echo "Making all files readable by node"
  chmod -R 644 ${MESH_DIR}

  echo "Making all folders writable by node"
  chmod -R 775 ${MESH_DIR}

  echo "Making all files writable by node"
  chmod -R 664 ${MESH_DIR}

  echo "Making all folders executable by node"
  chmod -R 755 ${MESH_DIR}

  echo "Making all files executable by node"
  chmod -R 755 ${MESH_DIR}

  echo "Setting the owner of all files and folders to node"
  chown -R node:node ${MESH_DIR}

  #install meshcentral under ${MESH_DIR}/node_modules
  echo "Installing MeshCentral..."
  npm install meshcentral --prefix ${MESH_DIR} --no-start || { echo "Failed to install MeshCentral"; exit 1; }
  echo "MeshCentral installation completed"

  # Setup the user
  setup_mesh_user

  # Start MeshCentral in the background
  start_meshcentral &

  # Wait for MeshCentral to be ready
  wait_for_meshcentral_to_start

  # Setup the token
  setup_mesh_token

  # Setup the device group
  setup_mesh_device_group

  # Apply the origin check patch
  echo "Applying origin check patch..."
  bash ${MESH_DIR}/disable-origin-check.patch

  # Kill the background MeshCentral process
  stop_meshcentral

  # Wait for MeshCentral to stop
  wait_for_meshcentral_to_stop
fi

# Start MeshCentral in the foreground
start_meshcentral
