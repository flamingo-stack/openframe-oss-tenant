#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure environment variables are set
: "${MONGO_INITDB_ROOT_USERNAME:?Required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Required}"
: "${MONGO_APP_DATABASE:?Required}"
: "${MONGO_APP_USERNAME:?Required}"
: "${MONGO_APP_PASSWORD:?Required}"

# Ensure proper ownership of mounted volumes
chown -R mongodb:mongodb /var/log/mongodb /data/db

# Check if this is first run
if [ ! -f "/data/db/.mongodb/.mongodb_password_set" ]; then
    echo "First time initialization..."

    # Remove any existing data for clean initialization
    rm -rf /data/db/* /data/db/.* /var/log/mongodb/* /data/configdb/* /var/log/mongodb/*

    # Create necessary directories with proper permissions
    mkdir -p /data/db/.mongodb \
        /data/db/journal \
        /data/db/diagnostic.data && \
    chmod -R 770 /data/db /var/log/mongodb

    # Start MongoDB temporarily without authentication
    mongod --fork --logpath /var/log/mongodb/mongod.log

    # Wait for MongoDB to start
    sleep 5

    # Initialize MongoDB with users
    mongosh admin --eval "
        db.createUser({
            user: '$MONGO_INITDB_ROOT_USERNAME',
            pwd: '$MONGO_INITDB_ROOT_PASSWORD',
            roles: [
                { role: 'root', db: 'admin' },
                { role: 'userAdminAnyDatabase', db: 'admin' },
                { role: 'dbAdminAnyDatabase', db: 'admin' },
                { role: 'readWriteAnyDatabase', db: 'admin' }
            ]
        });
    "

    # Create application database and user
    mongosh admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --eval "
        db = db.getSiblingDB('$MONGO_APP_DATABASE');
        db.createUser({
            user: '$MONGO_APP_USERNAME',
            pwd: '$MONGO_APP_PASSWORD',
            roles: [{ role: 'readWrite', db: '$MONGO_APP_DATABASE' }]
        });

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
    "

    # Stop the temporary MongoDB instance
    mongosh admin -u "$MONGO_INITDB_ROOT_USERNAME" -p "$MONGO_INITDB_ROOT_PASSWORD" --eval "db.shutdownServer()"

    # Mark initialization as complete
    touch /data/db/.mongodb/.mongodb_password_set
fi

# Start MongoDB with authentication enabled
exec "$@"
