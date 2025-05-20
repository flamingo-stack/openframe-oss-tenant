#!/bin/bash

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
    local CA_SECRET="platform-certificate"
    local CA_NAMESPACE="platform"
    local TMP_CA_PATH
    TMP_CA_PATH=$(mktemp)

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
        if [ "$api_key_type" != "NONE" ]; then
            local api_key_json="{\"key\": \"$token\", \"type\": \"$api_key_type\""
            if [ "$api_key_type" != "BEARER_TOKEN" ] && [ ! -z "$api_key_name" ]; then
                api_key_json="$api_key_json, \"keyName\": \"$api_key_name\""
            fi
            api_key_json="$api_key_json}"
            credentials_parts+=("\"apiKey\": $api_key_json")
        fi
    fi

    local credentials_json="{$(
        IFS=,
        echo "${credentials_parts[*]}"
    )}"

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
    
    # Extract CA certificate for the request
    kubectl get secret "$CA_SECRET" -n "$CA_NAMESPACE" -o jsonpath='{.data.ca\.crt}' 2>/dev/null | base64 -d > "$TMP_CA_PATH" || {
    echo "Failed to extract or decode CA cert"
    rm -f "$TMP_CA_PATH"; return 1
    }
    [ -s "$TMP_CA_PATH" ] || { echo "CA cert is empty"; rm -f "$TMP_CA_PATH"; return 1; }

    # Print the JSON payload for debugging
    echo "JSON Payload:"
    echo "$json_payload" | jq '.'

    # Send the request
    curl --cacert "$TMP_CA_PATH" -X POST "https://openframe-management.192.168.100.100.nip.io/v1/tools/$tool_id" \
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

# Register OpenFrame UI Service with layer info
register_tool \
    "openframe-ui" \
    "OPENFRAME" \
    "OpenFrame UI" \
    "OpenFrame User Interface Service" \
    '[{"url": "http://openframe-ui.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}]' \
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
    '[{"url": "http://openframe-gateway.openframe-microservices.svc", "port": "8100", "type": "API"}]' \
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
    '[{"url": "http://openframe-api.openframe-microservices.svc", "port": "8095", "type": "API"}]' \
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
    '[{"url": "http://openframe-stream.openframe-microservices.svc", "port": "8091", "type": "API"}]' \
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
    '[{"url": "http://openframe-management.openframe-microservices.svc", "port": "8096", "type": "API"}]' \
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
    '[{"url": "http://openframe-config.openframe-microservices.svc", "port": "8090", "type": "API"}]' \
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
    '[{"url": "http://kafka-ui.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}, {"url": "http://openframe-kafka.openframe-datasources", "port": "9092", "type": "BROKER"}, {"url": "http://openframe-kafka.openframe-datasources", "port": "29092", "type": "INTERNAL"}]' \
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
    '[{"url": "http://zookeeper.openframe-datasources", "port": "2181", "type": "COORDINATOR"}]' \
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
    '[{"url": "https://openframe-nifi.192.168.100.100.nip.io", "port": "443", "type": "DASHBOARD"}, {"url": "https://openframe-nifi.openframe-datasources", "port": "9096", "type": "API"}]' \
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
    '[{"url": "mongodb://openframe-mongodb.openframe-datasources", "port": "27017", "type": "DATABASE"}, {"url": "http://mongo-express.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}]' \
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
    '[{"url": "redis://openframe-redis-headless.openframe-datasources", "port": "6379", "type": "DATABASE"}]' \
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
    '[{"url": "cassandra://openframe-cassandra.openframe-datasources", "port": "9042", "type": "DATABASE"}]' \
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
    '[{"url": "http://openframe-pinot-controller.openframe-datasources.svc", "port": "9000", "type": "CONTROLLER"},{"url": "http://openframe-pinot-broker.openframe-datasources.svc", "port": "8099", "type": "BROKER"},{"url": "http://openframe-pinot-server.openframe-datasources.svc", "port": "8097", "type": "SERVER"}]' \
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
# Get Fleet token
POD=$(kubectl -n integrated-tools get pods -o name -l app=fleet)
FLEET_TOKEN=$(kubectl exec -n integrated-tools $POD -- cat /etc/fleet/api_token.txt)
register_tool \
    "fleet" \
    "FLEET" \
    "Fleet MDM" \
    "Fleet Device Management Platform" \
    '[{"url": "http://fleet.192.168.100.100.nip.io", "port": "80", "type": "API"}, {"url": "http://fleet.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}]' \
    "admin@openframe.local" \
    "openframe123!" \
    "$FLEET_TOKEN" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    1 \
    "#455A64" \
    "BEARER_TOKEN"

# Get MeshCentral API key
# echo "Getting MeshCentral API key..."
# POD=$(kubectl -n integrated-tools get pods -o name -l app=meshcentral)
# MESHCENTRAL_API_KEY=$(kubectl exec -n integrated-tools $POD -- cat /opt/mesh/mesh_token)
# echo "MeshCentral API key: $MESHCENTRAL_API_KEY"

# Register MeshCentral with layer info
register_tool \
    "meshcentral" \
    "MESHCENTRAL" \
    "MeshCentral" \
    "MeshCentral Remote Management Platform" \
    '[{"url": "https://meshcentral.192.168.100.100.nip.io", "port": "443", "type": "DASHBOARD"}, {"url": "https://meshcentral.192.168.100.100.nip.io", "port": "443", "type": "API"}, {"url": "wss://meshcentral.192.168.100.100.nip.io", "port": "443", "type": "WS"}]' \
    "mesh@openframe.io" \
    "meshpass@1234" \
    "NONE" \
    "Device Management" \
    "Integrated Tool" \
    "Integrated Tools" \
    2 \
    "#455A64" \
    "NONE"

# Register Authentik with layer info
register_tool \
    "authentik" \
    "AUTHENTIK" \
    "Authentik SSO" \
    "Authentik Identity Provider" \
    '[{"url": "http://authentik.192.168.100.100.nip.io", "port": "80", "type": "API"}, {"url": "http://authentik.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}]' \
    "akadmin@openframe.local" \
    "openframe123!" \
    "openframe-api-token-123456789" \
    "Identity Provider" \
    "Integrated Tool" \
    "Integrated Tools" \
    4 \
    "#455A64" \
    "BEARER_TOKEN"

# Register Grafana with layer info
register_tool \
    "grafana-primary" \
    "GRAFANA" \
    "Grafana" \
    "Grafana Monitoring Dashboard" \
    '[{"url": "https://grafana.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}, {"url": "http://grafana.192.168.100.100.nip.io", "port": "80", "type": "API"}]' \
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
    '[{"url": "http://prometheus.192.168.100.100.nip.io", "port": "80", "type": "API"}]' \
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
    '[{"url": "http://openframe-loki.platform.svc", "port": "3100", "type": "API"}]' \
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
POD=$(kubectl -n integrated-tools get pods -o name -l app=tactical-backend)
TACTICAL_API_KEY=$(kubectl exec -n integrated-tools $POD -- cat /opt/tactical/api_key.txt)
echo "Tactical RMM API key: $TACTICAL_API_KEY"

# Register Tactical RMM with layer info
register_tool \
    "tactical-rmm" \
    "TACTICAL_RMM" \
    "Tactical RMM" \
    "Remote Monitoring and Management Platform" \
    '[{"url": "http://tactical-api.192.168.100.100.nip.io", "port": "80", "type": "API"}, {"url": "http://tactical-ui.192.168.100.100.nip.io", "port": "80", "type": "DASHBOARD"}, {"url": "ws://tactical-nginx.integrated-tools.svc.cluster.local", "port": "8000", "type": "WS"}]' \
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

# Print Fleet credentials
echo "Fleet MDM Credentials:"
echo "Admin User:           admin@openframe.local"
echo "Admin Password:       openframe123!"
echo "API User:             api@openframe.local"
echo "API Password:         openframe123!"
echo "Fleet API Token:      $FLEET_TOKEN"
echo
echo "OpenFrame is running!"
echo
echo "Access points:"
echo "- Tactical RMM: http://tactical-ui.192.168.100.100.nip.io"
echo "- Tactical RMM API: http://tactical-api.192.168.100.100.nip.io"
echo "- Tactical RMM Websockets: http://localhost:8384"
echo "- Kafka UI: http://kafka-ui.192.168.100.100.nip.io"
echo "- MongoDB Express: http://mongo-express.192.168.100.100.nip.io"
echo "- NiFi: https://openframe-nifi.192.168.100.100.nip.io/"
echo "- Grafana: https://grafana.192.168.100.100.nip.io"
echo "- Prometheus: http://prometheus.192.168.100.100.nip.io"
echo "- Fleet MDM: http://fleet.192.168.100.100.nip.io"
echo "- MeshCentral: https://meshcentral.192.168.100.100.nip.io"
echo "- Authentik: http://authentik.192.168.100.100.nip.io"
echo "- OpenFrame Config Service: http://localhost:8090"
echo "- OpenFrame Stream Service: http://localhost:8091"
echo "- OpenFrame API Service: http://localhost:8092"
echo
echo "All ingresses:"
kubectl get ingress -A | tr -s "  " " " | cut -d " " -f 4 | grep -v HOSTS
