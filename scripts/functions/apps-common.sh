#!/bin/bash

# Function to check if namespaces already exist
function check_bases() {
  for ns in $NAMESPACES; do
    if ! kubectl get namespace "$ns"; then
      return 1
    fi
  done
  return 0
}

function create_bases() {
  # Iterate over each namespace
  for ns in $NAMESPACES; do
    echo "Creating namespace: $ns"
    kubectl create namespace "$ns" --dry-run=client -o yaml | kubectl apply -f -
  done
}
