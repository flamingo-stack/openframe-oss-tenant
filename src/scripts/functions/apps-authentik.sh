#!/bin/bash

function authentik_deploy() {
  # helm_repo_ensure authentik https://goauthentik.io/charts

  echo "Deploying Authentik"
    kubectl create namespace authentik --dry-run=client -o yaml | kubectl apply -f -  && \
    kubectl -n authentik create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n authentik apply -f ./kind-cluster/apps/authentik

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

function authentik_wait() {
  echo "Waiting for Authentik to be ready"
  wait_for_app "authentik" "app=authentik-redis"
  wait_for_app "authentik" "app=authentik-postgresql"
  wait_for_app "authentik" "app=authentik-server"
  wait_for_app "authentik" "app=authentik-worker"
}

function authentik_delete() {
  echo "Deleting Authentik"
  kubectl -n authentik delete -f ./kind-cluster/apps/authentik
  kubectl delete namespace authentik
}
