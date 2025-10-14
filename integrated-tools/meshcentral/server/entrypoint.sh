#!/usr/bin/env bash

source /scripts/setup-mesh.sh
source /scripts/manage-service.sh

echo "Creating data directory"
mkdir -p ${MESH_DIR}/data

echo "Creating log directory"
mkdir -p ${MESH_DIR}/logs
mkdir -p ${MESH_DIR}/nginx-api
touch ${MESH_DIR}/nginx-api/api.log
touch ${MESH_DIR}/nginx-api/custom-msh.log
chmod 666 ${MESH_DIR}/nginx-api/api.log
chmod 666 ${MESH_DIR}/nginx-api/custom-msh.log

echo "Setting up directory permissions..."
chmod -R 755 ${MESH_DIR}  # Make all folders readable and executable
chmod -R 644 ${MESH_DIR}  # Make all files readable
chmod -R 775 ${MESH_DIR}  # Make all folders writable
chmod -R 664 ${MESH_DIR}  # Make all files writable
chmod -R 755 ${MESH_DIR}  # Make all folders executable
chmod -R 755 ${MESH_DIR}  # Make all files executable
chown -R node:node ${MESH_DIR}

echo "Substituting environment variables in config.json (excluding \$schema)"
envsubst "$(printf '${%s} ' $(env | cut -d'=' -f1 | grep -v '^schema$'))" <${MESH_TEMP_DIR}/config.json >${MESH_DIR}/config.json

echo "Installing MeshCentral..."
npm install meshcentral --prefix ${MESH_DIR} || { echo "Failed to install MeshCentral"; exit 1; }
echo "MeshCentral installation completed"

sleep 5

# Setup mesh components
setup_mesh_user

# Copy and setup API scripts
cp /nginx-api/meshcentral-api.sh ${MESH_DIR}/nginx-api/
chmod +x ${MESH_DIR}/nginx-api/meshcentral-api.sh
cp /nginx-api/generate-custom-msh.sh ${MESH_DIR}/nginx-api/
chmod +x ${MESH_DIR}/nginx-api/generate-custom-msh.sh

# Start MeshCentral temporarily to setup device group
start_meshcentral &
wait_for_meshcentral_to_start
setup_mesh_device_group
stop_meshcentral
wait_for_meshcentral_to_stop
generate_mesh_auth_args

# Start services
/scripts/setup-nginx.sh
start_meshcentral  # Start in foreground
