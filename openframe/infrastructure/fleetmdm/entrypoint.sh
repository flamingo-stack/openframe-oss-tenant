#!/bin/bash
set -ex

# Function to wait for Fleet to be ready
wait_for_fleet() {
    echo "Waiting for Fleet to be ready..."
    until $(curl -k --output /dev/null --silent --fail https://0.0.0.0:8070/api/v1/fleet/health); do
        printf '.'
        sleep 5
    done
    echo "Fleet is ready!"
}

# Wait for MySQL to be ready
echo "Waiting for MySQL to be ready..."
until nc -z -w5 fleet-mysql 3306; do
    printf '.'
    sleep 2
done
echo "MySQL is ready!"

# Generate certificates if they don't exist
if [ ! -f "/etc/fleet/certs/tls/server.crt" ]; then
    echo "Generating certificates..."
    /setup-fleet-certs.sh
fi

# Debug JWT key
echo "DEBUG: Checking JWT key..."
echo "DEBUG: JWT key file exists: $(test -f /etc/fleet/keys/jwt.key && echo 'yes' || echo 'no')"
echo "DEBUG: JWT key file permissions: $(ls -l /etc/fleet/keys/jwt.key)"
echo "DEBUG: JWT key length (bytes): $(wc -c < /etc/fleet/keys/jwt.key)"
echo "DEBUG: JWT key content (hex):"
xxd /etc/fleet/keys/jwt.key

# Read JWT key as base64 to preserve binary data
JWT_KEY=$(base64 < /etc/fleet/keys/jwt.key)
echo "DEBUG: JWT key length (base64 chars): ${#JWT_KEY}"

export FLEET_AUTH_JWT_KEY="$JWT_KEY"

# Debug MySQL connection
echo "DEBUG: Testing MySQL connection..."
if nc -z -w5 fleet-mysql 3306; then
    echo "DEBUG: MySQL port is reachable"
    # Try to connect with mysql client for more detailed debugging
    echo "DEBUG: Testing MySQL connection with mysql client..."
    mysql -h fleet-mysql -u fleet -pfleet -e "SELECT 1;" fleet && echo "MySQL connection successful!" || echo "MySQL connection failed!"
else
    echo "DEBUG: MySQL port is NOT reachable"
fi

# Initialize database with /dev/null for stdin
echo "Preparing database..."
/usr/bin/fleet prepare db --config /etc/fleet/fleet.yml --no-prompt </dev/null 2>&1 | tee /tmp/fleet-prepare.log
echo "DEBUG: Database preparation completed"

# Start Fleet in background
echo "Starting Fleet server..."
/usr/bin/fleet serve --config /etc/fleet/fleet.yml </dev/null &
FLEET_PID=$!

# Wait for Fleet to be ready
wait_for_fleet

# Run initialization if AUTO_INIT is enabled
if [ "$FLEET_SETUP_AUTO_INIT" = "true" ]; then
    echo "Running Fleet initialization..."
    /fleet-init.sh
fi

# Keep container running and monitor Fleet process
wait $FLEET_PID 