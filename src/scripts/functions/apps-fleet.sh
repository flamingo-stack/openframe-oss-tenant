#!/bin/bash

function fleet_deploy() {
  echo "Deploying Fleet"
  kubectl create namespace fleet --dry-run=client -o yaml | kubectl apply -f -  && \
  kubectl -n fleet create secret docker-registry github-pat-secret \
    --docker-server=ghcr.io \
    --docker-username=vusal-fl \
    --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
    --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
  kubectl -n fleet apply -f ./kind-cluster/apps/fleet
}

function fleet_wait() {
  echo "Waiting for Fleet to be ready"
  wait_for_app "fleet" "app=fleet-mdm-redis"
  wait_for_app "fleet" "app=fleet-mdm-mysql"
  wait_for_app "fleet" "app=fleet"
}

function fleet_delete() {
  echo "Deleting Fleet"
  kubectl -n fleet delete -f ./kind-cluster/apps/fleet
  kubectl delete namespace fleet
}
