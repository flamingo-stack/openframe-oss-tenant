#!/bin/bash

set -euo pipefail

# MongoDB initialization entrypoint script
# This script handles replica set initialization on first startup

echo "[ENTRYPOINT] Starting MongoDB entrypoint script..."

# Check if already initialized
if [ -f /data/db/.mongodb_rs_initialized ]; then
  echo "[ENTRYPOINT] MongoDB replica set already initialized, starting normally..."
  exec mongod --bind_ip_all --replSet rs0 --keyFile /etc/mongo-keyfile/keyfile --auth
fi

echo "[ENTRYPOINT] First startup detected, initializing replica set..."

# Start MongoDB in background WITHOUT auth for initialization
echo "[ENTRYPOINT] Starting MongoDB without auth for initialization..."
mongod --bind_ip_all --replSet rs0 --port 27017 --dbpath /data/db --noauth &
MONGOD_PID=$!

# Function to cleanup on exit
cleanup() {
  echo "[ENTRYPOINT] Cleaning up..."
  if [ -n "${MONGOD_PID:-}" ]; then
    kill -TERM $MONGOD_PID 2>/dev/null || true
    wait $MONGOD_PID 2>/dev/null || true
  fi
}
trap cleanup EXIT

# Wait for MongoDB to be ready
echo "[ENTRYPOINT] Waiting for MongoDB to be ready..."
MAX_ATTEMPTS=30
ATTEMPT=0
while [ $ATTEMPT -lt $MAX_ATTEMPTS ]; do
  if mongosh --host 127.0.0.1:27017 --eval "db.adminCommand('ping')" >/dev/null 2>&1; then
    echo "[ENTRYPOINT] MongoDB is ready"
    break
  fi
  ATTEMPT=$((ATTEMPT + 1))
  echo "[ENTRYPOINT] Waiting for MongoDB (attempt $ATTEMPT/$MAX_ATTEMPTS)..."
  sleep 2
done

if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
  echo "[ENTRYPOINT] ERROR: MongoDB failed to start"
  exit 1
fi

# Run the initialization script
echo "[ENTRYPOINT] Running initialization script..."
if /usr/local/bin/mongo-init.sh; then
  echo "[ENTRYPOINT] Initialization successful"
  touch /data/db/.mongodb_rs_initialized
else
  echo "[ENTRYPOINT] ERROR: Initialization failed"
  exit 1
fi

# Shutdown MongoDB cleanly
echo "[ENTRYPOINT] Shutting down MongoDB for restart with auth..."
mongosh --host 127.0.0.1:27017 --eval "db.adminCommand({shutdown: 1})" 2>/dev/null || true
sleep 5

# Kill if still running
kill -TERM $MONGOD_PID 2>/dev/null || true
wait $MONGOD_PID 2>/dev/null || true

# Clear the trap
trap - EXIT

echo "[ENTRYPOINT] Starting MongoDB with authentication enabled..."
exec mongod --bind_ip_all --replSet rs0 --keyFile /etc/mongo-keyfile/keyfile --auth