#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure environment variables are set
: "${MONGO_INITDB_DATABASE:?Required}"

if [ ! -f "$DATA_DIR/db/.mongodb_initialized" ]; then
    echo "First time initialization..."

    # Initialize MongoDB with replica set
    mongosh --eval <<EOF
// Initialize replica set
rs.initiate({
    _id: "rs0",
    members: [
        { _id: 0, host: "mongodb-0.mongodb:27017" }
    ]
});

// Wait for replica set to initialize
sleep(10);

// Create database and collections
db = db.getSiblingDB('$MONGO_INITDB_DATABASE');

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

    # Mark initialization as complete
    touch $DATA_DIR/db/.mongodb_initialized
fi
