#!/bin/bash

echo "Checking Docker network..."
docker network inspect openframe-network

echo "Checking container status..."
docker ps -a

echo "Checking Zookeeper..."
docker exec openframe-zookeeper bash -c "echo stat | nc localhost 2181"

echo "Checking Kafka..."
docker exec openframe-kafka kafka-topics --bootstrap-server localhost:9092 --list

echo "Checking container connectivity..."
for container in zookeeper kafka stream; do
    echo "Testing from $container:"
    docker exec openframe-$container ping -c 1 kafka
    docker exec openframe-$container ping -c 1 zookeeper
done

echo "Container IP addresses:"
docker inspect -f '{{.Name}} - {{range .NetworkSettings.Networks}}{{.IPAddress}}{{end}}' $(docker ps -aq)
