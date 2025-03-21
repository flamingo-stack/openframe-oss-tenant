#!/bin/bash

# Common environment variables
TACTICAL_DIR=${TACTICAL_DIR:-/opt/tactical}
export TACTICAL_DIR
TACTICAL_TMP_DIR=${TACTICAL_TMP_DIR:-/tmp/tactical}
export TACTICAL_TMP_DIR
TACTICAL_READY_FILE=${TACTICAL_READY_FILE:-/opt/tactical/tmp/tactical/ready}
export TACTICAL_READY_FILE
CUSTOM_CODE_DIR=${CUSTOM_CODE_DIR:-/opt/tactical/custom}
export CUSTOM_CODE_DIR
NATS_CONFIG=${NATS_CONFIG:-"${TACTICAL_DIR}/nats-rmm.conf"}
export NATS_CONFIG
NATS_API_CONFIG=${NATS_API_CONFIG:-"${TACTICAL_DIR}/nats-api.conf"}
export NATS_API_CONFIG
PUBLIC_DIR=/usr/share/nginx/html
export PUBLIC_DIR

# Create necessary directories
function create_directories() {
    echo "Creating necessary directories"
    mkdir -p ${TACTICAL_DIR}/api/tacticalrmm
    mkdir -p ${TACTICAL_DIR}/api/tacticalrmm/accounts
    mkdir -p ${TACTICAL_DIR}/tmp/tactical/
    mkdir -p ${TACTICAL_DIR}/api/accounts/
    mkdir -p ${TACTICAL_TMP_DIR}
    mkdir -p ${TACTICAL_DIR}/supervisor
    mkdir -p ${TACTICAL_DIR}/logs
    mkdir -p ${TACTICAL_DIR}/temp
}

# Helper function to set ready status
function set_ready_status() {
    local service_name=$1
    echo "Setting ready status for ${service_name}"
    redis-cli -h tactical-redis -p 6379 set "tactical_${service_name}_ready" "True"
    # Create directory if it doesn't exist
    mkdir -p "$(dirname "${TACTICAL_READY_FILE}")"
    echo "${service_name}" >${TACTICAL_READY_FILE}
}

# Copy and process custom code
function copy_custom_code() {
    echo "Starting to copy custom code"

    echo "Creating necessary directories"
    mkdir -p ${TACTICAL_DIR}/supervisor
    mkdir -p ${TACTICAL_DIR}/supervisor/conf.d
    mkdir -p ${TACTICAL_DIR}/supervisor/logs
    mkdir -p ${TACTICAL_DIR}/supervisor/run
    mkdir -p ${TACTICAL_DIR}/supervisor/pid
    mkdir -p ${TACTICAL_DIR}/supervisor/log
    mkdir -p ${TACTICAL_DIR}/supervisor/log/supervisor
    mkdir -p ${TACTICAL_DIR}/supervisor/log/supervisor/
    mkdir -p ${TACTICAL_DIR}/supervisor/log/supervisor/
    mkdir -p ${TACTICAL_DIR}/supervisor/log/supervisor/

    echo "Removing files"
    rm -rf ${TACTICAL_DIR}/api/tacticalrmm/local_settings.py
    rm -rf ${TACTICAL_DIR}/api/tacticalrmm/custom_settings.py
    rm -rf ${TACTICAL_DIR}/api/app.ini

    echo "Processing files with environment variables"
    envsubst <${CUSTOM_CODE_DIR}/local_settings.py >${TACTICAL_DIR}/api/tacticalrmm/local_settings.py
    envsubst <${CUSTOM_CODE_DIR}/custom_settings.py >${TACTICAL_DIR}/api/tacticalrmm/custom_settings.py
    envsubst <${CUSTOM_CODE_DIR}/app.ini >${TACTICAL_DIR}/api/app.ini
    envsubst <${CUSTOM_CODE_DIR}/supervisor.conf >${TACTICAL_DIR}/supervisor/supervisor.conf
    envsubst <${CUSTOM_CODE_DIR}/agent_listener.sh >${TACTICAL_DIR}/supervisor/agent_listener.sh
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
    echo "from accounts.models import User, APIKey; from clients.models import Client, Site; from core.models import CoreSettings; from django.utils.crypto import get_random_string; from django.utils import timezone; user = User.objects.get(username='${TRMM_USER}'); client = Client.objects.create(name='Default Organization', created_by=user) if not Client.objects.exists() else Client.objects.first(); site = Site.objects.create(client=client, name='Default Site', created_by=user) if not Site.objects.filter(client=client).exists() else Site.objects.filter(client=client).first(); api_key = APIKey.objects.create(name='Default', key=get_random_string(length=32).upper(), user=user) if not APIKey.objects.filter(user=user).exists() else APIKey.objects.filter(user=user).first(); print(f'{api_key.key}')" | python manage.py shell >${TACTICAL_DIR}/api_key.txt

    API_KEY=$(cat ${TACTICAL_DIR}/api_key.txt)

    echo "Wrote Tactical RMM API key ${API_KEY} to ${TACTICAL_DIR}/api_key.txt"

    redis-cli -h tactical-redis -p 6379 set "tactical_api_key" "${API_KEY}"
    echo "Set Tactical RMM API key ${API_KEY} in Redis"
}

function getNATSFilesFromRedis() {
    echo "Getting NATS files from Redis"
    NATS_CONFIG_CONTENT=$(redis-cli -h tactical-redis -p 6379 get "tactical_nats_rmm_conf")
    NATS_API_CONFIG_CONTENT=$(redis-cli -h tactical-redis -p 6379 get "tactical_nats_api_conf")

    echo "NATS Configuration Content:\n ${NATS_CONFIG_CONTENT}"
    echo "NATS API Configuration Content:\n ${NATS_API_CONFIG_CONTENT}"

    echo "${NATS_CONFIG_CONTENT}" >"${NATS_CONFIG}"
    echo "${NATS_API_CONFIG_CONTENT}" >"${NATS_API_CONFIG}"

    echo "${NATS_CONFIG_CONTENT}" >"${NATS_CONFIG}"
    echo "${NATS_API_CONFIG_CONTENT}" >"${NATS_API_CONFIG}"
}

function pushNATSFilesToRedis() {
    echo "Pushing NATS files to Redis"
    redis-cli -h tactical-redis -p 6379 set "tactical_nats_rmm_conf" "$(cat ${NATS_CONFIG})"
    redis-cli -h tactical-redis -p 6379 set "tactical_nats_api_conf" "$(cat ${NATS_API_CONFIG})"
}

function installNATs() {
    echo "Installing NATS Server v2.10.22 specifically"

    # Create directories if they don't exist
    mkdir -p /usr/local/bin
    mkdir -p ${TACTICAL_DIR}/logs
    mkdir -p ${TACTICAL_DIR}/supervisor

    # Clean up any existing NATS installation
    rm -f /usr/local/bin/nats-server

    # Download specific NATS version 2.10.22
    if ! wget -q https://github.com/nats-io/nats-server/releases/download/v2.10.22/nats-server-v2.10.22-linux-amd64.tar.gz -O /tmp/nats.tar.gz; then
        echo "Failed to download NATS server"
        return 1
    fi

    # Extract the NATS binary
    if ! tar -xzf /tmp/nats.tar.gz -C /tmp; then
        echo "Failed to extract NATS server"
        return 1
    fi

    # Move the binary and ensure it's executable
    if ! mv /tmp/nats-server-v2.10.22-linux-amd64/nats-server /usr/local/bin/; then
        echo "Failed to move NATS server binary"
        return 1
    fi

    chmod +x /usr/local/bin/nats-server

    # Clean up downloaded files
    rm -rf /tmp/nats.tar.gz /tmp/nats-server-v2.10.22-linux-amd64

    # Verify installation
    if ! command -v nats-server &> /dev/null; then
        echo "NATS server installation failed - binary not found in PATH"
        return 1
    fi

    echo "NATS Server version installed:"
    nats-server --version

    # Download specific NATS API version 2.10.22
    if ! wget -q https://raw.githubusercontent.com/Flamingo-CX/tacticalrmm/refs/heads/develop/natsapi/bin/nats-api -O ${TACTICAL_TMP_DIR}/nats-api; then
        echo "Failed to download NATS API"
        return 1
    fi

    if ! wget -q https://raw.githubusercontent.com/Flamingo-CX/tacticalrmm/refs/heads/develop/natsapi/bin/nats-api-arm64 -O ${TACTICAL_TMP_DIR}/nats-api-arm64; then
        echo "Failed to download NATS API ARM64"
        return 1
    fi

    # Install NATS API
    cp -rf ${TACTICAL_TMP_DIR}/nats-api /usr/local/bin/
    chmod +x /usr/local/bin/nats-api

    cp -rf ${TACTICAL_TMP_DIR}/nats-api-arm64 /usr/local/bin/
    chmod +x /usr/local/bin/nats-api-arm64

    # Verify NATS API installation
    if ! command -v nats-api &> /dev/null; then
        echo "NATS API installation failed - binary not found in PATH"
        return 1
    fi

    # Ensure NATS configuration directory exists
    mkdir -p "$(dirname "${NATS_CONFIG}")"
    mkdir -p "$(dirname "${NATS_API_CONFIG}")"

    # Get NATS configuration from Redis
    getNATSFilesFromRedis

    # Verify NATS configuration files exist and are readable
    if [ ! -f "${NATS_CONFIG}" ]; then
        echo "NATS configuration file not found at ${NATS_CONFIG}"
        return 1
    fi

    if [ ! -f "${NATS_API_CONFIG}" ]; then
        echo "NATS API configuration file not found at ${NATS_API_CONFIG}"
        return 1
    fi

    # Set proper permissions
    chown -R ${TACTICAL_USER}:${TACTICAL_USER} ${TACTICAL_DIR}/logs
    chown -R ${TACTICAL_USER}:${TACTICAL_USER} ${TACTICAL_DIR}/supervisor
    chown ${TACTICAL_USER}:${TACTICAL_USER} ${NATS_CONFIG}
    chown ${TACTICAL_USER}:${TACTICAL_USER} ${NATS_API_CONFIG}
    chmod 644 ${NATS_CONFIG}
    chmod 644 ${NATS_API_CONFIG}

    # Test NATS server configuration
    if ! nats-server --config ${NATS_CONFIG} --check; then
        echo "NATS server configuration check failed"
        return 1
    fi

    echo "NATS installation completed successfully"
}

function tactical_init() {
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
    ADMINURL="admin"
    export ADMINURL
    DJANGO_SEKRET="tacticalrmm"
    export DJANGO_SEKRET

    copy_custom_code

    if [ "$1" = 'backend' ]; then
        # run migrations and init scripts
        run_migrations

        # create super user and API key
        create_superuser_and_api_key
    fi

    if [ "$1" = 'nats' ]; then
        installNATs
    fi

    # chown everything to tactical user
    chown -R "${TACTICAL_USER}":"${TACTICAL_USER}" "${TACTICAL_DIR}"

    # create install ready file
    set_ready_status "init"
}
