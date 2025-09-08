#!/bin/bash
set -e

# Use MONGODB_HOST if set, otherwise default to localhost
DB_HOST="${MONGODB_HOST:-127.0.0.1}"
MONGODB_PORT="${MONGODB_PORT:-27017}"

if mongosh --host ${DB_HOST}:${MONGODB_PORT}  \
    --authenticationDatabase "admin" \
    --username "${MONGO_INITDB_ROOT_USERNAME}" \
    --password "${MONGO_INITDB_ROOT_PASSWORD}" \
    --eval "db.adminCommand('ping').ok" --quiet | grep -q "^1$"; then
  exit 0
fi

# Fallback for the very first start (localhost exception)
if mongosh --host ${DB_HOST}:${MONGODB_PORT} --eval "db.adminCommand('ping').ok" --quiet | grep -q "^1$"; then
  exit 0
fi

exit 1
