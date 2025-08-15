#!/bin/bash
mongosh \
    --authenticationDatabase "admin" \
    --username "${MONGO_INITDB_ROOT_USERNAME}" \
    --password "${MONGO_INITDB_ROOT_PASSWORD}" \
    --eval "db.adminCommand('ping').ok" \
    --quiet
