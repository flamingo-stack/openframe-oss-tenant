#!/bin/bash

# FLEET
function integrated_tools_datasources_fleet_deploy() {
  echo "Deploying Fleet"
  kubectl -n integrated-tools-datasources apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools-datasources/fleet
}

function fleet_wait() {
  echo "Waiting for Fleet to be ready"
  wait_for_app "integrated-tools-datasources" "app=fleet-mdm-redis"
  wait_for_app "integrated-tools-datasources" "app=fleet-mdm-mysql"
  wait_for_app "integrated-tools-datasources" "app=fleet"
}

function integrated_tools_datasources_fleet_delete() {
  echo "Deleting Fleet"
  kubectl -n integrated-tools-datasources delete -f ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools-datasources/fleet
}

# AUTENTIK
function integrated_tools_datasources_authentik_deploy() {
  # helm_repo_ensure authentik https://goauthentik.io/charts

  echo "Deploying Authentik"
    kubectl -n integrated-tools-datasources apply -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools-datasources/authentik/manifests

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

function integrated_tools_datasources_authentik_wait() {
  echo "Waiting for Authentik Datasources to be ready"
  wait_for_app "integrated-tools-datasources" "app=authentik-postgresql"
  wait_for_app "integrated-tools-datasources" "app=authentik-redis"
}

function integrated_tools_datasources_authentik_delete() {
  echo "Deleting Authentik"
  kubectl -n integrated-tools-datasources delete -k ${ROOT_REPO_DIR}/kind-cluster/apps/integrated-tools-datasources/authentik/manifests
}

# Wait for all integrated-tools-datasources apps to be ready
function integrated_tools_datasources_wait_all() {
  integrated_tools_datasources_fleet_wait
  integrated_tools_datasources_authentik_wait
}
