#!/bin/bash
set -e

echo "Initializing environment configuration"

# Create env-config.js directly
printf 'window._env_ = {
  PROD_URL: "%s",
  DEV_URL: "%s",
  APP_URL: "%s",
  MESH_URL: "%s"
};\n' "${API_HOST}" "${API_HOST}" "${APP_HOST}" "${MESH_HOST}" > "${PUBLIC_DIR}/env-config.js"

# Start nginx
exec nginx -g "daemon off;"