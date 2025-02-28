#!/usr/bin/env bash

set -e

source /common-functions.sh

create_directories

# backend container
if [ "$1" = 'tactical-backend' ]; then
  tactical_init "backend"
  pushNATSFilesToRedis
  set_ready_status "backend"
  uwsgi ${TACTICAL_DIR}/api/app.ini
fi

if [ "$1" = 'tactical-celery' ]; then
  tactical_init "celery"
  getNATSFilesFromRedis
  set_ready_status "celery"
  celery -A tacticalrmm worker --autoscale=20,2 -l info
fi

if [ "$1" = 'tactical-celerybeat' ]; then
  test -f "${TACTICAL_DIR}/api/celerybeat.pid" && rm "${TACTICAL_DIR}/api/celerybeat.pid"
  tactical_init "celerybeat"
  getNATSFilesFromRedis
  set_ready_status "celerybeat"
  celery -A tacticalrmm beat -l info
fi

# websocket container
if [ "$1" = 'tactical-websockets' ]; then
  export DJANGO_SETTINGS_MODULE=tacticalrmm.settings
  tactical_init "websockets"
  getNATSFilesFromRedis
  set_ready_status "websockets"
  uvicorn --host 0.0.0.0 --port 8383 --forwarded-allow-ips='*' tacticalrmm.asgi:application
fi

# nats server
if [ "$1" = 'tactical-nats' ]; then
  tactical_init "nats"
  set_ready_status "nats"
  /usr/bin/supervisord -c ${TACTICAL_DIR}/supervisor/supervisor.conf 
fi