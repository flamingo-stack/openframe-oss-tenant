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

# Wait for all integrated-tools-datasources apps to be ready
function integrated_tools_datasources_wait_all() {
  integrated_tools_datasources_fleet_wait
}
