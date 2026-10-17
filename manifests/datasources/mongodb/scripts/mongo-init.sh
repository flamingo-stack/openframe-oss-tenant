#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure environment variables are set
: "${MONGO_INITDB_ROOT_USERNAME:?Required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Required}"
: "${MONGO_INITDB_DATABASE:?Required}"
: "${MONGO_APP_USERNAME:?Required}"
: "${MONGO_APP_PASSWORD:?Required}"

if [ ! -f "$DATA_DIR/db/s.mongodb_password_set" ]; then
    echo "First time initialization..."

    # mkdir -p $DATA_DIR/.mongodb

    # Initialize MongoDB with users
    export MONGO_INITDB_DATABASE MONGO_APP_USERNAME MONGO_APP_PASSWORD
    mongosh admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --eval "$(cat <<'EOF'
db = db.getSiblingDB(process.env.MONGO_INITDB_DATABASE);

// Create the database explicitly
db.createCollection('system.users');

// Only create app user if username is not 'root'
if (process.env.MONGO_APP_USERNAME !== 'root') {
    db.createUser({
        user: process.env.MONGO_APP_USERNAME,
        pwd: process.env.MONGO_APP_PASSWORD,
        roles: [
            { role: 'readWrite', db: process.env.MONGO_INITDB_DATABASE },
            { role: 'dbAdmin', db: process.env.MONGO_INITDB_DATABASE }
        ]
    });
}

db.createCollection('events');
db.events.insertMany([
    {
    id: 'evt-001',
    type: 'USER_ACTION',
    payload: JSON.stringify({
        action: 'LOGIN',
        userId: 'user-123',
        timestamp: new Date()
    }),
    timestamp: new Date(),
    userId: 'user-123'
    },
    {
    id: 'evt-002',
    type: 'SYSTEM_EVENT',
    payload: JSON.stringify({
        action: 'BACKUP_COMPLETED',
        status: 'SUCCESS',
        timestamp: new Date()
    }),
    timestamp: new Date(),
    userId: 'system'
    }
]);

db.events.createIndex({ 'userId': 1, 'timestamp': -1 });
db.events.createIndex({ 'type': 1 });
EOF
)"

    # Mark initialization as complete
    touch $DATA_DIR/db/.mongodb_password_set
fi

