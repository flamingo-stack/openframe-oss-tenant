#!/usr/bin/env bash

set -e

function copy_custom_code {
  echo "Starting to copy custom code"

  echo "Creating necessary directories"
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm
  mkdir -p ${TACTICAL_DIR}/api/tacticalrmm/accounts
  mkdir -p ${TACTICAL_DIR}/tmp/tactical/
  mkdir -p ${TACTICAL_DIR}/api/accounts/

  echo "Removing files"
  rm -rf ${TACTICAL_DIR}/api/tacticalrmm/helpers.py
  rm -rf ${TACTICAL_DIR}/api/tacticalrmm/accounts/views.py
  rm -rf ${TACTICAL_DIR}/api/accounts/views.py
  rm -rf ${TACTICAL_DIR}/api/tacticalrmm/local_settings.py
  rm -rf ${TACTICAL_DIR}/api/tacticalrmm/custom_settings.py
  rm -rf ${TACTICAL_DIR}/api/app.ini

  echo "Processing files with environment variables"
  envsubst <${CUSTOM_CODE_DIR}/helpers.py >${TACTICAL_DIR}/api/tacticalrmm/helpers.py
  envsubst <${CUSTOM_CODE_DIR}/views.py >${TACTICAL_DIR}/api/tacticalrmm/accounts/views.py
  envsubst <${CUSTOM_CODE_DIR}/views.py >${TACTICAL_DIR}/api/accounts/views.py
  envsubst <${CUSTOM_CODE_DIR}/local_settings.py >${TACTICAL_DIR}/api/tacticalrmm/local_settings.py
  envsubst <${CUSTOM_CODE_DIR}/custom_settings.py >${TACTICAL_DIR}/api/tacticalrmm/custom_settings.py
  envsubst <${CUSTOM_CODE_DIR}/app.ini >${TACTICAL_DIR}/api/app.ini
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

function run_migrations() {
  # run migrations and init scripts
  echo "Running migrations and init scripts"

  echo "Running pre_update_tasks"
  python manage.py pre_update_tasks

  echo "Running migrate"
  python manage.py migrate --no-input

  echo "Generating json schemas"
  python manage.py generate_json_schemas

  echo "Getting web tar url"
  python manage.py get_webtar_url >${TACTICAL_DIR}/tmp/web_tar_url

  echo "Collecting static files"
  python manage.py collectstatic --no-input

  echo "Running initial_db_setup"
  python manage.py initial_db_setup

  echo "Running initial_mesh_setup"
  python manage.py initial_mesh_setup

  echo "Loading chocos"
  python manage.py load_chocos

  echo "Loading community scripts"
  python manage.py load_community_scripts

  echo "Reloading nats"
  python manage.py reload_nats

  echo "Creating natsapi conf"
  python manage.py create_natsapi_conf

  echo "Creating installer user"
  python manage.py create_installer_user

  echo "Clearing redis celery locks"
  python manage.py clear_redis_celery_locks

  echo "Running post_update_tasks"
  python manage.py post_update_tasks

  echo "Checking mesh"
  python manage.py check_mesh
}

function create_superuser_and_api_key() {
  # create super user
  echo "Creating dashboard user if it doesn't exist"
  if [ "$TRMM_DISABLE_2FA" = "True" ]; then
    echo "from accounts.models import User, Role; user = User.objects.create_superuser('${TRMM_USER}', 'admin@example.com', '${TRMM_PASS}') if not User.objects.filter(username='${TRMM_USER}').exists() else User.objects.get(username='${TRMM_USER}'); user.totp_key = ''; role = Role.objects.create(name='Default Admin', can_manage_api_keys=True) if not Role.objects.filter(name='Default Admin').exists() else Role.objects.get(name='Default Admin'); user.role = role; user.save();" | python manage.py shell
  else
    echo "from accounts.models import User, Role; user = User.objects.create_superuser('${TRMM_USER}', 'admin@example.com', '${TRMM_PASS}') if not User.objects.filter(username='${TRMM_USER}').exists() else User.objects.get(username='${TRMM_USER}'); role = Role.objects.create(name='Default Admin', can_manage_api_keys=True) if not Role.objects.filter(name='Default Admin').exists() else Role.objects.get(name='Default Admin'); user.role = role; user.save();" | python manage.py shell
  fi

  # create default organization and API key
  echo "Creating default organization and API key"
  echo "from accounts.models import User, APIKey; from clients.models import Client, Site; from core.models import CoreSettings; from django.utils.crypto import get_random_string; from django.utils import timezone; user = User.objects.get(username='${TRMM_USER}'); client = Client.objects.create(name='Default Organization', created_by=user) if not Client.objects.exists() else Client.objects.first(); site = Site.objects.create(client=client, name='Default Site', created_by=user) if not Site.objects.filter(client=client).exists() else Site.objects.filter(client=client).first(); api_key = APIKey.objects.create(name='Default', key=get_random_string(length=32).upper(), user=user) if not APIKey.objects.filter(user=user).exists() else APIKey.objects.filter(user=user).first(); print(f'{api_key.key}')" | python manage.py shell >${TACTICAL_DIR}/tmp/api_key.txt
  redis-cli -h tactical-redis -p 6379 set "tactical_api_key" "$(cat ${TACTICAL_DIR}/tmp/api_key.txt)"
}

function tactical-init() {

  local service_name=$1
  if [ -f "${TACTICAL_READY_FILE}" ]; then
    echo "Tactical is already initialized"
    return 0
  fi

  # Clean up existing directories if they exist
  rm -rf "${TACTICAL_DIR}/tmp" "${TACTICAL_DIR}/certs"

  # copy container data to volume
  rsync -a --no-perms --no-owner --delete --exclude "tmp/*" --exclude "certs/*" --exclude="api/tacticalrmm/private/*" "${TACTICAL_TMP_DIR}/" "${TACTICAL_DIR}/"

  mkdir -p ${TACTICAL_DIR}/tmp ${TACTICAL_DIR}/certs ${TACTICAL_DIR}/reporting/assets ${TACTICAL_DIR}/api/tacticalrmm/private/exe ${TACTICAL_DIR}/api/tacticalrmm/private/log
  touch ${TACTICAL_DIR}/api/tacticalrmm/private/log/django_debug.log

  # configure django settings
  MESH_TOKEN=$(redis-cli -h tactical-redis -p 6379 get mesh_token)
  export MESH_TOKEN
  ADMINURL=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 70 | head -n 1)
  export ADMINURL
  DJANGO_SEKRET=$(cat /dev/urandom | tr -dc 'a-zA-Z0-9' | fold -w 80 | head -n 1)
  export DJANGO_SEKRET

  copy_custom_code

  if [ "$1" = 'backend' ]; then
    # run migrations and init scripts
    run_migrations

    # create super user and API key
    create_superuser_and_api_key
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
