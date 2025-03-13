#!/bin/bash

# Setup local docker registry
DOCKER_REGISTRY_FQDN="docker-registry.flamingo.local"
DOCKER_REGISTRY_ENTRY="${IP} ${DOCKER_REGISTRY_FQDN}"

if ! grep -qF "$DOCKER_REGISTRY_ENTRY" "$HOSTS_FILE"; then
    echo "$DOCKER_REGISTRY_ENTRY" | sudo tee -a "$HOSTS_FILE"
fi

DOCKER_REGISTRY_URL="${DOCKER_REGISTRY_FQDN}:5000"
echo $DOCKER_REGISTRY_URL

case "$1" in
u|up) docker compose -f ./kind-cluster/compose/docker-registry.yaml up -d ;;
d|down) docker compose -f ./kind-cluster/compose/docker-registry.yaml down ;;
*)
esac
