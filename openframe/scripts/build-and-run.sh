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

# Function to wait for Fleet initialization
wait_for_fleet_init() {
    echo "Waiting for Fleet initialization..."
    local max_attempts=30
    local attempt=1
    
    while [ $attempt -lt $max_attempts ]; do
        if docker exec openframe-fleet test -f /etc/fleet/api_token.txt; then
            echo "Fleet initialization completed successfully!"
            return 0
        fi
        echo "Waiting for Fleet initialization... (attempt $attempt/$max_attempts)"
        attempt=$((attempt + 1))
        sleep 5
    done
    
    echo "Fleet initialization failed after $max_attempts attempts"
    docker logs openframe-fleet
    return 1
}

# Function to wait for infrastructure services
wait_for_infrastructure() {
    echo "Waiting for infrastructure services..."
    local services=("cassandra:9042" "mongodb:27017" "kafka:9092")
    
    for service in "${services[@]}"; do
        IFS=':' read -r name port <<< "$service"
        if ! check_service "$name" "$port"; then
            echo "Failed to start $name. Exiting..."
            exit 1
        fi
        
    done
}

# Build the JARs
echo "Building JARs..."
./scripts/build-jars.sh

# Start infrastructure services
echo "Starting application infra services..."
docker-compose -f docker-compose.openframe-infrastructure.yml up -d

echo "Finished launching application infra services..."

# Start the infrastructure
docker-compose -f docker-compose.openframe-infrastructure.yml up -d

# Wait for Cassandra to be healthy
echo "Waiting for Cassandra to be healthy..."
until docker-compose -f docker-compose.openframe-infrastructure.yml ps | grep "cassandra" | grep "(healthy)" > /dev/null; do
    echo "Waiting for Cassandra to be ready..."
    sleep 5
done

# Execute initialization scripts
echo "Initializing Cassandra..."
docker exec openframe-cassandra cqlsh -f /docker-entrypoint-initdb.d/cassandra-init.cql

docker-compose -f docker-compose.openframe-infrastructure.yml up -f docker-compose.openframe-microservices.yml -d

# Wait for infrastructure to be ready
wait_for_infrastructure

echo "Finished launching application infra and application services..."

# Start Fleet MDM only after infrastructure is ready
echo "Starting Fleet MDM..."
docker-compose -f infrastructure/fleetmdm/docker-compose.openframe-fleetmdm.yml up -d

# Wait for Fleet to be ready
check_service "fleet" 8070
if [ $? -ne 0 ]; then
    echo "Failed to start Fleet MDM. Exiting..."
    exit 1
fi

# Wait for Fleet initialization to complete
wait_for_fleet_init
if [ $? -ne 0 ]; then
    echo "Failed to initialize Fleet. Exiting..."
    exit 1
fi

echo "Fleet initialized successfully!"

echo "Testing network connectivity..."
./scripts/test-network.sh

# Print final status
echo -e "\nSystem Status:"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}" | grep "openframe-"

# Print Fleet credentials
echo -e "\nFleet MDM Credentials:"
echo "Admin User:     admin@openframe.local"
echo "Admin Password: openframe123!"
echo "API User:       api@openframe.local"
echo "API Password:   openframe123!"
# Display Fleet API token if available
if docker exec openframe-fleet test -f /etc/fleet/api_token.txt; then
    echo -e "\nFleet API Token:"
    docker exec openframe-fleet cat /etc/fleet/api_token.txt
fi

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"
echo "- Fleet MDM: http://localhost:8070"
echo "- OpenFrame Config Service: http://localhost:8090"
echo "- OpenFrame Stream Service: http://localhost:8091"
echo "- OpenFrame API Service: http://localhost:8092"