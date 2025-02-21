#!/usr/bin/env bash

set -e

TACTICAL_DIR=/opt/tactical
export TACTICAL_DIR
TACTICAL_TEMP_DIR=/tmp/tactical
export TACTICAL_TEMP_DIR

if [ ! -f "${TACTICAL_DIR}/app/meshcentral-data/config.json" ] || [[ "${MESH_PERSISTENT_CONFIG}" -eq 0 ]]; then

  echo "Copying files from ${TACTICAL_TEMP_DIR} to ${TACTICAL_DIR}"
  cp -rf ${TACTICAL_TEMP_DIR}/* ${TACTICAL_DIR}

  mkdir -p ${TACTICAL_DIR}/app/meshcentral-data
  mkdir -p ${TACTICAL_DIR}/app/meshcentral-data/logs
  chown -R node:node ${TACTICAL_DIR}

  ENCODED_URI=$(node -p "encodeURI('mongodb://${MONGODB_USER}:${MONGODB_PASSWORD}@tactical-mongodb:27017')")
  export ENCODED_URI

  envsubst < ${TACTICAL_TEMP_DIR}/config.json > ${TACTICAL_DIR}/app/meshcentral-data/config.json
fi

if [ ! -f "${TACTICAL_DIR}/mesh_token" ]; then
  node ${TACTICAL_DIR}/node_modules/meshcentral --createaccount ${MESH_USER} --pass ${MESH_PASS} --email ${SMTP_USER}
  node ${TACTICAL_DIR}/node_modules/meshcentral --adminaccount ${MESH_USER}
  node ${TACTICAL_DIR}/node_modules/meshcentral --creategroup ${MESH_DEVICE_GROUP}
  mesh_token=$(node node_modules/meshcentral --logintokenkey)

  if [[ ${#mesh_token} -eq 160 ]]; then
    echo ${mesh_token} >${TACTICAL_DIR}/mesh_token
    redis-cli -h tactical-redis -p 6379 set mesh_token ${mesh_token}
    echo "Mesh token ${mesh_token} set in redis under key mesh_token"
  else
    echo "Failed to generate mesh token. Fix the error and restart the mesh container"
  fi
fi

# Create log file and set permissions
touch ${TACTICAL_DIR}/app/meshcentral-data/logs/meshcentral.log
chown node:node ${TACTICAL_DIR}/app/meshcentral-data/logs/meshcentral.log

node ${TACTICAL_DIR}/node_modules/meshcentral --configfile ${TACTICAL_DIR}/app/meshcentral-data/config.json
