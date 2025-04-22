#!/bin/bash

# Function to check if namespaces and secrets already exist
function check_bases() {
  for ns in $NAMESPACES; do
    if ! kubectl get namespace "$ns"; then
      return 1
    fi
    if ! kubectl -n "$ns" get secret github-pat-secret; then
      return 1
    fi
  done
  return 0
}

function create_bases() {
  # Iterate over each namespace
  for ns in $NAMESPACES; do
    echo "Creating namespace: $ns"
    kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f - && \
    kubectl -n "$ns" create secret docker-registry github-pat-secret \
      --docker-server=ghcr.io \
      --docker-username=vusal-fl \
      --docker-password=$(echo -n $GITHUB_TOKEN_CLASSIC) \
      --docker-email=vusal@flamingo.cx --dry-run=client -o yaml | kubectl apply -f -
  done
}
