#!/usr/bin/env bash

set -e

source /common-functions.sh

create_directories

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

  echo "Content of config.json after substitution:"
  cat ${TACTICAL_DIR}/config.json

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

# Apply the origin check patch
echo "Applying origin check patch..."
bash /disable-origin-check.patch

# Start MeshCentral in the foreground
start_meshcentral
