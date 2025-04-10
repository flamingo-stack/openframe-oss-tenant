#!/usr/bin/env bash

set -e

source /meshcentral-functions.sh

if [ ! -f "${MESH_DIR}/mesh_token" ]; then
  echo "Creating data directory"
  mkdir -p ${MESH_DIR}/data

  echo "Creating log file"
  mkdir -p ${MESH_DIR}/logs

  echo "Substituting environment variables in config.json (excluding \$schema)"
  envsubst "$(printf '${%s} ' $(env | cut -d'=' -f1 | grep -v '^schema$'))" <${MESH_TEMP_DIR}/config.json >${MESH_DIR}/config.json

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
  npm install meshcentral --prefix ${MESH_DIR} || { echo "Failed to install MeshCentral"; exit 1; }
  echo "MeshCentral installation completed"

  sleep 5
  
  # Setup the user
  setup_mesh_user

  # Copy the API files
  cp -rf /nginx-api ${MESH_DIR}

  # Make the API files executable
  chmod -R 755 ${MESH_DIR}/nginx-api

  # Make the API files executable
  chmod -R +x ${MESH_DIR}/nginx-api/api/* ${MESH_DIR}/nginx-api/helpers/*

  # Start MeshCentral in the background
  start_meshcentral &

  # Wait for MeshCentral to be ready
  wait_for_meshcentral_to_start

  # Setup the device group
  setup_mesh_device_group

  # Setup the token
  setup_mesh_token

  # Kill the background MeshCentral process
  stop_meshcentral  

  # Wait for MeshCentral to stop
  wait_for_meshcentral_to_stop
fi

# Start Nginx
configure_and_start_nginx

# Start MeshCentral in the foreground
start_meshcentral
