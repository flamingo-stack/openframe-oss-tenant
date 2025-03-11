#!/bin/bash

# DOCKER_REGISTRY_URL="localhost:5000"
DOCKER_REGISTRY_URL="docker-registry.flamingo.local:5000"  # add ip to /etc/hosts for docker-registry.flamingo.local

# Function to clean up old images
cleanup_images() {
  echo "Cleaning up old images..."
  # List all images and their IDs
  docker images --format "{{.Repository}}:{{.Tag}} {{.ID}}" | while read img id; do
    # Check if it's our image and not the current build
    if [[ $img == "openframe-"* ]] && \
    [[ $img != *":latest" ]] && \
       [[ $img != *":latest" ]]; then
      echo "Removing old image: $img (ID: $id)"
      docker rmi --force $id || true
    fi
  done

  # Also remove any dangling images
  echo "Cleaning up dangling images..."
  docker image prune --force
}

# Clean up old images before building
# cleanup_images

# Function to build an image
build_image() {
  local service=$1
  local path=$2
  echo "Building $service from $path"

  # Ensure build context exists
  mkdir -p $path/target

  # Set build context based on service
  local build_context="$path"
  if [[ "$service" == "tactical-base" || \
        "$service" == "tactical-frontend" || \
        "$service" == "tactical-meshcentral" || \
        "$service" == "tactical-nginx" ]]; then
    # For tactical services, use parent directory as build context
    build_context="./infrastructure/tactical-rmm"
  elif [[ "$service" == "fleetmdm" ]]; then
    # For Fleet MDM, use parent directory as build context
    build_context="./infrastructure/fleetmdm"
  elif [[ "$service" == "nifi" ]]; then
    # For NiFi, use its directory as build context to include config files
    build_context="./infrastructure/nifi"
  fi

  # Build and tag for local registry with proper error handling
  echo "Building $service image..."
  if ! docker build \
    -t $DOCKER_REGISTRY_URL/openframe-$service:latest \
    -t openframe-$service:latest \
    -f $path/Dockerfile \
    $build_context; then
    echo "Error: Failed to build $service image"
    exit 1
  fi

  # Push to local registry with retries
  echo "Pushing $service image to local registry..."
  max_retries=3
  retry=0
  while [ $retry -lt $max_retries ]; do
    if docker push $DOCKER_REGISTRY_URL/openframe-$service:latest; then
      break
    fi
    retry=$((retry + 1))
    if [ $retry -eq $max_retries ]; then
      echo "Error: Failed to push $service image after $max_retries attempts"
      exit 1
    fi
    echo "Retrying push for $service (attempt $retry of $max_retries)..."
    sleep 5
  done

  # Create local tags for compose
  docker tag openframe-$service:latest $DOCKER_REGISTRY_URL/openframe-$service:latest
}

# Infrastructure Services
build_image "mongodb" "./infrastructure/mongodb"
build_image "cassandra" "./infrastructure/cassandra"
build_image "nifi" "./infrastructure/nifi"
build_image "postgresql" "./infrastructure/postgresql"

# Tactical RMM Components
build_image "tactical-base" "./infrastructure/tactical-rmm/tactical-base"
build_image "tactical-frontend" "./infrastructure/tactical-rmm/tactical-frontend"
# build_image "tactical-meshcentral" "./infrastructure/tactical-rmm/tactical-meshcentral"
build_image "tactical-nginx" "./infrastructure/tactical-rmm/tactical-nginx"

# Fleet MDM
build_image "fleetmdm" "./infrastructure/fleetmdm"

# Core Libraries
build_image "core" "./libs/openframe-core"
build_image "data" "./libs/openframe-data"

# Services
build_image "api" "./services/openframe-api"
build_image "config" "./services/openframe-config"
build_image "gateway" "./services/openframe-gateway"
build_image "management" "./services/openframe-management"
build_image "stream" "./services/openframe-stream"
build_image "ui" "./services/openframe-ui"

# Clean up old images after all builds
# echo "Cleaning up old images..."
# for img in $(docker images --filter "reference=openframe-*" --format "{{.Repository}}:{{.Tag}}"); do
#   if [[ $img != *":latest" ]]; then
#     echo "Removing old image: $img"
#     docker rmi $img || true
#   fi
# done
