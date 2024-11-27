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

# Initialize monitoring configuration
echo "Initializing monitoring configuration..."
./scripts/init-monitoring.sh

# Build the JARs using the existing script
echo "Building JARs..."
./scripts/build-jars.sh

# echo "Creating network..."
# docker network create openframe-network 2>/dev/null || true

# Start Zookeeper and wait for it
echo "Starting Zookeeper..."
docker-compose up -d zookeeper
sleep 2  # Give Zookeeper time to initialize
check_service "zookeeper" 2181
if [ $? -ne 0 ]; then
    echo "Failed to start Zookeeper. Exiting..."
    exit 1
fi

# Start Kafka and wait for it
echo "Starting Kafka..."
docker-compose up -d kafka
sleep 2  # Give Kafka time to initialize
check_service "kafka" 9092
if [ $? -ne 0 ]; then
    echo "Failed to start Kafka. Exiting..."
    exit 1
fi

# Start Mongo and wait for it
echo "Starting MongoDB..."
docker-compose up -d mongodb
sleep 2  # Give MongoDB time to initialize
check_service "mongodb" 27017
if [ $? -ne 0 ]; then
    echo "Failed to start MongoDB. Exiting..."
    exit 1
fi

# Load initial data into MongoDB
echo "Loading initial data into MongoDB..."

# Executing initial data script into MongoDB
docker exec -it openframe-mongodb mongosh --host localhost --username openframe --password password123456789 /docker-entrypoint-initdb.d/mongo-init.js

# Start Mongo and wait for it
echo "Starting Cassandra..."
docker-compose up -d cassandra
sleep 2  # Give MongoDB time to initialize
check_service "cassandra" 9042
if [ $? -ne 0 ]; then
    echo "Failed to start Cassandra. Exiting..."
    exit
fi

# Load initial data into MongoDB
echo "Loading initial data into MongoDB..."

# Executing initial data script into MongoDB
docker exec openframe-cassandra cqlsh -f /docker-entrypoint-initdb.d/cassandra-init.cql

# Start other services
echo "Starting remaining services..."
docker-compose up -d

echo "Starting application services..."
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d --remove-orphans

echo "All services started. Checking logs..."

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"

echo "Testing network connectivity..."
./scripts/test-network.sh
