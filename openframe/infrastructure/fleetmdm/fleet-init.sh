#!/bin/bash
set -e

# Configure fleetctl
echo "Configuring fleetctl..."
fleetctl config set --address https://0.0.0.0:8070 --tls-skip-verify

# Check if setup is already done
if fleetctl get users 2>/dev/null | grep -q "${FLEET_SETUP_ADMIN_EMAIL}"; then
    echo "Fleet already initialized"
else
    echo "Performing initial Fleet setup..."
    fleetctl setup --email="${FLEET_SETUP_ADMIN_EMAIL}" \
                  --password="${FLEET_SETUP_ADMIN_PASSWORD}" \
                  --org-name="${FLEET_SETUP_ORG_NAME}" \
                  --name="Admin" \
                  --enable-mdm
fi

# Create API user if it doesn't exist
if ! fleetctl get users 2>/dev/null | grep -q "api@openframe.local"; then
    echo "Creating API user..."
    fleetctl user create --email="api@openframe.local" \
                         --password="openframe123!" \
                         --name="API User" \
                         --global-role admin
fi

# Login and get token using API user
echo "Logging in and getting API token..."
TOKEN=$(fleetctl login --email="api@openframe.local" --password="openframe123!" --get-token)

if [ $? -eq 0 ]; then
    echo "Successfully logged in and got API token"
    echo "$TOKEN" > /var/log/osquery/api_token.txt
    chmod 600 /var/log/osquery/api_token.txt
    echo "API token saved to /var/log/osquery/api_token.txt"
else
    echo "Failed to get API token"
    exit 1
fi

echo "Fleet initialization complete!" 