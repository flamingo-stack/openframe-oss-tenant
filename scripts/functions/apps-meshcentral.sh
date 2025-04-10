#!/bin/bash

function meshcentral_deploy() {
  echo "Deploying MeshCentral"
  kubectl create namespace meshcentral --dry-run=client -o yaml | kubectl apply -f -  && \
  kubectl -n meshcentral create secret docker-registry github-pat-secret \
    --docker-server=ghcr.io \
    --docker-username=vusal-fl \
    --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
    --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
  kubectl -n meshcentral apply -k ./kind-cluster/apps/meshcentral
}

function meshcentral_wait() {
  echo "Waiting for MeshCentral to be ready"
  wait_for_app "meshcentral" "app=meshcentral"
  wait_for_app "meshcentral" "app=meshcentral-mongodb"
}

function meshcentral_delete() {
  echo "Deleting MeshCentral"
  kubectl -n meshcentral delete -k ./kind-cluster/apps/meshcentral
  kubectl delete namespace meshcentral
}
