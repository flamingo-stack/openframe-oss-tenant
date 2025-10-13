#!/bin/bash

# Setup basic directories and files
mkdir -p /etc/nginx ${MESH_DIR}/nginx-api /var/run

# Copy and set permissions for API scripts
if [ -f "/nginx-api/meshcentral-api.sh" ]; then
    cp /nginx-api/meshcentral-api.sh ${MESH_DIR}/nginx-api/
    chmod +x ${MESH_DIR}/nginx-api/meshcentral-api.sh
fi

if [ -f "/nginx-api/generate-custom-msh.sh" ]; then
    cp /nginx-api/generate-custom-msh.sh ${MESH_DIR}/nginx-api/
    chmod +x ${MESH_DIR}/nginx-api/generate-custom-msh.sh
fi

# Make sure scripts are executable and owned by node user
chown -R node:node ${MESH_DIR}/nginx-api
chmod -R 755 ${MESH_DIR}/nginx-api

# Start fcgiwrap
echo "[meshcentral] Starting fcgiwrap..."
spawn-fcgi -s /var/run/fcgiwrap.socket \
    -u node -g node -U node -G node \
    -P /var/run/fcgiwrap.pid \
    -- /usr/bin/fcgiwrap -f -c 5 &

# Wait briefly for socket creation
for i in {1..5}; do
    if [ -S "/var/run/fcgiwrap.socket" ]; then
        chmod 660 /var/run/fcgiwrap.socket
        chown node:node /var/run/fcgiwrap.socket
        break
    fi
    echo "[meshcentral] Waiting for socket file (attempt $i)..."
    sleep 1
done

if [ ! -S "/var/run/fcgiwrap.socket" ]; then
    echo "[meshcentral] ERROR: fcgiwrap socket was not created after 5 seconds"
    exit 1
fi

# Make sure nginx directories are owned by node user
chown -R node:node /etc/nginx /var/log/nginx 2>/dev/null || true

#pick up the mesh_auth_base64 file
export MESH_USER_ENCODED=$(cat ${MESH_DIR}/mesh_user_encoded)
export MESH_PASS_ENCODED=$(cat ${MESH_DIR}/mesh_pass_encoded)

# Generate nginx config from template
envsubst '${MESH_PASS_ENCODED} ${MESH_USER_ENCODED} ${MESH_DIR} ${MESH_USER} ${MESH_PASS} ${MESH_PROTOCOL} ${MESH_NGINX_HOST} ${MESH_EXTERNAL_PORT} ${MESH_DEVICE_GROUP}' </nginx.conf.template >/etc/nginx/nginx.conf

# Start nginx
nginx 