#!/bin/bash
mongosh \
    --authenticationDatabase "${MONGO_INITDB_DATABASE}" \
    --username "${MONGO_APP_USERNAME}" \
    --password "${MONGO_APP_PASSWORD}" \
    --eval "db.adminCommand('ping').ok" \
    --quiet
