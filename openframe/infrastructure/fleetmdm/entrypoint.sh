#!/bin/sh
set -e

# Extract host and port from MySQL address
MYSQL_HOST=$(echo $FLEET_MYSQL_ADDRESS | cut -d':' -f1)
MYSQL_PORT=$(echo $FLEET_MYSQL_ADDRESS | cut -d':' -f2)

# Extract host and port from Redis address
REDIS_HOST=$(echo $FLEET_REDIS_ADDRESS | cut -d':' -f1)
REDIS_PORT=$(echo $FLEET_REDIS_ADDRESS | cut -d':' -f2)

# Function to wait for Fleet to be ready
wait_for_fleet() {
    echo "Waiting for Fleet to be ready..."
    attempts=0
    max_attempts=30  # 2.5 minutes timeout
    
    while [ $attempts -lt $max_attempts ]; do
        if curl --output /dev/null --silent --fail http://localhost:8070/setup; then
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

echo "Waiting for MySQL ($MYSQL_HOST:$MYSQL_PORT) to be ready..."
until nc -z $MYSQL_HOST $MYSQL_PORT; do
    echo "MySQL is not ready yet..."
    sleep 2
done

echo "Waiting for Redis ($REDIS_HOST:$REDIS_PORT) to be ready..."
until nc -z $REDIS_HOST $REDIS_PORT; do
    echo "Redis is not ready yet..."
    sleep 2
done

echo "Preparing database..."
fleet prepare db --config "$FLEET_CONFIG" --no-prompt

echo "Starting Fleet server..."
fleet serve --config "$FLEET_CONFIG" &
FLEET_PID=$!

# Wait for Fleet to be ready
wait_for_fleet

# Initialize Fleet using fleetctl if API token doesn't exist
if [ "$FLEET_SETUP_AUTO_INIT" = "true" ] && [ ! -f /etc/fleet/api_token.txt ]; then
    echo "Running Fleet initialization..."
    ./bin/init-fleet/init.sh
fi

# Keep container running and monitor Fleet process
wait $FLEET_PID