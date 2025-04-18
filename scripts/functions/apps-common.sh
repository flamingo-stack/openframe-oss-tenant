#!/bin/bash

# Function to check if namespaces and secrets already exist
function check_bases() {
  for ns in "${NAMESPACES[@]}"; do
    if ! kubectl get namespace "$ns" &> /dev/null; then
      return 1
    fi
    if ! kubectl -n "$ns" get secret github-pat-secret &> /dev/null; then
      return 1
    fi
  done
  return 0
}

function set_max_open_files() {
  # Check if max_user_instances is less than 1500
  if [ $OS == "Linux" ]; then
    current_value=$(sysctl -n fs.inotify.max_user_instances 2>/dev/null || echo "0")
    if [[ $current_value -lt 1500 ]]; then
      echo "fs.inotify.max_user_instances is less than 1500"
      sudo sysctl fs.inotify.max_user_instances=1500 > /dev/null 2>&1
      sudo sysctl -p > /dev/null 2>&1
    fi
  fi
}
