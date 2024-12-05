#!/bin/bash

# Exit on error and print commands as they are executed
set -ex

# Generate Fleet JWT key if not exists
JWT_KEY_FILE="/etc/fleet/keys/jwt.key"
if [ ! -f "$JWT_KEY_FILE" ]; then
    echo "Generating Fleet JWT key..."
    # Generate 32 bytes of random hex data without newlines
    openssl rand -hex 32 | tr -d '\n' > "$JWT_KEY_FILE"
    chmod 600 "$JWT_KEY_FILE"
    
    # Debug output
    echo "Generated JWT key length (bytes):"
    wc -c < "$JWT_KEY_FILE"
    echo "Generated JWT key (hex):"
    cat "$JWT_KEY_FILE"
    echo "Verifying key length meets minimum requirement..."
    if [ $(wc -c < "$JWT_KEY_FILE") -lt 32 ]; then
        echo "ERROR: Generated key is too short!"
        exit 1
    fi
fi

echo "Step 1: Generating MDM private key..."
openssl genpkey -algorithm RSA \
  -out /etc/fleet/private/mdm.key \
  -pkeyopt rsa_keygen_bits:4096

echo "Step 2: Generating TLS certificate for Fleet server..."
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout /etc/fleet/certs/tls/server.key \
  -out /etc/fleet/certs/tls/server.crt \
  -days 365 \
  -subj "/CN=fleet.openframe.local" \
  -addext "subjectAltName = DNS:fleet.openframe.local,DNS:localhost,IP:127.0.0.1"

echo "Step 3: Generating SCEP certificates for MDM..."
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout /etc/fleet/certs/mdm/scep.key \
  -out /etc/fleet/certs/mdm/scep.crt \
  -days 365 \
  -subj "/CN=scep.openframe.local"

echo "Step 4: Generating MDM certificates..."
openssl req -x509 -newkey rsa:4096 -nodes \
  -keyout /etc/fleet/certs/mdm/mdm-bm.key \
  -out /etc/fleet/certs/mdm/mdm-bm.crt \
  -days 365 \
  -subj "/CN=mdm.openframe.local"

echo "Certificate generation complete!"