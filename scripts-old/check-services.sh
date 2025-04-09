#!/bin/bash

echo "Checking Docker network..."
docker network inspect openframe-network

echo "\nChecking Kafka container..."
docker exec openframe-kafka hostname
docker exec openframe-kafka cat /etc/hosts
docker exec openframe-kafka nc -zv localhost 9092

echo "\nChecking Stream container..."
docker exec openframe-stream hostname
docker exec openframe-stream cat /etc/hosts
docker exec openframe-stream nc -zv kafka 9092

# echo "\nChecking container logs..."
# docker logs openframe-kafka
# docker logs openframe-stream
