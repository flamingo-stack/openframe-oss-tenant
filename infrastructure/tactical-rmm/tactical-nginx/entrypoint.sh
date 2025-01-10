#!/bin/bash
set -e

# Function to substitute environment variables in configuration files
envsubst_nginx_conf() {
    local conf_file=$1
    # Create a temporary file
    local temp_file=$(mktemp)
    # Replace variables in the configuration file
    envsubst '${API_HOST} ${APP_HOST} ${MESH_HOST} ${BACKEND_SERVICE} ${FRONTEND_SERVICE} ${MESH_SERVICE} ${WEBSOCKETS_SERVICE} ${NATS_SERVICE}' < "$conf_file" > "$temp_file"
    # Move the temporary file back to the original
    cat "$temp_file" > "$conf_file"
    rm -f "$temp_file"
}

# Generate self-signed certificates if not provided
if [ ! -f "/opt/tactical/certs/public.crt" ] || [ ! -f "/opt/tactical/certs/private.key" ]; then
    echo "Generating self-signed certificates..."
    mkdir -p /opt/tactical/certs
    openssl req -x509 -nodes -days 3650 -newkey rsa:2048 \
        -keyout /opt/tactical/certs/private.key \
        -out /opt/tactical/certs/public.crt \
        -subj "/CN=${APP_HOST}"
    chmod 644 /opt/tactical/certs/public.crt
    chmod 600 /opt/tactical/certs/private.key
fi

# Process NGINX configuration files
echo "Processing NGINX configuration files..."
for conf_file in /etc/nginx/conf.d/*.conf; do
    envsubst_nginx_conf "$conf_file"
done

# Start NGINX
echo "Starting NGINX..."
exec nginx -g "daemon off;"
