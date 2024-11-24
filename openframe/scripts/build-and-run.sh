// scripts/build-and-run.sh
#!/bin/bash

# Function to check if a service is healthy
check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready..."
    while ! nc -z localhost $port; do
        if [ $attempt -eq $max_attempts ]; then
            echo "$service is not available after $max_attempts attempts"
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

# Create docker network if it doesn't exist
docker network create openframe-network 2>/dev/null || true

# Start infrastructure services one by one
echo "Starting Zookeeper..."
docker-compose up -d zookeeper
check_service "Zookeeper" 2181

echo "Starting Kafka..."
docker-compose up -d kafka
check_service "Kafka" 9092

echo "Starting MongoDB..."
docker-compose up -d mongodb
check_service "MongoDB" 27017

echo "Starting Cassandra..."
docker-compose up -d cassandra
check_service "Cassandra" 9042

echo "Starting NiFi..."
docker-compose up -d nifi
check_service "NiFi" 8443

echo "Starting monitoring services..."
docker-compose up -d prometheus grafana

echo "Starting management UIs..."
docker-compose up -d kafka-ui mongo-express

# Wait for all services to be ready
sleep 10

# Start application services
echo "Starting OpenFrame services..."
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"

# Print service logs
echo "Checking service logs..."
docker-compose logs -f stream
