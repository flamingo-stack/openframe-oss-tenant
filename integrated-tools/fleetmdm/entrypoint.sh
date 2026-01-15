#!/bin/sh
set -e

# Extract host and port from Redis address
REDIS_HOST=$(echo $FLEET_REDIS_ADDRESS | cut -d':' -f1)
REDIS_PORT=$(echo $FLEET_REDIS_ADDRESS | cut -d':' -f2)

# Function to wait for Fleet to be ready
wait_for_fleet() {
    echo "Waiting for Fleet to be ready..."
    attempts=0
    max_attempts=30  # 2.5 minutes timeout
    
    while [ $attempts -lt $max_attempts ]; do
        if curl --output /dev/null --silent --fail http://localhost:${FLEET_SERVER_PORT}/setup; then
            echo "Fleet is ready!"
            return 0
        fi
        attempts=$((attempts + 1))
        echo "Attempt $attempts/$max_attempts failed. Retrying..."
        sleep 5
    done
    
    echo "Fleet failed to start after $max_attempts attempts"
    return 1
}

echo "Waiting for Redis ($REDIS_HOST:$REDIS_PORT) to be ready..."
until nc -z $REDIS_HOST $REDIS_PORT; do
    echo "Redis is not ready yet..."
    sleep 2
done

echo "Starting Fleet server..."
fleet serve --config "$FLEET_CONFIG" &
FLEET_PID=$!

# Wait for Fleet to be ready
wait_for_fleet

# Initialize Fleet using fleetctl if API token doesn't exist
if [ "$FLEET_SETUP_AUTO_INIT" = "true" ] && [ ! -f /etc/fleet/api_token.txt ]; then
    echo "Running Fleet initialization..."
    sh /usr/share/init-fleet.sh || true
fi

# Keep container running and monitor Fleet process
wait $FLEET_PID