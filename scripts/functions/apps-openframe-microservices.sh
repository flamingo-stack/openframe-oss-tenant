#!/bin/bash

# OPENFRAME CONFIG SERVER
function openframe_microservices_openframe_config_server_deploy() {
  echo "Deploying Config Server" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-config
}

function openframe_microservices_openframe_config_server_wait() {
  echo "Waiting for Config Server to be ready"
  wait_for_app "openframe-microservices" "app=openframe-config-server"
}

function openframe_microservices_openframe_config_server_delete() {
  echo "Deleting Config Server"
  kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-config
}

# OPENFRAME API
function openframe_microservices_openframe_api_deploy() {
  echo "Deploying API" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-api
}

function openframe_microservices_openframe_api_wait() {
  echo "Waiting for API to be ready"
  wait_for_app "openframe-microservices" "app=openframe-api"
}

function openframe_microservices_openframe_api_delete() {
  echo "Deleting API" &&
    kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-api
}

# OPENFRAME CLIENT
function openframe_microservices_openframe_client_deploy() {
  echo "Deploying API" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/deploy/dev/openframe-microservices/openframe-client
}

function openframe_microservices_openframe_client_wait() {
  echo "Waiting for Client to be ready"
  wait_for_app "openframe-microservices" "app=openframe-client"
}

function openframe_microservices_openframe_client_delete() {
  echo "Deleting API" &&
    kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/deploy/dev/openframe-microservices/openframe-client
}

# OPENFRAME MANAGEMENT (depends on Config Server, MongoDB)
function openframe_microservices_openframe_management_deploy() {
  echo "Deploying Management" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-management
}

function openframe_microservices_openframe_management_wait() {
  echo "Waiting for Management to be ready"
  wait_for_app "openframe-microservices" "app=openframe-management"
}

function openframe_microservices_openframe_management_delete() {
  echo "Deleting Management"
  kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-management
}

# OPENFRAME STREAM (depends on Kafka, Config Server, Cassandra, MongoDB, Loki)
function openframe_microservices_openframe_stream_deploy() {
  echo "Deploying Stream" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-stream
}

function openframe_microservices_openframe_stream_wait() {
  echo "Waiting for Stream to be ready"
  wait_for_app "openframe-microservices" "app=openframe-stream"
}

function openframe_microservices_openframe_stream_delete() {
  echo "Deleting Stream" &&
    kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-stream
}

# OPENFRAME GATEWAY (depends on Config Server, MongoDB)
function openframe_microservices_openframe_gateway_deploy() {
  echo "Deploying Gateway"
  kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-gateway
}

function openframe_microservices_openframe_gateway_wait() {
  echo "Waiting for Gateway to be ready"
  wait_for_app "openframe-microservices" "app=openframe-gateway"
}

function openframe_microservices_openframe_gateway_delete() {
  echo "Deleting Gateway"
  kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-gateway
}

# OPENFRAME UI (depends on API, Management)
function openframe_microservices_openframe_ui_deploy() {
  echo "Deploying UI" &&
    kubectl -n openframe-microservices apply -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-ui
}

function openframe_microservices_openframe_ui_wait() {
  echo "Waiting for UI to be ready"
  wait_for_app "openframe-microservices" "app=openframe-ui"
}

function openframe_microservices_openframe_ui_delete() {
  echo "Deleting UI"
  kubectl -n openframe-microservices delete -k ${ROOT_REPO_DIR}/manifests/openframe-microservices/openframe-ui
}

# Wait for all openframe-microservices apps to be ready
function openframe_microservices_wait_all() {
  openframe_microservices_openframe_config_server_wait
  openframe_microservices_openframe_api_wait
  openframe_microservices_openframe_client_wait
  openframe_microservices_openframe_management_wait
  openframe_microservices_openframe_stream_wait
  openframe_microservices_openframe_gateway_wait
  openframe_microservices_openframe_ui_wait
}
