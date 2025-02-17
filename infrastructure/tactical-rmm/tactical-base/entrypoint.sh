#!/usr/bin/env bash

set -e

: "${TRMM_USER:=tactical}"
: "${TRMM_PASS:=tactical}"
: "${POSTGRES_HOST:=tactical-postgres}"
: "${POSTGRES_PORT:=5432}"
: "${POSTGRES_USER:=tactical}"
: "${POSTGRES_PASS:=tactical}"
: "${POSTGRES_DB:=tacticalrmm}"
: "${MESH_SERVICE:=tactical-meshcentral}"
: "${MESH_WS_URL:=ws://${MESH_SERVICE}:4443}"
: "${MESH_USER:=meshcentral}"
: "${MESH_PASS:=meshcentralpass}"
: "${MESH_HOST:=tactical-meshcentral}"
: "${API_HOST:=tactical-backend}"
: "${APP_HOST:=tactical-frontend}"
: "${REDIS_HOST:=tactical-redis}"
: "${SKIP_UWSGI_CONFIG:=0}"
: "${TRMM_DISABLE_WEB_TERMINAL:=False}"
: "${TRMM_DISABLE_SERVER_SCRIPTS:=False}"
: "${TRMM_DISABLE_SSO:=False}"
: "${TRMM_DISABLE_2FA:=True}"
: "${TACTICAL_READY_FILE:=${TACTICAL_DIR}/tmp/tactical/ready}"

: "${CERT_PRIV_PATH:=${TACTICAL_DIR}/certs/privkey.pem}"
: "${CERT_PUB_PATH:=${TACTICAL_DIR}/certs/fullchain.pem}"

function copy_custom_code {
  # Ensure helpers.py, custom_settings.py, and views.py are properly copied
  echo "Copying helpers.py, custom_settings.py, and views.py"
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm/accounts
  mkdir -p ${TACTICAL_DIR}/tmp/tactical/
  mkdir -p ${TACTICAL_DIR}/api/accounts/
  cp -f ${CUSTOM_CODE_DIR}/helpers.py ${TACTICAL_DIR}/api/tacticalrmm/helpers.py
  cp -f ${CUSTOM_CODE_DIR}/custom_settings.py ${TACTICAL_DIR}/api/tacticalrmm/custom_settings.py
  cp -f ${CUSTOM_CODE_DIR}/views.py ${TACTICAL_DIR}/api/tacticalrmm/accounts/views.py
  cp -f ${CUSTOM_CODE_DIR}/views.py ${TACTICAL_DIR}/api/accounts/views.py
}

# Helper function to set ready status
function set_ready_status() {
  local service_name=$1
  echo "Setting ready status for ${service_name}"
  echo "redis-cli -h tactical-redis -p 6379 set \"tactical_${service_name}_ready\" \"True\""
  redis-cli -h tactical-redis -p 6379 set "tactical_${service_name}_ready" "True"
  echo "echo \"${service_name}\" > ${TACTICAL_READY_FILE}"
  echo "${service_name}" >${TACTICAL_READY_FILE}
}

function tactical-init() {

  local service_name=$1
  if [ -f "${TACTICAL_READY_FILE}" ]; then
    echo "Tactical is already initialized"
    exit 0
  fi

  # Clean up existing directories if they exist
  rm -rf "${TACTICAL_DIR}/tmp" "${TACTICAL_DIR}/certs"

  # copy container data to volume
  rsync -a --no-perms --no-owner --delete --exclude "tmp/*" --exclude "certs/*" --exclude="api/tacticalrmm/private/*" "${TACTICAL_TMP_DIR}/" "${TACTICAL_DIR}/"

  mkdir -p /meshcentral-data
  mkdir -p ${TACTICAL_DIR}/tmp
  mkdir -p ${TACTICAL_DIR}/certs
  mkdir -p ${TACTICAL_DIR}/reporting
  mkdir -p ${TACTICAL_DIR}/reporting/assets
  mkdir -p /mongo/data/db
  mkdir -p /redis/data
  touch /meshcentral-data/.initialized && chown -R 1000:1000 /meshcentral-data
  touch ${TACTICAL_DIR}/tmp/.initialized && chown -R 1000:1000 ${TACTICAL_DIR}
  touch ${TACTICAL_DIR}/certs/.initialized && chown -R 1000:1000 ${TACTICAL_DIR}/certs
  touch /mongo/data/db/.initialized && chown -R 1000:1000 /mongo/data/db
  touch /redis/data/.initialized && chown -R 1000:1000 /redis/data
  touch ${TACTICAL_DIR}/reporting && chown -R 1000:1000 ${TACTICAL_DIR}/reporting
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm/private/exe
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm/private/log
  touch ${TACTICAL_DIR}/api/tacticalrmm/private/log/django_debug.log

  # configure django settings
  MESH_TOKEN=$(redis-cli -h tactical-redis -p 6379 get mesh_token)
  ADMINURL=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 70 | head -n 1)
  DJANGO_SEKRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 80 | head -n 1)

  localvars="$(
    cat <<EOF
from .custom_settings import *

SECRET_KEY = '${DJANGO_SEKRET}'

DEBUG = False

DOCKER_BUILD = True

TRMM_PROTO = 'http'

EXE_DIR = '/opt/tactical/api/tacticalrmm/private/exe'
LOG_DIR = '/opt/tactical/api/tacticalrmm/private/log'

SCRIPTS_DIR = '/opt/tactical/community-scripts'

ALLOWED_HOSTS = ['${API_HOST}', '${APP_HOST}', 'tactical-backend', 'localhost']

ADMIN_URL = '${ADMINURL}/'

CORS_ORIGIN_WHITELIST = ['http://${APP_HOST}', 'http://localhost:8080']
CORS_ALLOW_CREDENTIALS = True

SESSION_COOKIE_DOMAIN = None
CSRF_COOKIE_DOMAIN = None
CSRF_TRUSTED_ORIGINS = ['http://${API_HOST}', 'http://${APP_HOST}', 'http://localhost:8080', 'http://localhost:8000']
CSRF_COOKIE_SAMESITE = 'Lax'
SESSION_COOKIE_SAMESITE = 'Lax'

HEADLESS_FRONTEND_URLS = {'socialaccount_login_error': 'http://${APP_HOST}/account/provider/callback'}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': '${POSTGRES_DB}',
        'USER': '${POSTGRES_USER}',
        'PASSWORD': '${POSTGRES_PASS}',
        'HOST': '${POSTGRES_HOST}',
        'PORT': '${POSTGRES_PORT}',
    }
}

MESH_USERNAME = '${MESH_USER}'
MESH_SITE = 'http://${MESH_HOST}'
MESH_TOKEN_KEY = '${MESH_TOKEN}'
REDIS_HOST    = '${REDIS_HOST}'
MESH_WS_URL = '${MESH_WS_URL}'
ADMIN_ENABLED = False
TRMM_DISABLE_WEB_TERMINAL = ${TRMM_DISABLE_WEB_TERMINAL}
TRMM_DISABLE_SERVER_SCRIPTS = ${TRMM_DISABLE_SERVER_SCRIPTS}
TRMM_DISABLE_SSO = ${TRMM_DISABLE_SSO}
TRMM_DISABLE_2FA = True

# Disable SSL/TLS
USE_NATS_STANDARD = False
NATS_PROTOCOL = 'nats'
NATS_HTTP_PROTOCOL = 'http'
NATS_WS_PROTOCOL = 'ws'

# Certificate paths for NATS
CERT_FILE = '${CERT_PUB_PATH}'
KEY_FILE = '${CERT_PRIV_PATH}'
EOF
  )"

  echo "${localvars}" >${TACTICAL_DIR}/api/tacticalrmm/local_settings.py

  copy_custom_code

  if [ "$1" = 'backend' ]; then
    echo "Running migrations and init scripts"
    # run migrations and init scripts
    python manage.py pre_update_tasks
    python manage.py migrate --no-input
    python manage.py generate_json_schemas
    python manage.py get_webtar_url >${TACTICAL_DIR}/tmp/web_tar_url
    python manage.py collectstatic --no-input
    python manage.py initial_db_setup
    python manage.py initial_mesh_setup
    python manage.py load_chocos
    python manage.py load_community_scripts
    python manage.py reload_nats
    python manage.py create_natsapi_conf

    if [ "$SKIP_UWSGI_CONFIG" = 0 ]; then
      python manage.py create_uwsgi_conf
      # Add HTTP protocol to uWSGI config
      echo "protocol = http" >>${TACTICAL_DIR}/api/app.ini
    fi

    python manage.py create_installer_user
    python manage.py clear_redis_celery_locks
    python manage.py post_update_tasks

    # create super user
    echo "Creating dashboard user if it doesn't exist"
    if [ "$TRMM_DISABLE_2FA" = "True" ]; then
      echo "from accounts.models import User, Role; user = User.objects.create_superuser('${TRMM_USER}', 'admin@example.com', '${TRMM_PASS}') if not User.objects.filter(username='${TRMM_USER}').exists() else User.objects.get(username='${TRMM_USER}'); user.totp_key = ''; role = Role.objects.create(name='Default Admin', can_manage_api_keys=True) if not Role.objects.filter(name='Default Admin').exists() else Role.objects.get(name='Default Admin'); user.role = role; user.save();" | python manage.py shell
    else
      echo "from accounts.models import User, Role; user = User.objects.create_superuser('${TRMM_USER}', 'admin@example.com', '${TRMM_PASS}') if not User.objects.filter(username='${TRMM_USER}').exists() else User.objects.get(username='${TRMM_USER}'); role = Role.objects.create(name='Default Admin', can_manage_api_keys=True) if not Role.objects.filter(name='Default Admin').exists() else Role.objects.get(name='Default Admin'); user.role = role; user.save();" | python manage.py shell
    fi

    # create default organization and API key
    echo "Creating default organization and API key"
    echo "from accounts.models import User, APIKey; from clients.models import Client, Site; from core.models import CoreSettings; from django.utils.crypto import get_random_string; from django.utils import timezone; user = User.objects.get(username='${TRMM_USER}'); client = Client.objects.create(name='Default Organization', created_by=user) if not Client.objects.exists() else Client.objects.first(); site = Site.objects.create(client=client, name='Default Site', created_by=user) if not Site.objects.filter(client=client).exists() else Site.objects.filter(client=client).first(); api_key = APIKey.objects.create(name='Default', key=get_random_string(length=32).upper(), user=user) if not APIKey.objects.filter(user=user).exists() else APIKey.objects.filter(user=user).first(); print(f'API Key: {api_key.key}')" | python manage.py shell >${TACTICAL_DIR}/tmp/api_key.txt
    redis-cli -h tactical-redis -p 6379 set "tactical_api_key" "$(cat ${TACTICAL_DIR}/tmp/api_key.txt)"
  fi

  # chown everything to tactical user
  chown -R "${TACTICAL_USER}":"${TACTICAL_USER}" "${TACTICAL_DIR}"

  # create install ready file
  set_ready_status "init"
}

# backend container
if [ "$1" = 'tactical-backend' ]; then
  tactical-init "backend"
  set_ready_status "backend"
  uwsgi ${TACTICAL_DIR}/api/app.ini
fi

if [ "$1" = 'tactical-celery' ]; then
  tactical-init "celery"
  set_ready_status "celery"
  celery -A tacticalrmm worker --autoscale=20,2 -l info
fi

if [ "$1" = 'tactical-celerybeat' ]; then
  test -f "${TACTICAL_DIR}/api/celerybeat.pid" && rm "${TACTICAL_DIR}/api/celerybeat.pid"
  tactical-init "celerybeat"
  set_ready_status "celerybeat"
  celery -A tacticalrmm beat -l info
fi

# websocket container
if [ "$1" = 'tactical-websockets' ]; then
  export DJANGO_SETTINGS_MODULE=tacticalrmm.settings
  tactical-init "websockets"
  set_ready_status "websockets"
  uvicorn --host 0.0.0.0 --port 8383 --forwarded-allow-ips='*' tacticalrmm.asgi:application
fi
