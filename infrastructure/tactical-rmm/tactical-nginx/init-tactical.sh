#!/bin/sh
set -e

# Create required directories if they don't exist
mkdir -p /var/log/nginx
mkdir -p /var/run
mkdir -p /etc/nginx/conf.d

# Set proper permissions
chmod -R 755 /var/log/nginx
chown -R nginx:nginx /var/log/nginx
chown -R nginx:nginx /var/run

# Process main nginx.conf - only replace ${VAR} format
envsubst '${NGINX_HOST_IP} ${NGINX_HOST_PORT}' < /tmp/nginx.conf > /etc/nginx/nginx.conf

# Process conf.d files - only replace ${VAR} format
envsubst '${API_HOST} ${APP_HOST} ${NGINX_HOST_IP} ${NGINX_HOST_PORT}' < /tmp/conf.d/default.conf > /etc/nginx/conf.d/default.conf

# Ensure nginx config is valid
nginx -t

# We don't need to start nginx here as the default entrypoint will do that