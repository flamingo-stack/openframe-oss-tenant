#!/bin/bash

# Build the JARs
echo "Building JARs..."
mvn clean package -DskipTests

# Create docker network if it doesn't exist
docker network create openframe-network 2>/dev/null || true

# Start infrastructure services
docker-compose up -d mongodb cassandra zookeeper kafka nifi prometheus grafana kafka-ui mongo-express

# Wait for infrastructure to be ready
echo "Waiting for infrastructure services to be ready..."
sleep 30

# Build and start application services
docker-compose -f docker-compose.yml -f docker-compose.services.yml up -d

echo "OpenFrame is running!"
echo "Access points:"
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"