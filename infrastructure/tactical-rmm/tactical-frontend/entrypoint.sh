#!/bin/sh

set -e

source /common-functions.sh

create_directories

# Replace environment variables in env-config.js
envsubst < /env-config.js > "${PUBLIC_DIR}/env-config.js"

# Start nginx
exec nginx -g "daemon off;"