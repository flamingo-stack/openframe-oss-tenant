#!/bin/bash

set -euo pipefail
# (optional) export envs if you rely on /etc/environment
set -a; [ -f /etc/environment ] && source /etc/environment || true; set +a

# Ensure mandatory root credentials are set (host/port will be overridden to localhost)
: "${MONGO_INITDB_ROOT_USERNAME:?Required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Required}"
MONGODB_PORT="${MONGODB_PORT:-27017}"

# Always talk to the mongod instance via the loop-back interface so that the
# "localhost exception" is active until authentication is configured.
DB_HOST="127.0.0.1"
MONGODB_URL="mongodb://$MONGO_INITDB_ROOT_USERNAME:$MONGO_INITDB_ROOT_PASSWORD@${DB_HOST}:${MONGODB_PORT}"

echo "Waiting for MongoDB service to be ready..."
# Wait for MongoDB to be accessible
ATTEMPTS=0
until mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "db.adminCommand('ping')" >/dev/null 2>&1; do
  ATTEMPTS=$((ATTEMPTS+1))
  if [ $ATTEMPTS -ge 60 ]; then
    echo "MongoDB has not been available for more than 5 minutes — exiting"; exit 1
  fi
  echo "Waiting for MongoDB to be accessible (localhost)..."
  sleep 5
done

echo "MongoDB service is accessible, waiting additional time for startup..."
sleep 10

# Get the fully qualified domain name for this pod
# Use explicit Kubernetes StatefulSet naming convention for reliability
POD_NAME=$(hostname)
SERVICE_NAME="meshcentral-mongodb"
NAMESPACE="integrated-tools"
HOST_FQDN="${POD_NAME}.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local:${MONGODB_PORT}"
echo "Pod name: $POD_NAME"
echo "Using FQDN: $HOST_FQDN"

echo "Checking replica set configuration..."
# During initialization, MongoDB is running WITHOUT auth, so no credentials needed
RS_CONFIG=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "
  try {
    const config = rs.conf();
    if (config) {
      print('CONFIGURED');
    } else {
      print('NOT_CONFIGURED');
    }
  } catch(e) {
    if (e.codeName === 94 || e.message.includes('no replset config')) {
      print('NOT_CONFIGURED');
    } else {
      print('ERROR: ' + e.message);
    }
  }
" --quiet 2>&1 || echo "NOT_CONFIGURED")
echo "Replica set check result: '$RS_CONFIG'"

echo "Replica set configuration status: $RS_CONFIG"

if [ "$RS_CONFIG" = "NOT_CONFIGURED" ]; then
  echo "Initializing replica set..."
  
  # MongoDB is running without auth during initialization
  INIT_RESULT=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "
    try {
      const result = rs.initiate({
        _id: 'rs0',
        members: [{ _id: 0, host: '${HOST_FQDN}' }]
      });
      if (result.ok === 1) {
        print('SUCCESS');
      } else {
        print('FAILED: ' + JSON.stringify(result));
      }
    } catch(e) {
      print('ERROR: ' + e.message);
    }
  " --quiet 2>&1)
  
  if [ "$INIT_RESULT" = "SUCCESS" ]; then
    echo "Replica set initialized successfully"
  else
    echo "Replica set initialization result: $INIT_RESULT"
  fi
  
  echo "Waiting for replica set to stabilize..."
  sleep 15
  
  echo "Checking for PRIMARY state after initialization..."
  for i in {1..60}; do
    IS_PRIMARY=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --eval "
      try { 
        const hello = db.hello();
        if (hello.isWritablePrimary) {
          print('1');
        } else {
          print('0');
        }
      } catch(e) { 
        print('0');
      }
    " --quiet 2>/dev/null || echo "0")
    
    if [ "$IS_PRIMARY" = "1" ]; then
      echo "Replica set PRIMARY is ready!"
      break
    fi
    echo "Retry $i: Waiting for PRIMARY..."
    sleep 5
  done
  
  if [ "$IS_PRIMARY" != "1" ]; then
    echo "ERROR: PRIMARY not ready after timeout"
    exit 1
  fi
else
  echo "Replica set is already configured"
fi

echo "Creating admin user..."
# MongoDB is running without auth, so connect without credentials
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
      print('Create admin user error: ' + JSON.stringify(e));
    }
  }
" --quiet

echo "Final replica set status:"
mongosh --host "${DB_HOST}:${MONGODB_PORT}" \
    --eval "rs.status().members[0].stateStr" --quiet || echo "Failed to get final replica set status"
echo "MongoDB initialization completed successfully"
