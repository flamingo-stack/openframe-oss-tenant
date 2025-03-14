#!/bin/bash

# Create required networks
echo "Creating networks if they don't exist..."
docker network create openframe-network --label com.docker.compose.network=openframe-network 2>/dev/null || true

# Function to check if a service is healthy
check_service() {
    local service=$1
    local port=$2
    local max_attempts=30
    local attempt=1

    echo "Waiting for $service to be ready..."
    # Remove the openframe- prefix if it's already there
    local container_name=${service#openframe-}
    while ! docker exec openframe-$container_name nc -z localhost $port; do
        if [ $attempt -eq $max_attempts ]; then
            echo "$service is not available after $max_attempts attempts"
            docker logs openframe-$container_name
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

echo "Starting services..."

# Start infrastructure services first
echo "Starting infrastructure services..."
docker compose -f docker-compose.openframe-infrastructure.yml up -d

# Wait for infrastructure to be ready
wait_for_infrastructure

# Execute initialization scripts
echo "Initializing Cassandra..."
mkdir -p ./cassandra/
docker exec openframe-cassandra cqlsh -f /docker-entrypoint-initdb.d/cassandra-init.cql

# Start Tactical RMM deployment
echo "Starting Tactical RMM deployment..."
docker compose -f docker-compose.openframe-tactical-rmm.yml up -d

# Start Fleet MDM after infrastructure is ready
echo "Starting Fleet MDM deployment..."
docker compose -f docker-compose.openframe-fleet-mdm.yml up -d

# Start Authentik deployment
echo "Starting Authentik deployment..."
docker compose -f docker-compose.openframe-authentik.yml up -d

# Start MeshCentral deployment
echo "Starting MeshCentral deployment..."
docker compose -f docker-compose.openframe-meshcentral.yml up -d

# Wait for Fleet to be ready
check_service "fleet" 8070
if [ $? -ne 0 ]; then
    echo "Failed to start Fleet MDM. Exiting..."
    exit 1
fi

# Wait for Fleet initialization to complete
wait_for_fleet_init

# Function to register an integrated tool
register_tool() {
    local tool_id=$1
    local tool_type=$2
    local name=$3
    local description=$4
    local urls_json=$5
    local username=$6
    local password=$7
    local token=$8
    local category=$9
    local platform_category=${10}
    local layer=${11}
    local layer_order=${12}
    local layer_color=${13}
    local api_key_type=${14:-"BEARER_TOKEN"}
    local api_key_name=${15:-""}

    echo "Registering $name with OpenFrame API..."

    # Build credentials object based on what's provided
    local credentials_parts=()
    if [ ! -z "$username" ]; then
        credentials_parts+=("\"username\": \"$username\"")
    fi
    if [ ! -z "$password" ]; then
        credentials_parts+=("\"password\": \"$password\"")
    fi
    if [ ! -z "$token" ]; then
        local api_key_json="{\"key\": \"$token\", \"type\": \"$api_key_type\""
        if [ "$api_key_type" != "BEARER_TOKEN" ] && [ ! -z "$api_key_name" ]; then
            api_key_json="$api_key_json, \"keyName\": \"$api_key_name\""
        fi
        api_key_json="$api_key_json}"
        credentials_parts+=("\"apiKey\": $api_key_json")
    fi

    local credentials_json="{$(IFS=,; echo "${credentials_parts[*]}")}"

    # Prepare the full JSON payload
    local json_payload="{
        \"tool\": {
            \"id\": \"$tool_id\",
            \"toolType\": \"$tool_type\",
            \"name\": \"$name\",
            \"description\": \"$description\",
            \"toolUrls\": $urls_json,
            \"type\": \"$tool_type\",
            \"category\": \"$category\",
            \"platformCategory\": \"$platform_category\",
            \"enabled\": true,
            \"credentials\": $credentials_json,
            \"layer\": \"$layer\",
            \"layerOrder\": $layer_order,
            \"layerColor\": \"$layer_color\",
            \"metricsPath\": \"/metrics\",
            \"healthCheckEndpoint\": \"/health\",
            \"healthCheckInterval\": 30,
            \"connectionTimeout\": 5000,
            \"readTimeout\": 5000,
            \"allowedEndpoints\": [\"/api/v1/*\", \"/metrics\"]
        }
    }"

    # Print the JSON payload for debugging
    echo "JSON Payload:"
    echo "$json_payload" | jq '.'

    # Send the request
    curl -X POST "http://localhost:8095/v1/tools/$tool_id" \
      -H "Content-Type: application/json" \
      -d "$json_payload" \
      --retry 5 \
      --retry-delay 2 \
      --retry-all-errors \
      -v

    if [ $? -ne 0 ]; then
        echo "Failed to register $name. Exiting..."
        return 1
    fi

    echo "$name registered successfully!"
    return 0
}

# Get Fleet token
FLEET_TOKEN=$(docker exec openframe-fleet cat /etc/fleet/api_token.txt)

# Register OpenFrame UI Service with layer info
register_tool \
    "openframe-ui" \
    "OPENFRAME" \
    "OpenFrame UI" \
    "OpenFrame User Interface Service" \
    '[{"url": "http://openframe-ui", "port": "4000", "type": "DASHBOARD"}]' \
    "" \
    "" \
    "" \
    "User Interface" \
    "OpenFrame Core" \
    "Interface" \
    1 \
    "#FFB300"

# Register OpenFrame Gateway Service with layer info
register_tool \
    "openframe-gateway" \
    "OPENFRAME" \
    "OpenFrame Gateway" \
    "OpenFrame Gateway Service" \
    '[{"url": "http://openframe-gateway", "port": "8100", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Gateway" \
    "OpenFrame Core" \
    "Application" \
    1 \
    "#455A64"

# Register OpenFrame API Service with layer info
register_tool \
    "openframe-api" \
    "OPENFRAME" \
    "OpenFrame API" \
    "OpenFrame API Gateway Service" \
    '[{"url": "http://openframe-api", "port": "8095", "type": "API"}]' \
    "" \
    "" \
    "" \
    "API Gateway" \
    "OpenFrame Core" \
    "Application" \
    2 \
    "#455A64"

# Register OpenFrame Stream Service with layer info
register_tool \
    "openframe-stream" \
    "OPENFRAME" \
    "OpenFrame Stream" \
    "OpenFrame Stream Processing Service" \
    '[{"url": "http://openframe-stream", "port": "8091", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Stream Processing" \
    "OpenFrame Core" \
    "Application" \
    3 \
    "#455A64"

# Register OpenFrame Management Service with layer info
register_tool \
    "openframe-management" \
    "OPENFRAME" \
    "OpenFrame Management" \
    "OpenFrame Management Service" \
    '[{"url": "http://openframe-management", "port": "8096", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Management" \
    "OpenFrame Core" \
    "Application" \
    4 \
    "#455A64"

# Register OpenFrame Config Service with layer info
register_tool \
    "openframe-config" \
    "OPENFRAME" \
    "OpenFrame Config" \
    "OpenFrame Configuration Service" \
    '[{"url": "http://openframe-config", "port": "8090", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Configuration" \
    "OpenFrame Core" \
    "Configuration" \
    1 \
    "#FFB74D"

# Register Kafka with layer info
register_tool \
    "kafka-primary" \
    "KAFKA" \
    "Kafka Message Broker" \
    "Apache Kafka Event Streaming Platform" \
    '[{"url": "http://openframe-kafka-ui", "port": "8081", "type": "DASHBOARD"}, {"url": "http://openframe-kafka", "port": "9092", "type": "BROKER"}, {"url": "http://openframe-kafka", "port": "29092", "type": "INTERNAL"}]' \
    "" \
    "" \
    "" \
    "Message Broker" \
    "OpenFrame Service" \
    "Streaming" \
    1 \
    "#1E88E5"

# Register Zookeeper with layer info
register_tool \
    "zookeeper-primary" \
    "ZOOKEEPER" \
    "Zookeeper Coordinator" \
    "Apache Zookeeper Distributed Coordinator" \
    '[{"url": "http://openframe-zookeeper", "port": "2181", "type": "COORDINATOR"}]' \
    "" \
    "" \
    "" \
    "Service Discovery" \
    "OpenFrame Service" \
    "Streaming" \
    2 \
    "#1E88E5"

# Register NiFi with layer info
register_tool \
    "nifi-primary" \
    "NIFI" \
    "Apache NiFi" \
    "NiFi Data Integration Platform" \
    '[{"url": "https://openframe-nifi", "port": "8443", "type": "DASHBOARD"}, {"url": "https://openframe-nifi", "port": "9096", "type": "API"}]' \
    "openframe" \
    "password123456789" \
    "" \
    "Data Integration" \
    "OpenFrame Service" \
    "Data Integration" \
    1 \
    "#0D47A1"

# Register MongoDB with layer info
register_tool \
    "mongodb-primary" \
    "MONGODB" \
    "MongoDB Database" \
    "MongoDB NoSQL Database" \
    '[{"url": "mongodb://openframe-mongodb", "port": "27017", "type": "DATABASE"}, {"url": "http://openframe-mongo-express", "port": "8010", "type": "DASHBOARD"}]' \
    "openframe" \
    "password123456789" \
    "" \
    "NoSQL Database" \
    "OpenFrame Datasource" \
    "Datasource" \
    1 \
    "#616161"

# Register Redis with layer info
register_tool \
    "redis-primary" \
    "REDIS" \
    "Redis Cache" \
    "Redis In-Memory Cache" \
    '[{"url": "redis://openframe-redis", "port": "6379", "type": "DATABASE"}]' \
    "" \
    "" \
    "" \
    "In-Memory Database" \
    "OpenFrame Datasource" \
    "Datasource" \
    2 \
    "#616161"

# Register Cassandra with layer info
register_tool \
    "cassandra-primary" \
    "CASSANDRA" \
    "Cassandra Database" \
    "Cassandra Distributed Database" \
    '[{"url": "cassandra://openframe-cassandra", "port": "9042", "type": "DATABASE"}]' \
    "" \
    "" \
    "" \
    "NoSQL Database" \
    "OpenFrame Datasource" \
    "Datasource" \
    3 \
    "#616161"

# Register Pinot with layer info
register_tool \
    "pinot-primary" \
    "PINOT" \
    "Apache Pinot" \
    "Apache Pinot Real-time Analytics Database" \
    '[{"url": "http://openframe-pinot-controller", "port": "9000", "type": "CONTROLLER"},{"url": "http://openframe-pinot-broker", "port": "8099", "type": "BROKER"},{"url": "http://openframe-pinot-server", "port": "8097", "type": "SERVER"}]' \
    "" \
    "" \
    "" \
    "Analytics Database" \
    "OpenFrame Service" \
    "Datasource" \
    4 \
    "#616161"

# Register Integrated Tools MySQL
register_tool \
    "integrated-tools-mysql" \
    "MYSQL" \
    "Integrated Tools MySQL" \
    "MySQL Database for Integrated Tools" \
    '[{"url": "mysql://openframe-integrated-tools-mysql", "port": "3306", "type": "DATABASE"}]' \
    "integrated-tools-user" \
    "integrated-tools-password-1234" \
    "" \
    "SQL Database" \
    "Integrated Tool" \
    "Integrated Tools Datasource" \
    1 \
    "#9E9E9E"

# Register Integrated Tools PostgreSQL
register_tool \
    "integrated-tools-postgresql" \
    "POSTGRESQL" \
    "Integrated Tools PostgreSQL" \
    "PostgreSQL Database for Integrated Tools" \
    '[{"url": "postgresql://openframe-integrated-tools-postgresql", "port": "5432", "type": "DATABASE"}]' \
    "integrated-tools-user" \
    "integrated-tools-password-1234" \
    "" \
    "SQL Database" \
    "Integrated Tool" \
    "Integrated Tools Datasource" \
    2 \
    "#9E9E9E"

# Register Integrated Tools Redis
register_tool \
    "integrated-tools-redis" \
    "REDIS" \
    "Integrated Tools Redis" \
    "Redis Cache for Integrated Tools" \
    '[{"url": "redis://openframe-integrated-tools-redis", "port": "6379", "type": "DATABASE"}]' \
    "" \
    "" \
    "" \
    "In-Memory Database" \
    "Integrated Tool" \
    "Integrated Tools Datasource" \
    3 \
    "#9E9E9E"

# Register Fleet with layer info
register_tool \
    "fleet" \
    "FLEET" \
    "Fleet MDM" \
    "Fleet Device Management Platform" \
    '[{"url": "http://openframe-fleet", "port": "8070", "type": "API"}, {"url": "http://openframe-fleet", "port": "8070", "type": "DASHBOARD"}]' \
    "admin@openframe.local" \
    "openframe123!" \
    "$FLEET_TOKEN" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    1 \
    "#455A64" \
    "BEARER_TOKEN"

# Register MeshCentral with layer info
register_tool \
    "meshcentral" \
    "MESHCENTRAL" \
    "MeshCentral" \
    "MeshCentral Remote Management Platform" \
    '[{"url": "https://openframe-meshcentral-nginx", "port": "8383", "type": "DASHBOARD"}, {"url": "https://openframe-meshcentral", "port": "8383", "type": "API"}]' \
    "mesh@openframe.io" \
    "meshpass@1234" \
    "" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    2 \
    "#455A64"

# Register Authentik with layer info
register_tool \
    "authentik" \
    "AUTHENTIK" \
    "Authentik SSO" \
    "Authentik Identity Provider" \
    '[{"url": "http://openframe-authentik-server", "port": "9000", "type": "API"}, {"url": "http://openframe-authentik-server", "port": "9000", "type": "DASHBOARD"}]' \
    "akadmin@openframe.local" \
    "openframe123!" \
    "openframe-api-token-123456789" \
    "Identity Provider" \
    "Integrated Tool" \
    "Integrated Tools" \
    4 \
    "#455A64" \
    "HEADER" \
    "Authorization"

# Register Grafana with layer info
register_tool \
    "grafana-primary" \
    "GRAFANA" \
    "Grafana" \
    "Grafana Monitoring Dashboard" \
    '[{"url": "http://openframe-grafana", "port": "3000", "type": "DASHBOARD"}, {"url": "http://openframe-grafana", "port": "3000", "type": "API"}]' \
    "openframe" \
    "password123456789" \
    "" \
    "Monitoring Dashboard" \
    "OpenFrame Service" \
    "Monitoring" \
    1 \
    "#78909C"

# Register Prometheus with layer info
register_tool \
    "prometheus-primary" \
    "PROMETHEUS" \
    "Prometheus" \
    "Prometheus Metrics Database" \
    '[{"url": "http://openframe-prometheus", "port": "9090", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Metrics Database" \
    "OpenFrame Service" \
    "Monitoring" \
    2 \
    "#78909C"

# Register Loki with layer info
register_tool \
    "loki-primary" \
    "LOKI" \
    "Loki" \
    "Loki Log Aggregation System" \
    '[{"url": "http://openframe-loki", "port": "3100", "type": "API"}]' \
    "" \
    "" \
    "" \
    "Log Aggregation" \
    "OpenFrame Service" \
    "Monitoring" \
    3 \
    "#78909C"

# Get Tactical RMM API key
echo "Getting Tactical RMM API key..."
TACTICAL_API_KEY=$(docker exec openframe-tactical-redis redis-cli get tactical_api_key | tr -d '"')
echo "Tactical RMM API key: $TACTICAL_API_KEY"

# Register Tactical RMM with layer info
register_tool \
    "tactical-rmm" \
    "TACTICAL_RMM" \
    "Tactical RMM" \
    "Remote Monitoring and Management Platform" \
    '[{"url": "http://openframe-tactical-backend", "port": "8000", "type": "API"}, {"url": "http://openframe-tactical-frontend", "port": "8080", "type": "DASHBOARD"}]' \
    "tactical" \
    "tactical" \
    "$TACTICAL_API_KEY" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    3 \
    "#455A64" \
    "HEADER" \
    "X-API-KEY"

echo "Tactical RMM registered successfully!"

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
echo "- Tactical RMM: http://localhost:8080"
echo "- Tactical RMM API: http://localhost:8000"
echo "- Tactical RMM Websockets: http://localhost:8384"
echo "- Kafka UI: http://localhost:8081"
echo "- MongoDB Express: http://localhost:8082"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"
echo "- Fleet MDM: http://localhost:8070"
echo "- MeshCentral: http://localhost:8383"
echo "- OpenFrame Config Service: http://localhost:8090"
echo "- OpenFrame Stream Service: http://localhost:8091"
echo "- OpenFrame API Service: http://localhost:8092"

