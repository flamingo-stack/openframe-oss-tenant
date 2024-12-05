#!/bin/bash

# Function to check if a service is healthy
check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready..."
    while ! docker exec openframe-$service nc -z localhost $port; do
        if [ $attempt -eq $max_attempts ]; then
            echo "$service is not available after $max_attempts attempts"
            docker logs openframe-$service
            return 1
        fi
        attempt=$((attempt + 1))
        sleep 2
    done
    echo "$service is ready!"
    return 0
}

# Build the JARs using the existing script
echo "Building JARs..."
./scripts/build-jars.sh

# Start core services
echo "Starting core services..."
docker-compose up -d

# Start Fleet MDM with a clean state
echo "Starting Fleet MDM..."
docker-compose -f infrastructure/fleetmdm/docker-compose.fleet.yml up -d

# Add Fleet health check
check_service "fleet" 8070
if [ $? -ne 0 ]; then
    echo "Failed to start Fleet MDM. Exiting..."
    exit 1
fi

# Start application services
echo "Starting application services..."
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d

echo "All services started. Checking logs..."

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"
echo "- Fleet MDM: http://localhost:8070"

# Print Fleet credentials
echo -e "\nFleet MDM Credentials:"
echo "Admin User:     admin@openframe.com"
echo "Admin Password: AdminPassword123!@#$"
echo "API User:       api@openframe.com"
echo "API Password:   ApiPassword123!@#$"

# Wait for Fleet API token to be generated
echo -e "\nWaiting for Fleet API token..."
max_attempts=30
attempt=1
while ! docker exec openframe-fleet cat /var/log/osquery/api_token.txt > /dev/null 2>&1; do
    if [ $attempt -eq $max_attempts ]; then
        echo "API token not available after $max_attempts attempts"
        break
    fi
    echo "Waiting for Fleet API token to be generated... (attempt $attempt/$max_attempts)"
    attempt=$((attempt + 1))
    sleep 5
done

if [ $attempt -lt $max_attempts ]; then
    echo -e "\nFleet API Token:"
    docker exec openframe-fleet cat /var/log/osquery/api_token.txt
fi

echo "Testing network connectivity..."
./scripts/test-network.sh
