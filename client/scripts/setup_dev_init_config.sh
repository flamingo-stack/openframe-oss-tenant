#!/bin/bash

# Setup Development Initial Configuration Script
# This script fetches the active registration secret from the OpenFrame API

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Default API URL
API_URL="https://localhost/api/agent/registration-secret/active"
# Default Org ID for dev setup
ORG_ID="test-org"

# Will be populated by ensure_mkcert
LOCAL_CA_CERT_PATH=""

echo -e "${GREEN}OpenFrame Development Setup - Initial Configuration${NC}"
echo "============================================================"
echo

# Function to prompt for access token
get_access_token() {
    echo -e "${YELLOW}Please enter your access token:${NC}"
    read -s ACCESS_TOKEN
    echo
    
    if [ -z "$ACCESS_TOKEN" ]; then
        echo -e "${RED}Error: Access token cannot be empty${NC}"
        exit 1
    fi
}

# Function to make API request
fetch_registration_secret() {
    echo -e "${YELLOW}Fetching registration secret from API...${NC}"
    echo "URL: $API_URL"
    echo
    
    # Create temporary files for curl output
    temp_response=$(mktemp)
    temp_headers=$(mktemp)
    
    # Cleanup temp files on exit
    trap "rm -f $temp_response $temp_headers" EXIT
    
    echo -e "${YELLOW}Making curl request...${NC}"
    
    # Make curl request with verbose error handling
    curl_exit_code=0
    curl -s -S \
        -w "HTTP_STATUS:%{http_code}\n" \
        -H "Authorization: Bearer $ACCESS_TOKEN" \
        -H "Content-Type: application/json" \
        -k \
        --connect-timeout 30 \
        --max-time 60 \
        "$API_URL" > "$temp_response" 2>&1 || curl_exit_code=$?
    
    echo -e "${YELLOW}Curl exit code: $curl_exit_code${NC}"
    
    if [ $curl_exit_code -ne 0 ]; then
        echo -e "${RED}✗ Curl command failed with exit code: $curl_exit_code${NC}"
        echo -e "${RED}Curl error output:${NC}"
        cat "$temp_response"
        echo
        
        case $curl_exit_code in
            6) echo -e "${RED}Error: Couldn't resolve host. Check if the server is running.${NC}" ;;
            7) echo -e "${RED}Error: Failed to connect to host. Check if the server is running on the correct port.${NC}" ;;
            35) echo -e "${RED}Error: SSL connect error. The SSL/TLS handshake failed.${NC}" ;;
            60) echo -e "${RED}Error: SSL certificate problem. Using -k to skip certificate verification.${NC}" ;;
            *) echo -e "${RED}Error: Unknown curl error. Check the curl documentation for exit code $curl_exit_code${NC}" ;;
        esac
        
        exit 1
    fi
    
    # Read the response
    response_content=$(cat "$temp_response")
    
    echo -e "${YELLOW}Raw response:${NC}"
    echo "$response_content"
    echo
    
    # Extract HTTP status and response body
    if echo "$response_content" | grep -q "HTTP_STATUS:"; then
        http_status=$(echo "$response_content" | grep -o "HTTP_STATUS:[0-9]*" | cut -d: -f2)
        # Remove HTTP_STATUS part from response to get clean JSON
        response_body=$(echo "$response_content" | sed 's/HTTP_STATUS:[0-9]*$//')
    else
        echo -e "${RED}✗ Could not parse HTTP status from response${NC}"
        echo -e "${YELLOW}Full response:${NC}"
        echo "$response_content"
        exit 1
    fi
    
    echo -e "${YELLOW}HTTP Status: $http_status${NC}"
    echo -e "${YELLOW}Response Body:${NC}"
    echo "$response_body"
    echo
    
    # Check if request was successful
    if [ "$http_status" = "200" ]; then
        echo -e "${GREEN}✓ Successfully fetched registration secret${NC}"
        
        # Pretty print JSON if jq is available
        if command -v jq &> /dev/null && [ ! -z "$response_body" ]; then
            echo
            echo -e "${GREEN}Formatted Response:${NC}"
            echo "$response_body" | jq . || echo "$response_body"
        fi
        
        # Extract the key from response
        if command -v jq &> /dev/null; then
            initial_key=$(echo "$response_body" | jq -r '.key')
        else
            # Fallback: extract key using grep and sed (less reliable)
            initial_key=$(echo "$response_body" | grep -o '"key":"[^"]*"' | cut -d'"' -f4)
        fi
        
        if [ -z "$initial_key" ] || [ "$initial_key" = "null" ]; then
            echo -e "${RED}✗ Could not extract key from response${NC}"
            exit 1
        fi
        
        echo -e "${GREEN}Extracted key: $initial_key${NC}"
        
        # Create init_config.json file
        create_init_config "$initial_key"
    elif [ "$http_status" = "401" ]; then
        echo -e "${RED}✗ Authentication failed (401 Unauthorized)${NC}"
        echo -e "${RED}Please check your access token${NC}"
        exit 1
    elif [ "$http_status" = "404" ]; then
        echo -e "${RED}✗ Endpoint not found (404 Not Found)${NC}"
        echo -e "${RED}Please check the API URL${NC}"
        exit 1
    elif [ "$http_status" = "500" ]; then
        echo -e "${RED}✗ Server error (500 Internal Server Error)${NC}"
        echo -e "${RED}Please check the server logs${NC}"
        exit 1
    else
        echo -e "${RED}✗ Failed to fetch registration secret${NC}"
        echo -e "${RED}HTTP Status: $http_status${NC}"
        exit 1
    fi
}

# Ensure mkcert is installed and a root CA is available; populate LOCAL_CA_CERT_PATH
ensure_mkcert() {
    echo -e "${YELLOW}Checking mkcert installation...${NC}"

    if ! command -v mkcert >/dev/null 2>&1; then
        echo -e "${RED}mkcert is not installed.${NC}"
        if [[ "$(uname)" == "Darwin" ]]; then
            echo -e "${YELLOW}Install with:${NC} brew install mkcert && mkcert -install"
        else
            echo -e "${YELLOW}Install with your package manager, e.g.:${NC}"
            echo "  - macOS: brew install mkcert && mkcert -install"
            echo "  - Linux (Debian/Ubuntu): sudo apt-get install mkcert libnss3-tools && mkcert -install"
        fi
        exit 1
    fi

    echo -e "${YELLOW}Resolving mkcert CAROOT...${NC}"
    if ! CAROOT_DIR=$(mkcert -CAROOT 2>/dev/null); then
        echo -e "${RED}Failed to run 'mkcert -CAROOT'. Ensure mkcert is installed correctly.${NC}"
        exit 1
    fi
    CAROOT_DIR=$(echo "$CAROOT_DIR" | tr -d '\n')
    ROOT_CA_FILE="$CAROOT_DIR/rootCA.pem"

    if [[ ! -f "$ROOT_CA_FILE" ]]; then
        echo -e "${YELLOW}mkcert root CA not found. Running 'mkcert -install'...${NC}"
        mkcert -install || {
            echo -e "${RED}Failed to initialize mkcert root CA.${NC}"
            exit 1
        }
    fi

    # Re-check after install
    if [[ ! -f "$ROOT_CA_FILE" ]]; then
        echo -e "${RED}rootCA.pem still not found at: $ROOT_CA_FILE${NC}"
        exit 1
    fi

    LOCAL_CA_CERT_PATH="$ROOT_CA_FILE"
    echo -e "${GREEN}mkcert root CA ready at:${NC} $LOCAL_CA_CERT_PATH"
}

# Function to create init_config.json file
create_init_config() {
    local initial_key="$1"
    local config_dir="$HOME/Library/Logs/OpenFrame"
    local config_file="$config_dir/initial_config.json"
    
    echo
    echo -e "${YELLOW}Creating configuration file...${NC}"
    
    # Create directory if it doesn't exist
    if [ ! -d "$config_dir" ]; then
        echo -e "${YELLOW}Creating directory: $config_dir${NC}"
        mkdir -p "$config_dir"
    fi
    
    # Create the JSON configuration
    cat > "$config_file" << EOF
{
  "server_host": "localhost",
  "initial_key": "$initial_key",
  "local_mode": true,
  "org_id": "${ORG_ID}",
  "local_ca_cert_path": "${LOCAL_CA_CERT_PATH}"
}
EOF
    
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Configuration file created successfully${NC}"
        echo -e "${GREEN}Location: $config_file${NC}"
        echo
        echo -e "${YELLOW}Configuration content:${NC}"
        cat "$config_file"
        echo
    else
        echo -e "${RED}✗ Failed to create configuration file${NC}"
        exit 1
    fi
}

# Main execution
main() {
    get_access_token
    ensure_mkcert
    fetch_registration_secret
}

# Run the script
main
