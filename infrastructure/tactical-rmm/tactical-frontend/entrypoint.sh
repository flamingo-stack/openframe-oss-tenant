#!/bin/bash
set -e

echo "Initializing environment configuration"

# Create env-config.js with proper configuration
#TODO - move to external file
cat << EOF > "${PUBLIC_DIR}/env-config.js"
window._env_ = {
  PROD_URL: "https://${API_HOST}",
  DEV_URL: "https://${API_HOST}",
  APP_URL: "https://${APP_HOST}",
  MESH_URL: "https://${MESH_HOST}",
  API_URL: "https://${API_HOST}",
  WEBSOCKET_URL: "wss://${API_HOST}/ws",
  NATS_WS_URL: "wss://${API_HOST}/natsws",
  DEMO_MODE: false
};
EOF

echo "Starting nginx"
exec nginx -g "daemon off;"