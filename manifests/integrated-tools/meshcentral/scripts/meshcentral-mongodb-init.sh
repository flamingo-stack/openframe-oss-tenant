#!/bin/bash

set -euo pipefail

# MongoDB Replica Set Initialization Script
# Designed to work in both local and CI/CD environments (GitHub Actions)

echo "[INIT] Starting MongoDB replica set initialization..."
echo "[INIT] Environment: $(uname -a)"
echo "[INIT] Hostname: $(hostname)"

# Configuration
: "${MONGO_INITDB_ROOT_USERNAME:?Required}"
: "${MONGO_INITDB_ROOT_PASSWORD:?Required}"
MONGODB_PORT="${MONGODB_PORT:-27017}"
MONGO_INITDB_DATABASE="${MONGO_INITDB_DATABASE:-meshcentral}"

# Always use localhost for initialization (localhost exception)
DB_HOST="127.0.0.1"

# Detect environment and set appropriate FQDN
if [ -n "${KUBERNETES_SERVICE_HOST:-}" ]; then
  # Running in Kubernetes
  POD_NAME=$(hostname)
  SERVICE_NAME="${SERVICE_NAME:-meshcentral-mongodb}"
  NAMESPACE="${NAMESPACE:-integrated-tools}"
  HOST_FQDN="${POD_NAME}.${SERVICE_NAME}.${NAMESPACE}.svc.cluster.local"
else
  # Local development, CI/CD or other environment - use hostname
  HOST_FQDN="$(hostname)"
fi

echo "[INIT] Detected FQDN: ${HOST_FQDN}:${MONGODB_PORT}"

# Wait for MongoDB to be ready
echo "[INIT] Waiting for MongoDB to be ready on ${DB_HOST}:${MONGODB_PORT}..."
MAX_ATTEMPTS=120  # 10 minutes total
ATTEMPT=0

while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "db.adminCommand('ping')" 2>/dev/null | grep -q "ok.*1"; then
    echo "[INIT] MongoDB is responding to ping"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  if [ $((ATTEMPT % 12)) -eq 0 ]; then
    echo "[INIT] Still waiting for MongoDB... (${ATTEMPT}/${MAX_ATTEMPTS})"
  fi
  sleep 5
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "[INIT] ERROR: MongoDB did not become ready within 10 minutes"
  exit 1
fi

# Additional wait for MongoDB to fully initialize
echo "[INIT] Waiting for MongoDB to fully initialize..."
sleep 10

# Check current replica set status
echo "[INIT] Checking current replica set configuration..."
RS_STATUS=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
  try {
    const status = rs.status();
    if (status.ok === 1) {
      print('CONFIGURED');
    } else {
      print('NOT_CONFIGURED');
    }
  } catch(e) {
    if (e.codeName === 'NotYetInitialized' || e.code === 94 || e.message.includes('no replset config')) {
      print('NOT_CONFIGURED');
    } else if (e.codeName === 'Unauthorized' || e.code === 13) {
      // Already has auth enabled, likely already initialized
      print('AUTH_ENABLED');
    } else {
      print('ERROR: ' + e.message);
    }
  }
" 2>&1 || echo "NOT_CONFIGURED")

echo "[INIT] Replica set status: ${RS_STATUS}"

if [ "$RS_STATUS" = "NOT_CONFIGURED" ]; then
  echo "[INIT] Initializing new replica set..."
  
  # Initialize replica set with retry logic
  MAX_INIT_ATTEMPTS=3
  INIT_ATTEMPT=0
  INIT_SUCCESS=false
  
  while [ $INIT_ATTEMPT -lt $MAX_INIT_ATTEMPTS ] && [ "$INIT_SUCCESS" = "false" ]; do
    INIT_ATTEMPT=$((INIT_ATTEMPT + 1))
    echo "[INIT] Initialization attempt ${INIT_ATTEMPT}/${MAX_INIT_ATTEMPTS}"
    
    INIT_RESULT=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
      try {
        const config = {
          _id: 'rs0',
          members: [
            {
              _id: 0,
              host: '${HOST_FQDN}:${MONGODB_PORT}',
              priority: 1
            }
          ]
        };
        print('Config: ' + JSON.stringify(config));
        const result = rs.initiate(config);
        if (result.ok === 1) {
          print('SUCCESS');
        } else {
          print('FAILED: ' + JSON.stringify(result));
        }
      } catch(e) {
        print('ERROR: ' + e.message + ' (code: ' + e.code + ')');
      }
    " 2>&1)
    
    echo "[INIT] Result: ${INIT_RESULT}"
    
    if echo "$INIT_RESULT" | grep -q "SUCCESS"; then
      INIT_SUCCESS=true
      echo "[INIT] Replica set initialized successfully"
    elif echo "$INIT_RESULT" | grep -q "already initialized"; then
      INIT_SUCCESS=true
      echo "[INIT] Replica set was already initialized"
    else
      echo "[INIT] Initialization failed, waiting before retry..."
      sleep 10
    fi
  done
  
  if [ "$INIT_SUCCESS" = "false" ]; then
    echo "[INIT] ERROR: Failed to initialize replica set after ${MAX_INIT_ATTEMPTS} attempts"
    exit 1
  fi
  
  # Wait for replica set to elect primary
  echo "[INIT] Waiting for PRIMARY election..."
  PRIMARY_READY=false
  ELECTION_ATTEMPTS=0
  MAX_ELECTION_ATTEMPTS=60  # 5 minutes
  
  while [ $ELECTION_ATTEMPTS -lt $MAX_ELECTION_ATTEMPTS ] && [ "$PRIMARY_READY" = "false" ]; do
    ELECTION_ATTEMPTS=$((ELECTION_ATTEMPTS + 1))
    
    IS_PRIMARY=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
      try {
        const hello = db.hello();
        if (hello.isWritablePrimary === true) {
          print('PRIMARY');
        } else if (hello.secondary === true) {
          print('SECONDARY');
        } else {
          print('WAITING');
        }
      } catch(e) {
        print('ERROR');
      }
    " 2>/dev/null || echo "ERROR")
    
    if [ "$IS_PRIMARY" = "PRIMARY" ]; then
      PRIMARY_READY=true
      echo "[INIT] Node is now PRIMARY"
    else
      if [ $((ELECTION_ATTEMPTS % 6)) -eq 0 ]; then
        echo "[INIT] Waiting for PRIMARY election... (${ELECTION_ATTEMPTS}/${MAX_ELECTION_ATTEMPTS}, current state: ${IS_PRIMARY})"
      fi
      sleep 5
    fi
  done
  
  if [ "$PRIMARY_READY" = "false" ]; then
    echo "[INIT] ERROR: PRIMARY was not elected within timeout"
    exit 1
  fi
  
elif [ "$RS_STATUS" = "AUTH_ENABLED" ]; then
  echo "[INIT] MongoDB already has authentication enabled, skipping initialization"
  exit 0
elif [ "$RS_STATUS" = "CONFIGURED" ]; then
  echo "[INIT] Replica set already configured, checking PRIMARY status..."
else
  echo "[INIT] Unexpected status: ${RS_STATUS}"
fi

# Create admin user if not exists
echo "[INIT] Creating admin user..."
USER_RESULT=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
  try {
    // Switch to admin database
    const adminDb = db.getSiblingDB('admin');
    
    // Check if user already exists
    const users = adminDb.getUsers();
    const userExists = users.users.some(u => u.user === '${MONGO_INITDB_ROOT_USERNAME}');
    
    if (userExists) {
      print('USER_EXISTS');
    } else {
      // Create user
      adminDb.createUser({
        user: '${MONGO_INITDB_ROOT_USERNAME}',
        pwd: '${MONGO_INITDB_ROOT_PASSWORD}',
        roles: [
          { role: 'root', db: 'admin' },
          { role: 'clusterAdmin', db: 'admin' },
          { role: 'userAdminAnyDatabase', db: 'admin' },
          { role: 'dbAdminAnyDatabase', db: 'admin' },
          { role: 'readWriteAnyDatabase', db: 'admin' }
        ]
      });
      print('USER_CREATED');
    }
  } catch(e) {
    if (e.code === 51003 || e.message.includes('already exists')) {
      print('USER_EXISTS');
    } else if (e.code === 13 || e.message.includes('not authorized')) {
      // Auth already enabled
      print('AUTH_ALREADY_ENABLED');
    } else {
      print('ERROR: ' + e.message + ' (code: ' + e.code + ')');
    }
  }
" 2>&1 || echo "ERROR")

echo "[INIT] User creation result: ${USER_RESULT}"

# Create application database
echo "[INIT] Creating application database: ${MONGO_INITDB_DATABASE}"
mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
  try {
    const db = db.getSiblingDB('${MONGO_INITDB_DATABASE}');
    db.createCollection('__init');
    db.__init.insertOne({ initialized: new Date() });
    db.__init.drop();
    print('Database ${MONGO_INITDB_DATABASE} initialized');
  } catch(e) {
    print('Database initialization: ' + e.message);
  }
" 2>/dev/null || true

# Final verification
echo "[INIT] Performing final verification..."
FINAL_STATUS=$(mongosh --host "${DB_HOST}:${MONGODB_PORT}" --quiet --eval "
  try {
    const status = rs.status();
    const hello = db.hello();
    print('Replica Set: ' + status.set);
    print('State: ' + (hello.isWritablePrimary ? 'PRIMARY' : hello.secondary ? 'SECONDARY' : 'OTHER'));
    print('OK');
  } catch(e) {
    print('Verification error: ' + e.message);
  }
" 2>&1 || echo "VERIFICATION_FAILED")

echo "[INIT] Final status:"
echo "${FINAL_STATUS}"

if echo "${FINAL_STATUS}" | grep -q "OK"; then
  echo "[INIT] MongoDB replica set initialization completed successfully!"
  exit 0
else
  echo "[INIT] WARNING: Final verification had issues, but continuing..."
  exit 0
fi
