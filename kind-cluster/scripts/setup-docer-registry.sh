#!/bin/bash

# Setup local docker registry
IP="192.168.0.100"
DOCKER_REGISTRY_FQDN="docker-registry.flamingo.local"
ENTRY="${IP} ${DOCKER_REGISTRY_FQDN}"
HOSTS_FILE="/etc/hosts"

if ! grep -qF "$ENTRY" "$HOSTS_FILE"; then
    echo "$ENTRY" | sudo tee -a "$HOSTS_FILE"
fi

DOCKER_REGISTRY_URL="${DOCKER_REGISTRY_FQDN}:5000"
echo $DOCKER_REGISTRY_URL

docker compose -f ./kind-cluster/compose/docker-registry.yaml up -d
