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

function set_max_open_files() {
  # Check if max_user_instances is less than 1500
  if [ $OS == "Linux" ]; then
    current_value=$(sysctl -n fs.inotify.max_user_instances || echo "0")
    if [[ $current_value -lt 1500 ]]; then
      echo "fs.inotify.max_user_instances is less than 1500" && \
      sudo sysctl fs.inotify.max_user_instances=1500 && \
      sudo sysctl -p
    fi
  fi
}
