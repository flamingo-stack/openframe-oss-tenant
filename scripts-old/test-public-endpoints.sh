#!/bin/bash

# Test script for publicly accessible endpoints
# This script verifies the health and accessibility of all public endpoints
# that don't require authentication.

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Track overall success
TESTS_FAILED=0
MAX_RETRIES=3
TIMEOUT=5

# Function to test an endpoint with retries
test_endpoint() {
    local service=$1
    local url=$2
    local expected_code=${3:-200}
    local attempt=1
    
    echo -n "Testing $service at $url... "
    
    while [ $attempt -le $MAX_RETRIES ]; do
        response_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time $TIMEOUT $url)
        
        if [ "$response_code" -eq "$expected_code" ]; then
            echo -e "${GREEN}✓${NC} (HTTP $response_code)"
            return 0
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo -e "\n${YELLOW}Retry $attempt/$MAX_RETRIES${NC}"
            sleep 2
        fi
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗${NC} (HTTP $response_code)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
}

# Function to test a metrics endpoint
test_metrics() {
    local service=$1
    local url=$2
    local attempt=1
    
    echo -n "Testing $service metrics at $url... "
    
    while [ $attempt -le $MAX_RETRIES ]; do
        response=$(curl -s --max-time $TIMEOUT $url)
        
        if [[ $response == *"# HELP"* ]]; then
            echo -e "${GREEN}✓${NC} (Valid metrics found)"
            return 0
        fi
        
        if [ $attempt -lt $MAX_RETRIES ]; then
            echo -e "\n${YELLOW}Retry $attempt/$MAX_RETRIES${NC}"
            sleep 2
        fi
        attempt=$((attempt + 1))
    done
    
    echo -e "${RED}✗${NC} (Invalid metrics response)"
    TESTS_FAILED=$((TESTS_FAILED + 1))
    return 1
}

echo "=== Testing Infrastructure Services ==="

# Test metrics exporters
test_metrics "MongoDB Exporter" "http://localhost:9216/metrics"
test_metrics "Cassandra JMX" "http://localhost:9404/metrics"
test_metrics "Redis Exporter" "http://localhost:9121/metrics"
test_metrics "Kafka" "http://localhost:9308/metrics"
test_metrics "Zookeeper" "http://localhost:7070/metrics"
test_metrics "NiFi" "http://localhost:9096/metrics"
test_metrics "Pinot Controller" "http://localhost:9011/metrics"
test_metrics "Pinot Broker" "http://localhost:9012/metrics"
test_metrics "Pinot Server" "http://localhost:9013/metrics"

# Test monitoring endpoints
test_endpoint "Prometheus" "http://localhost:9090/-/healthy"
test_endpoint "Loki" "http://localhost:3100/ready"

# Test service health endpoints
test_endpoint "Config Server" "http://localhost:8888/health"
test_endpoint "OpenFrame API" "http://localhost:8090/health"
test_endpoint "Pinot Controller" "http://localhost:9000/health"
test_endpoint "Pinot Broker" "http://localhost:8099/health"
test_endpoint "Pinot Server" "http://localhost:8097/health"

echo "=== Testing Fleet MDM Services ==="
test_endpoint "Fleet MDM" "http://localhost:8070/health"

echo "=== Testing Tactical RMM Services ==="
test_endpoint "Tactical RMM" "http://localhost:8080/nginx_status"
test_endpoint "Tactical Backend" "http://localhost:8000/health"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ All endpoints are accessible${NC}"
    exit 0
else
    echo -e "\n${RED}✗ $TESTS_FAILED endpoint(s) failed${NC}"
    exit 1
fi
