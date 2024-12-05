#!/bin/bash
set -ex

# Function to wait for MySQL to be ready
wait_for_mysql() {
    echo "Waiting for MySQL to be ready..."
    until nc -z -w5 openframe-fleet-mysql 3306; do
        printf '.'
        sleep 5
    done
    echo "MySQL is ready!"

    # Test MySQL connection
    echo "DEBUG: Testing MySQL connection..."
    if nc -z -w5 openframe-fleet-mysql 3306; then
        echo "DEBUG: MySQL port is reachable"
        if mysql -h openframe-fleet-mysql -u fleet -pfleet -e "SELECT 1;" fleet; then
            echo "MySQL connection successful!"
            return 0
        fi
    fi
    return 1
}

# Function to wait for Fleet to be ready
wait_for_fleet() {
    echo "Waiting for Fleet to be ready..."
    local attempts=0
    local max_attempts=30  # 2.5 minutes timeout
    
    while [ $attempts -lt $max_attempts ]; do
        if curl --output /dev/null --silent --fail http://localhost:8070/setup; then
            echo "Fleet is ready!"
            return 0
        fi
        attempts=$((attempts + 1))
        echo "Attempt $attempts/$max_attempts failed. Fleet logs:"
        tail -n 5 /tmp/fleet.log
        printf '.'
        sleep 5
    done
    
    echo "Fleet failed to start after $max_attempts attempts"
    return 1
}

# Function to initialize Fleet
initialize_fleet() {
    if [ "$FLEET_SETUP_AUTO_INIT" = "true" ]; then
        # Check if Fleet is already initialized by looking for the API token
        if [ ! -f "/etc/fleet/api_token.txt" ]; then
            echo "Running Fleet initialization..."
            /fleet-init.sh
            
            # Wait for API token to be created
            local token_attempts=0
            while [ ! -f "/etc/fleet/api_token.txt" ] && [ $token_attempts -lt 10 ]; do
                echo "Waiting for API token to be created... (attempt $((token_attempts + 1))/10)"
                sleep 2
                token_attempts=$((token_attempts + 1))
            done
            
            if [ ! -f "/etc/fleet/api_token.txt" ]; then
                echo "WARNING: API token was not created after initialization"
            else
                echo "Fleet initialization completed successfully"
            fi
        else
            echo "Fleet already initialized (API token exists), skipping initialization"
        fi
    fi
}

# Main process
wait_for_mysql

# Prepare database
echo "Preparing database..."
/usr/bin/fleet prepare db --config /etc/fleet/fleet.yml --no-prompt | tee /tmp/fleet-prepare.log
echo "DEBUG: Database preparation completed"

# Start Fleet server
echo "Starting Fleet server..."
/usr/bin/fleet serve --config /etc/fleet/fleet.yml | tee /tmp/fleet.log &
FLEET_PID=$!

# Wait for Fleet to be ready
wait_for_fleet

# Initialize Fleet if needed
initialize_fleet

# Keep container running and monitor Fleet process
wait $FLEET_PID