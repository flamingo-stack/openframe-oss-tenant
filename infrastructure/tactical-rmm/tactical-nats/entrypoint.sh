#!/usr/bin/env bash

set -e

source /common-functions.sh

create_directories

getNATSFilesFromRedis

envsubst < ${TACTICAL_TMP_DIR}/config_watcher.sh > /usr/local/bin/config_watcher.sh
chmod +x /usr/local/bin/config_watcher.sh

envsubst < ${TACTICAL_TMP_DIR}/supervisor.conf > /etc/supervisor/conf.d/supervisor.conf

cp -rf ${TACTICAL_TMP_DIR}/nats-api  /usr/local/bin/
chmod +x /usr/local/bin/nats-api

/usr/bin/supervisord -c /etc/supervisor/conf.d/supervisor.conf &

set_ready_status "nats"

wait
