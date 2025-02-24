#!/usr/bin/env bash

# Helper function to set ready status
function set_ready_status() {
  local service_name=$1
  echo "Setting ready status for ${service_name}"
  echo "redis-cli -h tactical-redis -p 6379 set \"tactical_${service_name}_ready\" \"True\""
  redis-cli -h tactical-redis -p 6379 set "tactical_${service_name}_ready" "True"

  # Create directory if it doesn't exist
  mkdir -p "$(dirname "${TACTICAL_READY_FILE}")"

  echo "echo \"${service_name}\" > ${TACTICAL_READY_FILE}"
  echo "${service_name}" >${TACTICAL_READY_FILE}
}

function getNATSFilesFromRedis() {
  echo "Getting NATS files from Redis"
  NATS_CONFIG_CONTENT=$(redis-cli -h tactical-redis -p 6379 get "tactical_nats_rmm_conf")
  NATS_API_CONFIG_CONTENT=$(redis-cli -h tactical-redis -p 6379 get "tactical_nats_api_conf")

  echo "NATS_CONFIG_CONTENT: ${NATS_CONFIG_CONTENT}"
  echo "NATS_API_CONFIG_CONTENT: ${NATS_API_CONFIG_CONTENT}"

  echo "${NATS_CONFIG_CONTENT}" > "${NATS_CONFIG}"
  echo "${NATS_API_CONFIG_CONTENT}" > "${NATS_API_CONFIG}"
}

set -e

NATS_CONFIG="${TACTICAL_DIR}/nats-rmm.conf"
NATS_API_CONFIG="${TACTICAL_DIR}/nats-api.conf"
export NATS_CONFIG
export NATS_API_CONFIG

mkdir -p ${TACTICAL_DIR}

getNATSFilesFromRedis

envsubst < ${TACTICAL_TMP_DIR}/config_watcher.sh > /usr/local/bin/config_watcher.sh
chmod +x /usr/local/bin/config_watcher.sh

envsubst < ${TACTICAL_TMP_DIR}/supervisor.conf > /etc/supervisor/conf.d/supervisor.conf

cp -rf ${TACTICAL_TMP_DIR}/nats-api  /usr/local/bin/
chmod +x /usr/local/bin/nats-api

/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisor.conf &

set_ready_status "nats"

wait
