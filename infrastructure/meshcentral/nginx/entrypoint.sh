#!/bin/bash

# Generate self-signed certificate if it doesn't exist
if [ ! -f /etc/nginx/ssl/nginx.key ] || [ ! -f /etc/nginx/ssl/nginx.crt ]; then
    # Process OpenSSL configuration template
    envsubst '${MESH_NGINX_NAT_HOST}' < /tmp/openssl.cnf.template > /tmp/openssl.cnf

    # Generate private key and certificate
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout /etc/nginx/ssl/nginx.key \
        -out /etc/nginx/ssl/nginx.crt \
        -config /tmp/openssl.cnf

    # Clean up
    rm /tmp/openssl.cnf

    # Set proper permissions
    chmod 600 /etc/nginx/ssl/nginx.key
    chmod 644 /etc/nginx/ssl/nginx.crt
fi

# Copy and process configuration files
mkdir -p /etc/nginx/conf.d

# Process main nginx.conf - only replace ${VAR} format
envsubst '${MESH_HOST} ${MESH_PORT} ${MESH_NGINX_NAT_HOST}' < /tmp/nginx.conf > /etc/nginx/nginx.conf

# Process conf.d files - only replace ${VAR} format
envsubst '${MESH_HOST} ${MESH_PORT} ${MESH_NGINX_NAT_HOST}' < /tmp/conf.d/meshcentral.conf > /etc/nginx/conf.d/meshcentral.conf

# Execute CMD
exec "$@" 