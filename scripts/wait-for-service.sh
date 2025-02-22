#!/bin/bash
service=$1
port=$2
max_attempts=30
attempt=1

echo "Waiting for $service to be ready..."
while ! nc -z localhost $port; do
    if [ $attempt -eq $max_attempts ]; then
        echo "$service is not available after $max_attempts attempts"
        exit 1
    fi
    attempt=$((attempt + 1))
    sleep 2
done
echo "$service is ready!"
