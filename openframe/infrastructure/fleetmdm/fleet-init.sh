#!/bin/bash
set -e

# Configure fleetctl
echo "Configuring fleetctl..."
fleetctl config set --address http://localhost:8070

# Function to check if Fleet is already initialized
check_fleet_initialized() {
    # Try to login with the admin credentials
    if fleetctl login --email="admin@openframe.local" --password="openframe123!" >/dev/null 2>&1; then
        return 0  # true, already initialized
    fi
    return 1  # false, not initialized
}

# Initialize Fleet if not already done
if ! check_fleet_initialized; then
    echo "Performing initial Fleet setup..."
    fleetctl setup --email="admin@openframe.local" \
                  --password="openframe123!" \
                  --org-name="${FLEET_SETUP_ORG_NAME}" \
                  --name="Admin" || true
else
    echo "Fleet already initialized, skipping setup"
fi

# Login as admin to create API user
echo "Logging in as admin..."
fleetctl login --email="admin@openframe.local" --password="openframe123!"

# Create API-only user
echo "Creating API-only user..."
API_USER_OUTPUT=$(fleetctl user create \
    --name "API User" \
    --email "api@openframe.local" \
    --password "openframe123!" \
    --global-role admin \
    --api-only 2>&1)

# Extract token from the output
if echo "$API_USER_OUTPUT" | grep -q "Success! The API token for your new user is:"; then
    TOKEN=$(echo "$API_USER_OUTPUT" | grep "Success! The API token for your new user is:" | awk -F': ' '{print $2}')
    echo "Successfully created API user and got token"
    echo "$TOKEN" > /etc/fleet/api_token.txt
    chmod 600 /etc/fleet/api_token.txt
    echo "API token saved to /etc/fleet/api_token.txt"

    # Configure fleetctl to use the API token
    fleetctl config set --token "$TOKEN"
    echo "fleetctl configured with API token"
else
    # If user already exists, try to get token through login
    echo "API user might already exist, trying to get token through login..."
    if fleetctl login --email="api@openframe.local" --password="openframe123!"; then
        TOKEN=$(grep "token:" /root/.fleet/config | awk '{print $2}')
        if [ ! -z "$TOKEN" ]; then
            echo "Successfully got API token through login"
            echo "$TOKEN" > /etc/fleet/api_token.txt
            chmod 600 /etc/fleet/api_token.txt
            echo "API token saved to /etc/fleet/api_token.txt"
        else
            echo "Warning: Could not extract token from config, but continuing anyway"
        fi
    else
        echo "Warning: Could not get API token, but continuing anyway"
    fi
fi

echo "Fleet initialization complete!"
exit 0  # Always exit successfully to prevent container restart 