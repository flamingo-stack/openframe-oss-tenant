#!/bin/bash

# PINOT
function infra_pinot_deploy() {
  echo "Deploying Pinot"
  # Pinot Controller (depends on Zookeeper)
  # Pinot Broker (depends on Pinot Controller)
  # Pinot Server (depends on Pinot Controller)
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-pinot/manifests

  # helm_repo_ensure openframe-pinot https://raw.githubusercontent.com/apache/pinot/master/helm
  # helm upgrade -i pinot pinot/pinot \
  #     -n infrastructure --create-namespace \
  #     --version 0.3.1
}

function infra_pinot_wait() {
  echo "Waiting for Pinot to be ready"
  wait_for_app "infrastructure" "app=openframe-pinot"
}

function infra_pinot_delete() {
  echo "Deleting Pinot"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-pinot/manifests
}

# OPENFRAME CONFIG SERVER
function infra_config_server_deploy() {
  echo "Deploying Config Server"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-config
}

function infra_config_server_wait() {
  echo "Waiting for Config Server to be ready"
  wait_for_app "infrastructure" "app=openframe-config-server"
}

function infra_config_server_delete() {
  echo "Deleting Config Server"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-config
}

# OPENFRAME API
function infra_api_deploy() {
  echo "Deploying API"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-api
}

function infra_api_wait() {
  echo "Waiting for API to be ready"
  wait_for_app "infrastructure" "app=openframe-api"
}

function infra_api_delete() {
  echo "Deleting API"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-api
}

# OPENFRAME MANAGEMENT (depends on Config Server, MongoDB)
function infra_management_deploy() {
  echo "Deploying Management"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-management
}

function infra_management_wait() {
  echo "Waiting for Management to be ready"
  wait_for_app "infrastructure" "app=openframe-management"
}

function infra_management_delete() {
  echo "Deleting Management"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-management
}

# OPENFRAME STREAM (depends on Kafka, Config Server, Cassandra, MongoDB, Loki)
function infra_stream_deploy() {
  echo "Deploying Stream"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-stream
}

function infra_stream_wait() {
  echo "Waiting for Stream to be ready"
  wait_for_app "infrastructure" "app=openframe-stream"
}

function infra_stream_delete() {
  echo "Deleting Stream"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-stream
}

# OPENFRAME GATEWAY (depends on Config Server, MongoDB)
function infra_gateway_deploy() {
  echo "Deploying Gateway"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-gateway
}

function infra_gateway_wait() {
  echo "Waiting for Gateway to be ready"
  wait_for_app "infrastructure" "app=openframe-gateway"
}

function infra_gateway_delete() {
  echo "Deleting Gateway"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-gateway
}

# OPENFRAME UI (depends on API, Management)
function infra_openframe_ui_deploy() {
  echo "Deploying UI"
  kubectl -n infrastructure apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-ui
}

function infra_openframe_ui_wait() {
  echo "Waiting for UI to be ready"
  wait_for_app "infrastructure" "app=openframe-ui"
}

function infra_openframe_ui_delete() {
  echo "Deleting Infrastructure"
  kubectl -n infrastructure delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/infrastructure/openframe-ui
}
