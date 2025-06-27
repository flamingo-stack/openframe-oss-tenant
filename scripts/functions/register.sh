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
    local debezium_connector=${16:-""}
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

    # Prepare the full JSON payload using jq
    local json_payload=$(jq -n \
        --arg id "$tool_id" \
        --arg type "$tool_type" \
        --arg name "$name" \
        --arg desc "$description" \
        --argjson urls "$urls_json" \
        --arg cat "$category" \
        --arg pcat "$platform_category" \
        --argjson creds "$credentials_json" \
        --arg layer "$layer" \
        --arg order "$layer_order" \
        --arg color "$layer_color" \
        --arg dbconn "$debezium_connector" \
        '{
            tool: {
                id: $id,
                toolType: $type,
                name: $name,
                description: $desc,
                toolUrls: $urls,
                type: $type,
                category: $cat,
                platformCategory: $pcat,
                enabled: true,
                credentials: $creds,
                layer: $layer,
                layerOrder: ($order | tonumber),
                layerColor: $color,
                metricsPath: "/metrics",
                healthCheckEndpoint: "/health",
                healthCheckInterval: 30,
                connectionTimeout: 5000,
                readTimeout: 5000,
                allowedEndpoints: ["/api/v1/*", "/metrics"],
                debeziumConnector: (if $dbconn == "" then null else $dbconn end)
            }
        }')

    # Print the JSON payload for debugging
    echo "JSON Payload:"
    echo "$json_payload"

    if [ $? -ne 0 ]; then
        echo "Error: Failed to create JSON payload"
        return 1
    fi

    # Extract CA certificate for the request
    kubectl get secret "$CA_SECRET" -n "$CA_NAMESPACE" -o jsonpath='{.data.ca\.crt}' 2>/dev/null | base64 -d > "$TMP_CA_PATH" || {
    echo "Failed to extract or decode CA cert"
    rm -f "$TMP_CA_PATH"; return 1
    }
    [ -s "$TMP_CA_PATH" ] || { echo "CA cert is empty"; rm -f "$TMP_CA_PATH"; return 1; }

    # Send the request
    curl --cacert "$TMP_CA_PATH" -X POST "https://openframe-management.192.168.100.100.nip.io/v1/tools/$tool_id" \
        -H "Content-Type: application/json" \
        -d "$json_payload" \
        --retry 5 \
        --retry-delay 2 \
        --retry-all-errors \
        --silent --show-error

    if [ $? -ne 0 ]; then
        echo "Failed to register $name. Exiting..."
        return 1
    fi

    echo "$name registered successfully!"
    return 0
}


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
    "NONE" \
    "NONE" \
    '{
       "name": "meshcentral-mongo-connector",
       "config": {
         "connector.class": "io.debezium.connector.mongodb.MongoDbConnector",
         "mongodb.connection.string": "mongodb://meshcentral-mongodb.integrated-tools.svc.cluster.local:27017/meshcentral?replicaSet=rs0",
         "mongodb.name": "meshcentral",
         "topic.prefix": "meshcentral",
         "collection.include.list": "meshcentral.power,meshcentral.events",
         "transforms": "route",
         "transforms.route.type": "org.apache.kafka.connect.transforms.RegexRouter",
         "transforms.route.regex": ".*",
         "transforms.route.replacement": "meshcentral.mongodb.events"
       }
     }'



# Get Tactical RMM API key
echo "Getting Tactical RMM API key..."
POD=$(kubectl -n integrated-tools get pods -o name -l app=tactical-backend)
TACTICAL_API_KEY=$(kubectl exec -n integrated-tools $POD -c openframe-tactical-backend -- cat /opt/tactical/api_key.txt)
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
    "X-API-KEY" \
    '{
       "name": "tactical-rmm-psql-connector",
       "config": {
         "connector.class": "io.debezium.connector.postgresql.PostgresConnector",
         "tasks.max": "1",
         "database.hostname": "tactical-postgres.integrated-tools.svc.cluster.local",
         "database.port": "5432",
         "database.user": "postgres",
         "database.password": "postgrespass",
         "database.dbname": "tacticalrmm",
         "topic.prefix": "trmm_clients_users",
         "table.include.list": "public.logs_auditlog",
         "plugin.name": "pgoutput",
         "topic.creation.default.replication.factor": 1,
         "topic.creation.default.partitions": 10,
         "topic.creation.default.cleanup.policy": "compact",
         "topic.creation.default.compression.type": "lz4",
         "transforms": "route",
         "transforms.route.type": "io.debezium.transforms.ByLogicalTableRouter",
         "transforms.route.topic.regex": "trmm_clients_users\\.(.*)",
         "transforms.route.topic.replacement": "tactical-rmm.postgres.events"
       }
     }'

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
