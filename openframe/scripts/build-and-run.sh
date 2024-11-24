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

echo "Creating network..."
docker network create openframe-network 2>/dev/null || true

# Start Zookeeper and wait for it
echo "Starting Zookeeper..."
docker-compose up -d zookeeper
sleep 10  # Give Zookeeper time to initialize
check_service "zookeeper" 2181
if [ $? -ne 0 ]; then
    echo "Failed to start Zookeeper. Exiting..."
    exit 1
fi

# Start Kafka and wait for it
echo "Starting Kafka..."
docker-compose up -d kafka
sleep 15  # Give Kafka time to initialize
check_service "kafka" 9092
if [ $? -ne 0 ]; then
    echo "Failed to start Kafka. Exiting..."
    exit 1
fi

# Start other services
echo "Starting remaining services..."
docker-compose up -d

echo "Starting application services..."
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d

echo "All services started. Checking logs..."

# Print important logs
echo "Zookeeper logs:"
docker logs openframe-zookeeper

echo "Kafka logs:"
docker logs openframe-kafka

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"

echo "Testing network connectivity..."
./scripts/test-network.sh
