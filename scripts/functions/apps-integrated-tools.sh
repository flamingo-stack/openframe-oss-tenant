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

# Wait for all integrated-tools apps to be ready
function integrated_tools_wait_all() {
  integrated_tools_fleet_wait
}
