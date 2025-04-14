#!/bin/bash

# FLEET
function integrated_tools_fleet_deploy() {
  echo "Deploying Fleet"
  kubectl -n integrated-tools apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools/fleet
}

function integrated_tools_fleet_wait() {
  echo "Waiting for Fleet to be ready"
  wait_for_app "integrated-tools" "app=fleet-mdm-redis"
  wait_for_app "integrated-tools" "app=fleet-mdm-mysql"
  wait_for_app "integrated-tools" "app=fleet"
}

function integrated_tools_fleet_delete() {
  echo "Deleting Fleet"
  kubectl -n integrated-tools delete -f ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools/fleet
}

# AUTENTIK
function integrated_tools_authentik_deploy() {
  # helm_repo_ensure authentik https://goauthentik.io/charts

  echo "Deploying Authentik"
    kubectl -n integrated-tools apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools/authentik/manifests

  # helm upgrade -i authentik-redis authentik/redis \
  # -n authentik2 --create-namespace \
  # --version 15.7.6 \
  # -f ./kind-cluster/apps/authentik/helm/authentik/authentik-redis.yaml

  # helm upgrade -i authentik-postgresql authentik/postgresql \
  #     -n authentik2 --create-namespace \
  #     --version 12.8.2 \
  #     -f ./kind-cluster/apps/authentik/helm/authentik/authentik-postgresql.yaml

  # helm upgrade -i authentik-authentik authentik/authentik \
  #     -n authentik2 --create-namespace \
  #     --version 2025.2.1 \
  #     -f ./kind-cluster/apps/authentik/helm/authentik/authentik-authentik.yaml
}

function integrated_tools_authentik_wait() {
  echo "Waiting for Authentik Server/Worker to be ready"
  wait_for_app "integrated-tools" "app=authentik-server"
  wait_for_app "integrated-tools" "app=authentik-worker"
}

function integrated_tools_authentik_delete() {
  echo "Deleting Authentik"
  kubectl -n integrated-tools delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools/authentik/manifests
}

# Wait for all integrated-tools apps to be ready
function integrated_tools_wait_all() {
  integrated_tools_fleet_wait
  integrated_tools_authentik_wait
}
