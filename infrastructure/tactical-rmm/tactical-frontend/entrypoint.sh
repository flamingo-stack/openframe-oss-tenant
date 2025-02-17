#!/bin/sh
#
# https://www.freecodecamp.org/news/how-to-implement-runtime-environment-variables-with-create-react-app-docker-and-nginx-7f9d42a91d70/
#
set -e

# Set default values for environment variables
: "${PUBLIC_DIR:=/usr/share/nginx/html}"
: "${TRMM_PROTO:=http}"
: "${API_HOST:=localhost:8000}"
: "${NODE_ENV:=development}"
: "${DOCKER_BUILD:=false}"
: "${WS_PROTO:=ws}"

# Replace environment variables in env-config.js
envsubst < /env-config.js > "${PUBLIC_DIR}/env-config.js"

# Start nginx
exec nginx -g "daemon off;"