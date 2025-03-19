#!/bin/sh
set -e

# Debug: Print environment variables
echo "Current environment variables:"
echo "VITE_API_URL: $VITE_API_URL"
echo "VITE_GATEWAY_URL: $VITE_GATEWAY_URL"
echo "VITE_CLIENT_ID: $VITE_CLIENT_ID"

# Run the configuration injection script
node /usr/local/bin/inject-config.js

# Execute the main command (nginx)
exec "$@"