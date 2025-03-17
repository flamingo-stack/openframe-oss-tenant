#!/bin/sh
set -e

# Run the configuration injection script
node /usr/local/bin/inject-config.js

# Execute the main command (nginx)
exec "$@"