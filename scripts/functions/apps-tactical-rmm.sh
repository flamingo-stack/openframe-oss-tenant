#!/bin/bash

function tactical_rmm_deploy() {
  echo "Deploying Tactical RMM"
  kubectl create namespace tactical-rmm --dry-run=client -o yaml | kubectl apply -f -  && \
  kubectl -n tactical-rmm create secret docker-registry github-pat-secret \
    --docker-server=ghcr.io \
    --docker-username=vusal-fl \
    --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
    --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
  kubectl -n tactical-rmm apply -f ${ROOT_REPO_DIR}/kind-cluster/apps/tactical-rmm
}

function tactical_rmm_wait() {
  echo "Waiting for Tactical RMM to be ready"
  wait_for_app "tactical-rmm" "app=tactical-nginx"
  wait_for_app "tactical-rmm" "app=tactical-postgres"
  wait_for_app "tactical-rmm" "app=tactical-redis"
  wait_for_app "tactical-rmm" "app=tactical-frontend"
  wait_for_app "tactical-rmm" "app=tactical-backend"
  wait_for_app "tactical-rmm" "app=tactical-nats"
  wait_for_app "tactical-rmm" "app=tactical-celery"
  wait_for_app "tactical-rmm" "app=tactical-celerybeat"
  wait_for_app "tactical-rmm" "app=tactical-websockets"
}

function tactical_rmm_delete() {
  echo "Deleting Tactical RMM"
  kubectl -n tactical-rmm delete -f ${ROOT_REPO_DIR}/kind-cluster/apps/tactical-rmm
  kubectl delete namespace tactical-rmm
}
