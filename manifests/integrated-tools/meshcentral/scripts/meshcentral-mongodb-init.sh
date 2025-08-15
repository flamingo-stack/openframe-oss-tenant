#!/bin/bash

# Export all environment variables
set -a
[ -f /etc/environment ] && source /etc/environment
set +a

# Ensure mandatory root credentials are set (host/port will be overridden to localhost)
: "${MONGO_INITDB_ROOT_USERNAME:?Required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Required}"
: "${MONGODB_PORT:?Required}"

# Always talk to the mongod instance via the loop-back interface so that the
# "localhost exception" is active until authentication is configured.
DB_HOST="127.0.0.1"


apt-get update && apt-get install -y curl gpg apt-transport-https ca-certificates
          
echo "Waiting for MongoDB service to be ready..."
# use localhost while mongod is still starting
until mongosh --host ${DB_HOST}:${MONGODB_PORT} --eval "db.adminCommand('ping')" > /dev/null 2>&1; do
echo "Waiting for MongoDB to be accessible (localhost)..."
sleep 5
done

echo "MongoDB service is accessible, waiting additional time for startup..."
sleep 10

echo "Checking replica set status..."
INIT_STATUS=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "try { rs.status().ok } catch(e) { 0 }" --quiet)
echo "Current replica set status: $INIT_STATUS"

if [ "$INIT_STATUS" != "1" ]; then
echo "Replica set needs initialization or repair..."

# Root auth flags (used after localhost exception disappears)
AUTH_FLAGS="--username \"$MONGO_INITDB_ROOT_USERNAME\" --password \"$MONGO_INITDB_ROOT_PASSWORD\" --authenticationDatabase admin"

# Attempt rs commands with auth flags; if localhost exception still active, the credentials are ignored
RECONFIG_RESULT=$(mongosh $AUTH_FLAGS --host "${DB_HOST}:${MONGODB_PORT}" --eval '
    try {
    rs.reconfig({
        _id: "rs0",
        members: [
        { _id: 0, host: "meshcentral-mongodb.integrated-tools.svc.cluster.local:27017" }
        ]
    }, {force: true});
    } catch(e) {
    if (e.message.includes("already initialized")) {
        print("Replica set corrupted, attempting force reconfigure...");
        rs.reconfig({
        _id: "rs0", 
        members: [
            { _id: 0, host: "meshcentral-mongodb.integrated-tools.svc.cluster.local:27017" }
        ]
        }, {force: true});
    } else {
        print("Initializing new replica set...");
        rs.initiate({
        _id: "rs0",
        members: [
            { _id: 0, host: "meshcentral-mongodb.integrated-tools.svc.cluster.local:27017" }
        ]
        });
    }
    }
' --quiet)
echo "Replica set setup result: $RECONFIG_RESULT"

echo "Waiting for replica set to stabilize..."
sleep 10

echo "Checking replica set status after initialization..."
for i in {1..30}; do
    STATUS=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "rs.status().ok" --quiet)
    if [ "$STATUS" = "1" ]; then
    echo "Replica set is ready!"
    break
    fi
    echo "Retry $i: Waiting for replica set to be ready (current status: $STATUS)..."
    sleep 5
done
else
echo "Replica set is already initialized"
fi

echo "Ensuring admin user exists..."
mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "
  try {
    db.getSiblingDB('admin').createUser({
      user: '$MONGO_INITDB_ROOT_USERNAME',
      pwd: '$MONGO_INITDB_ROOT_PASSWORD',
      roles: [
        { role: 'root', db: 'admin' },
        { role: 'userAdminAnyDatabase', db: 'admin' },
        { role: 'dbAdminAnyDatabase', db: 'admin' },
        { role: 'readWriteAnyDatabase', db: 'admin' }
      ]
    });
    print('Admin user created');
  } catch (e) {
    if (e.codeName === 'DuplicateKey' || e.code === 11000) {
      print('Admin user already exists');
    } else {
      print('Create admin user error: ' + tojson(e));
    }
  }
" --quiet

echo "Final replica set status:"
mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "rs.status()" --quiet
