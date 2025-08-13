#!/bin/bash
mongosh \
    --authenticationDatabase "${MONGO_INITDB_DATABASE}" \
    --username "${MONGO_INITDB_ROOT_USERNAME}" \
    --password "${MONGO_INITDB_ROOT_PASSWORD}" \
    --eval "db.adminCommand('ping').ok" \
    --quiet
