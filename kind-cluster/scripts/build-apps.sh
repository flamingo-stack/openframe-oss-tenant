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

ARGS=${@:2}

case $1 in
  mongodb)
    build_app ./infrastructure/mongodb $ARGS
    ;;
  *)
      echo
      echo "Pass app name to build specific app"
      echo
      echo "Available options:"
      # echo "  loki             Build Loki and Promtail"
      # echo "  redis            Build Redis"
      # echo "  efk              Build Elasticsearch, Fluentd, Kibana stack"
      # echo "  kafka            Build Kafka"
      # echo "  kafka-ui         Build Kafka UI"
      echo "  mongodb          Build MongoDB"
      # echo "  mongodb-exporter Build MongoDB exporter"
      # echo "  mongo-express    Build Mongo Express"
      # echo "  cassandra        Build Cassandra"
      # echo "  nifi             Build NiFi"
      # echo "  zookeeper        Build Zookeeper"
      # echo "  pinot            Build Pinot"
      # echo "  config-server    Build Config Server"
      # echo "  api              Build API"
      # echo "  management       Build Management"
      # echo "  stream           Build Stream"
      # echo "  gateway          Build Gateway"
      # echo "  openframe-ui     Build OpenFrame UI"
      # echo "  authentik        Build Authentik"
      # echo "  fleet            Build Fleet"
      # echo "  meshcentral      Build Mesh Central"
      # echo "  rmm              Build RMM"
      echo
      # echo "  a|all            Build all applications"

      exit 1
esac
