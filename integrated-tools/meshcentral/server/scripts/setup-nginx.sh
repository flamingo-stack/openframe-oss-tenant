#!/bin/bash

# Setup basic directories and files
mkdir -p /etc/nginx ${MESH_DIR}/nginx-api/{api,helpers} /var/run

# Copy and set permissions for API files
if [ -d "/nginx-api" ]; then
    cp -r /nginx-api/* ${MESH_DIR}/nginx-api/
    # Make sure scripts are executable and owned by node user
    chown -R node:node ${MESH_DIR}/nginx-api
    chmod -R 755 ${MESH_DIR}/nginx-api
    chmod +x ${MESH_DIR}/nginx-api/api/*.sh ${MESH_DIR}/nginx-api/helpers/*.sh
fi

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

# Generate nginx config from template
envsubst '${MESH_DIR} ${MESH_USER} ${MESH_PASS} ${MESH_PROTOCOL} ${MESH_NGINX_HOST} ${MESH_EXTERNAL_PORT}' </nginx.conf.template >/etc/nginx/nginx.conf

# Start nginx
nginx 