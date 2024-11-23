#!/bin/bash

echo "Installing OpenFrame dependencies..."

# Check for required tools
command -v java >/dev/null 2>&1 || { echo "Java is required but not installed."; exit 1; }
command -v mvn >/dev/null 2>&1 || { echo "Maven is required but not installed."; exit 1; }
command -v docker >/dev/null 2>&1 || { echo "Docker is required but not installed."; exit 1; }
command -v kubectl >/dev/null 2>&1 || { echo "Kubectl is required but not installed."; exit 1; }

# Build project
mvn clean install

# Start development environment
docker-compose up -d

echo "OpenFrame installation complete!"
