#!/bin/sh
set -e

# Create required directories if they don't exist
mkdir -p /var/log/nginx
mkdir -p /var/run

# Set proper permissions
chmod -R 755 /var/log/nginx
chown -R nginx:nginx /var/log/nginx
chown -R nginx:nginx /var/run

# Ensure nginx config is valid
nginx -t

# We don't need to start nginx here as the default entrypoint will do that