#!/bin/bash
set -e

if mongosh --authenticationDatabase "admin" \
    --username "${MONGO_INITDB_ROOT_USERNAME}" \
    --password "${MONGO_INITDB_ROOT_PASSWORD}" \
    --eval "db.adminCommand('ping').ok" --quiet | grep -q "^1$"; then
  exit 0
fi

# Fallback for the very first start (localhost exception)
if mongosh --eval "db.adminCommand('ping').ok" --quiet | grep -q "^1$"; then
  exit 0
fi

exit 1
