#!/bin/bash

# Create directory for certificates
mkdir -p certs

# Generate CA private key and certificate
openssl req -x509 -nodes -new -sha256 -days 1024 -newkey rsa:2048 -keyout certs/ca.key -out certs/ca.pem -subj "/C=US/CN=Tactical-RMM-Root-CA"

# Generate domain private key
openssl req -new -nodes -newkey rsa:2048 -keyout certs/private.key -out certs/domain.csr -subj "/C=US/ST=State/L=City/O=Organization/CN=*.openframe-tactical.local"

# Generate domain certificate
openssl x509 -req -sha256 -days 1024 -in certs/domain.csr -CA certs/ca.pem -CAkey certs/ca.key -CAcreateserial -extfile <(printf "subjectAltName=DNS:app.openframe-tactical.local,DNS:api.openframe-tactical.local,DNS:mesh.openframe-tactical.local") -out certs/fullchain.pem

# Create combined certificate chain
cat certs/fullchain.pem certs/ca.pem > certs/chain.pem

# Set permissions
chmod 644 certs/* 