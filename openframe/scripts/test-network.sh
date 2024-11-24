#!/bin/bash

echo "Creating network if it doesn't exist..."
docker network create openframe-network 2>/dev/null || true

echo "Current networks:"
docker network ls

echo "Network details:"
docker network inspect openframe-network

echo "Testing connectivity from stream service..."
docker exec openframe-stream sh -c "ping -c 1 kafka"

echo "DNS resolution test:"
docker exec openframe-stream sh -c "nslookup kafka"

echo "Container IPs:"
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)

echo "Hosts file contents:"
docker exec openframe-stream cat /etc/hosts