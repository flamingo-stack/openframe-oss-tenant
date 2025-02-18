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


# Function to wait for Tactical RMM initialization
wait_for_tactical_rmm_init() {
    echo "Waiting for Tactical RMM initialization..."
    local max_attempts=60
    local attempt=1
    
    # Add initial delay to allow service to fully start
    echo "Waiting 30 seconds for initial service startup..."
    sleep 30
    
    while [ $attempt -lt $max_attempts ]; do
        # Try to access the API endpoint to check if the service is ready
        local response=$(curl -k -s \
            -X POST \
            -H "Content-Type: application/json" \
            -H "Accept: application/json" \
            -d '{"username":"tactical","password":"tactical"}' \
            https://api.tactical.local/v2/checkcreds/ \
            -w "\n%{http_code}")
            
        local status=$(echo "$response" | tail -n1)
        local body=$(echo "$response" | head -n-1)
        
        echo "Attempt $attempt: HTTP Status: $status"
        echo "Response body: $body"
        
        if [ "$status" = "200" ] || [ "$status" = "400" ] || [ "$status" = "401" ]; then
            # We get 200/400/401 when the service is up
            echo "Tactical RMM initialization completed successfully!"
            # Extract and save the token immediately if we get it
            if echo "$body" | grep -q '"token"'; then
                local token=$(echo "$body" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
                echo "$token" > /tmp/tactical_rmm_token.txt
                echo "Token saved successfully"
            fi
            return 0
        elif [ "$status" = "000" ]; then
            echo "Connection refused - service might not be ready yet"
        else 
            echo "Unexpected status code: $status"
        fi
        
        # Check if the container is still running (using correct container name)
        if ! docker ps | grep -q "trmm-backend"; then
            echo "ERROR: Tactical RMM backend container is not running!"
            docker ps -a | grep "trmm-"
            return 1
        fi
        
        echo "Waiting for Tactical RMM initialization... (attempt $attempt/$max_attempts)"
        attempt=$((attempt + 1))
        sleep 15
    done
    
    echo "Tactical RMM initialization failed after $max_attempts attempts"
    echo "Checking container logs..."
    docker logs $(docker ps -qf "name=trmm-backend") 2>&1 | tail -n 50
    return 1
}

# Function to generate Tactical RMM API keys
generate_tactical_rmm_api_keys() {
    echo "Generating Tactical RMM API keys..."
    
    # Get the authentication token first
    echo "Attempting to authenticate with Tactical RMM..."
    local auth_response=$(curl -k -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Accept: application/json" \
        -d '{"username":"tactical","password":"tactical"}' \
        https://api.tactical.local/v2/checkcreds/)
    
    echo "Auth response: $auth_response"
    
    # Extract the token using jq if available, fallback to grep if not
    local auth_token=""
    if command -v jq >/dev/null 2>&1; then
        auth_token=$(echo "$auth_response" | jq -r '.token // empty' 2>/dev/null)
    else
        auth_token=$(echo "$auth_response" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
    fi
    
    if [ -z "$auth_token" ]; then
        echo "Failed to get authentication token"
        echo "Full authentication response:"
        echo "$auth_response"
        return 1
    fi
    
    echo "Authentication token obtained successfully"
    
    # Use the token to generate a new API key
    echo "Attempting to generate new API key..."
    local api_key_response=$(curl -k -s \
        -X POST \
        -H "Content-Type: application/json" \
        -H "Authorization: Token $auth_token" \
        -d '{"name": "new-tactical-api-key", "user": 2, "expiration": null, "permissions": ["can_use_api"]}' \
        https://api.tactical.local/accounts/apikeys/)
    
    echo "API key generation response: $api_key_response"
    
    # Store the token for later use
    echo "$auth_token" > /tmp/tactical_rmm_token.txt
    
    # Verify the API key was created
    if echo "$api_key_response" | grep -q '"key":'; then
        echo "Tactical RMM API keys generated successfully"
        return 0
    else
        echo "Failed to generate API key"
        return 1
    fi
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
echo "Starting Fleet MDM deployment..."
docker-compose -f docker-compose.openframe-fleet-mdm.yml up -d

# Start Fleet MDM only after infrastructure is ready
echo "Starting Authentik deployment..."
docker-compose -f docker-compose.openframe-authentik.yml up -d

# Start Tactical RMM deployment
echo "Starting Tactical RMM deployment..."
docker-compose -f docker-compose.openframe-tactical-rmm.yml up -d

echo "Waiting 3 minutes for Tactical RMM startup..."
sleep 180

# Wait for Tactical RMM initialization to complete
if wait_for_tactical_rmm_init; then
    # Generate API keys only after initialization is complete
    generate_tactical_rmm_api_keys
else
    echo "Failed to initialize Tactical RMM"
    exit 1
fi

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
    local url=$5
    local port=$6
    local username=$7
    local password=$8
    local token=$9
    local category=${10}
    local platform_category=${11}
    local layer=${12}
    local layer_order=${13}
    local layer_color=${14}

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

    #TODO - generate api keys automatically for tactical rmm

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
          \"layer\": \"$layer\",
          \"layerOrder\": $layer_order,
          \"layerColor\": \"$layer_color\",
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

# Register OpenFrame UI Service with layer info
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
    "http://openframe-gateway" \
    8100 \
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
    "http://openframe-api" \
    8095 \
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
    "http://openframe-stream" \
    8091 \
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
    "http://openframe-management" \
    8096 \
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
    "http://openframe-config" \
    8090 \
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
    "http://openframe-kafka-ui" \
    9092 \
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
    "http://openframe-zookeeper" \
    2181 \
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
    "https://openframe-nifi" \
    8443 \
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
    "mongodb://openframe-mongodb" \
    27017 \
    "openframe" \
    "password123456789" \
    "mongodb-token" \
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
    "redis://openframe-redis" \
    6379 \
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
    "cassandra://openframe-cassandra" \
    9042 \
    "" \
    "" \
    "" \
    "NoSQL Database" \
    "OpenFrame Datasource" \
    "Datasource" \
    3 \
    "#616161"

# Register Pinot Controller with layer info
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
    "OpenFrame Service" \
    "Datasource" \
    4 \
    "#616161"

# Register Pinot Broker with layer info
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
    "OpenFrame Service" \
    "Datasource" \
    5 \
    "#616161"

# Register Pinot Server with layer info
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
    "OpenFrame Service" \
    "Datasource" \
    6 \
    "#616161"

# Register Integrated Tools MySQL
register_tool \
    "integrated-tools-mysql" \
    "MYSQL" \
    "Integrated Tools MySQL" \
    "MySQL Database for Integrated Tools" \
    "mysql://openframe-integrated-tools-mysql" \
    3306 \
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
    "postgresql://openframe-integrated-tools-postgresql" \
    5432 \
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
    "redis://openframe-integrated-tools-redis" \
    6379 \
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
    "http://openframe-fleet" \
    8070 \
    "admin@openframe.local" \
    "openframe123!" \
    "$FLEET_TOKEN" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    1 \
    "#455A64"

# Register Authentik with layer info
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
    "Identity Provider" \
    "Integrated Tool" \
    "Integrated Tools" \
    2 \
    "#455A64"

# Register Grafana with layer info
register_tool \
    "grafana-primary" \
    "GRAFANA" \
    "Grafana" \
    "Grafana Monitoring Dashboard" \
    "http://openframe-grafana" \
    3000 \
    "admin" \
    "admin" \
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
    "http://openframe-prometheus" \
    9090 \
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
    "http://openframe-loki" \
    3100 \
    "" \
    "" \
    "" \
    "Log Aggregation" \
    "OpenFrame Service" \
    "Monitoring" \
    3 \
    "#78909C"

# Get Tactical RMM API key from Redis
TACTICAL_API_KEY=$(docker exec openframe-tactical-redis redis-cli get tactical_api_key | tr -d '"')

# Register Tactical RMM with layer info
register_tool \
    "tactical-rmm" \
    "TACTICAL_RMM" \
    "Tactical RMM" \
    "Remote Monitoring and Management Platform" \
    "http://openframe-tactical-backend" \
    8000 \
    "tactical" \
    "tactical" \
    "$TACTICAL_API_KEY" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    3 \
    "#455A64"

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
echo "- Kafka UI: http://localhost:8080"
echo "- MongoDB Express: http://localhost:8081"
echo "- NiFi: https://localhost:8443"
echo "- Grafana: http://localhost:3000"
echo "- Prometheus: http://localhost:9090"
echo "- Fleet MDM: http://localhost:8070"
echo "- OpenFrame Config Service: http://localhost:8090"
echo "- OpenFrame Stream Service: http://localhost:8091"
echo "- OpenFrame API Service: http://localhost:8092"
