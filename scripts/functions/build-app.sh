#!/bin/bash

function build_app() {

  local APP_DIRECTORY=$1
  local ARGS=${@:2}
  local TAG=$(date +%d%m%Y%H%M)

  echo "Building $APP_DIRECTORY with args: $ARGS"

  docker build --file $APP_DIRECTORY/Dockerfile \
    --label org.opencontainers.image.created=$(date -u +"%Y-%m-%dT%H:%M:%S.%3NZ") \
    --label org.opencontainers.image.description="OpenFrame is a platform for building and deploying AI agents." \
    --label org.opencontainers.image.licenses="Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)" \
    --label org.opencontainers.image.source=https://github.com/Flamingo-CX/openframe \
    --label org.opencontainers.image.title=openframe \
    --label org.opencontainers.image.url=https://github.com/Flamingo-CX/openframe \
    --label org.opencontainers.image.vendor=FlamingoCX \
    --label org.opencontainers.image.version=$TAG \
    --attest type=provenance,disabled=true \
    --tag ghcr.io/flamingo-cx/openframe-mongodb:$TAG \
    $ARGS \
    $APP_DIRECTORY
}
