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

docker-compose -f docker-compose.openframe-infrastructure.yml -f docker-compose.openframe-microservices.yml up -d

# Wait for infrastructure to be ready
wait_for_infrastructure

echo "Finished launching application infra and application services..."

# Start Fleet MDM only after infrastructure is ready
echo "Starting integrated tools deployment..."
docker-compose -f docker-compose.openframe-integrated-tools.yml up -d

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

# Function to register an integrated tool
register_tool() {
    local tool_id=$1
    local tool_type=$2
    local name=$3
    local description=$4
    local url=$5
    local port=$6
    local username=$7
    local password=$8
    local token=$9
    local category=${10}
    local platform_category=${11}

    echo "Registering $name with OpenFrame API..."

    # Build credentials object based on what's provided
    local credentials_json="{"
    if [ ! -z "$username" ]; then
        credentials_json+="\"username\": \"$username\","
    fi
    if [ ! -z "$password" ]; then
        credentials_json+="\"password\": \"$password\","
    fi
    if [ ! -z "$token" ]; then
        credentials_json+="\"token\": \"$token\","
    fi
    # Remove trailing comma if exists
    credentials_json="${credentials_json%,}"
    credentials_json+="}"

    curl -X POST "http://localhost:8095/v1/tools/$tool_id" \
      -H "Content-Type: application/json" \
      -d "{
        \"tool\": {
          \"toolType\": \"$tool_type\",
          \"name\": \"$name\",
          \"description\": \"$description\",
          \"url\": \"$url\",
          \"port\": $port,
          \"type\": \"$tool_type\",
          \"category\": \"$category\",
          \"platformCategory\": \"$platform_category\",
          \"enabled\": true,
          \"credentials\": $credentials_json,
          \"config\": {
            \"apiVersion\": \"1.0\",
            \"basePath\": \"/api\",
            \"healthCheckEndpoint\": \"/health\",
            \"healthCheckInterval\": 30,
            \"connectionTimeout\": 5000,
            \"readTimeout\": 5000,
            \"allowedEndpoints\": [\"/api/v1/*\", \"/metrics\"],
            \"requiredScopes\": [\"read\", \"write\"],
            \"tokenConfig\": {
              \"token\": \"$token\",
              \"active\": true,
              \"createdAt\": \"2024-01-01T00:00:00Z\",
              \"expiresAt\": \"2025-01-01T00:00:00Z\"
            }
          }
        }
      }" \
      --retry 5 \
      --retry-delay 2 \
      --retry-all-errors

    if [ $? -ne 0 ]; then
        echo "Failed to register $name. Exiting..."
        return 1
    fi

    echo "$name registered successfully!"
    return 0
}

# Get Fleet token
FLEET_TOKEN=$(docker exec openframe-fleet cat /etc/fleet/api_token.txt)

# Register Fleet
register_tool \
    "fleet" \
    "FLEET" \
    "Fleet MDM" \
    "Fleet Device Management Platform" \
    "http://openframe-fleet" \
    8070 \
    "admin@openframe.local" \
    "openframe123!" \
    "$FLEET_TOKEN" \
    "Web Application" \
    "Integrated Tool"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Authentik
register_tool \
    "authentik" \
    "AUTHENTIK" \
    "Authentik SSO" \
    "Authentik Identity Provider" \
    "http://openframe-authentik-server" \
    5001 \
    "akadmin@openframe.local" \
    "openframe123!" \
    "openframe-api-token-123456789" \
    "Web Application" \
    "Integrated Tool"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register MongoDB
register_tool \
    "mongodb-primary" \
    "MONGODB" \
    "MongoDB Database" \
    "MongoDB NoSQL Database" \
    "mongodb://openframe-mongodb" \
    27017 \
    "openframe" \
    "password123456789" \
    "mongodb-token" \
    "NoSQL Database" \
    "OpenFrame Datasource"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Redis
register_tool \
    "redis-primary" \
    "REDIS" \
    "Redis Cache" \
    "Redis In-Memory Cache" \
    "redis://openframe-redis" \
    6379 \
    "" \
    "" \
    "" \
    "In-Memory Database" \
    "OpenFrame Datasource"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Cassandra
register_tool \
    "cassandra-primary" \
    "CASSANDRA" \
    "Cassandra Database" \
    "Cassandra Distributed Database" \
    "cassandra://openframe-cassandra" \
    9042 \
    "" \
    "" \
    "" \
    "NoSQL Database" \
    "OpenFrame Datasource"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Kafka
register_tool \
    "kafka-primary" \
    "KAFKA" \
    "Kafka Message Broker" \
    "Apache Kafka Event Streaming Platform" \
    "http://openframe-kafka-ui" \
    9092 \
    "" \
    "" \
    "" \
    "Message Broker" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Kafka UI
register_tool \
    "kafka-ui" \
    "KAFKA" \
    "Kafka UI" \
    "Web UI for Apache Kafka" \
    "http://openframe-kafka-ui" \
    8080 \
    "" \
    "" \
    "" \
    "Web Application" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Zookeeper
register_tool \
    "zookeeper-primary" \
    "ZOOKEEPER" \
    "Zookeeper Coordinator" \
    "Apache Zookeeper Distributed Coordinator" \
    "http://openframe-zookeeper" \
    2181 \
    "" \
    "" \
    "" \
    "Service Discovery" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register NiFi
register_tool \
    "nifi-primary" \
    "NIFI" \
    "Apache NiFi" \
    "NiFi Data Integration Platform" \
    "https://openframe-nifi" \
    8443 \
    "openframe" \
    "password123456789" \
    "" \
    "Data Integration" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Prometheus
register_tool \
    "prometheus-primary" \
    "PROMETHEUS" \
    "Prometheus Monitoring" \
    "Prometheus Time Series Database and Monitoring" \
    "http://openframe-prometheus" \
    9090 \
    "" \
    "" \
    "" \
    "Time Series Database" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Grafana
register_tool \
    "grafana-primary" \
    "GRAFANA" \
    "Grafana Dashboards" \
    "Grafana Observability Platform" \
    "http://openframe-grafana" \
    3000 \
    "openframe" \
    "password123456789" \
    "" \
    "Web Application" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Loki
register_tool \
    "loki-primary" \
    "LOKI" \
    "Loki Log Aggregation" \
    "Grafana Loki Log Aggregation System" \
    "http://openframe-loki" \
    3100 \
    "" \
    "" \
    "" \
    "Log Storage" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Pinot Controller
register_tool \
    "pinot-controller" \
    "PINOT" \
    "Pinot Controller" \
    "Apache Pinot Real-time Analytics Database Controller" \
    "http://openframe-pinot-controller" \
    9000 \
    "" \
    "" \
    "" \
    "Analytics Database" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Pinot Broker
register_tool \
    "pinot-broker" \
    "PINOT" \
    "Pinot Broker" \
    "Apache Pinot Real-time Analytics Database Broker" \
    "http://openframe-pinot-broker" \
    8099 \
    "" \
    "" \
    "" \
    "Analytics Database" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register Pinot Server
register_tool \
    "pinot-server" \
    "PINOT" \
    "Pinot Server" \
    "Apache Pinot Real-time Analytics Database Server" \
    "http://openframe-pinot-server" \
    8097 \
    "" \
    "" \
    "" \
    "Analytics Database" \
    "OpenFrame Service"

if [ $? -ne 0 ]; then
    exit 1
fi

# Register OpenFrame API Service
register_tool \
    "openframe-api" \
    "OPENFRAME" \
    "OpenFrame API" \
    "OpenFrame API Gateway Service" \
    "http://openframe-api" \
    8095 \
    "" \
    "" \
    "" \
    "API Gateway" \
    "OpenFrame Core"

# Register OpenFrame Config Service
register_tool \
    "openframe-config" \
    "OPENFRAME" \
    "OpenFrame Config" \
    "OpenFrame Configuration Service" \
    "http://openframe-config" \
    8090 \
    "" \
    "" \
    "" \
    "Configuration" \
    "OpenFrame Core"

# Register OpenFrame Stream Service
register_tool \
    "openframe-stream" \
    "OPENFRAME" \
    "OpenFrame Stream" \
    "OpenFrame Stream Processing Service" \
    "http://openframe-stream" \
    8091 \
    "" \
    "" \
    "" \
    "Stream Processing" \
    "OpenFrame Core"

# Register OpenFrame UI Service
register_tool \
    "openframe-ui" \
    "OPENFRAME" \
    "OpenFrame UI" \
    "OpenFrame User Interface Service" \
    "http://openframe-ui" \
    4000 \
    "" \
    "" \
    "" \
    "User Interface" \
    "OpenFrame Core"

# Register OpenFrame Gateway Service
register_tool \
    "openframe-gateway" \
    "OPENFRAME" \
    "OpenFrame Gateway" \
    "OpenFrame Gateway Service" \
    "http://openframe-gateway" \
    8100 \
    "" \
    "" \
    "" \
    "Gateway" \
    "OpenFrame Core"

echo "Integrated tools initialized successfully!"

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