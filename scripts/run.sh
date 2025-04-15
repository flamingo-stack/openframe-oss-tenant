#!/bin/bash

# Get the directory where the script is located, regardless of where it's called from
export SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )"
export ROOT_REPO_DIR="${SCRIPT_DIR}/.."

# Source functions in correct order
source "${SCRIPT_DIR}/functions/variables.sh"

source "${SCRIPT_DIR}/functions/build-app.sh"
export -f build_app

source "${SCRIPT_DIR}/functions/show-help.sh"
export -f show_help show_help_apps

source "${SCRIPT_DIR}/functions/helm-repo-ensure.sh"
export -f helm_repo_ensure

source "${SCRIPT_DIR}/functions/wait.sh"
export -f wait_for_app

source "${SCRIPT_DIR}/functions/wait-parallel.sh"
export -f wait_parallel

source "${SCRIPT_DIR}/functions/debug.sh"
export -f debug_app

# Source remaining functions
for s in "${SCRIPT_DIR}/functions/apps-"*.sh; do
  source "$s"
  # Export all functions from the sourced file
  while IFS= read -r func; do
    export -f "$func"
  done < <(declare -F | awk '{print $3}')
done

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

ARG=$1
APP=$2
ACTION=$3

if [ "$ACTION" == "debug" ]; then
  LOCAL_PORT="$4"
  REMOTE_PORT_NAME="$5"
fi

case "$ARG" in
  pre)
    bash "${SCRIPT_DIR}/pre-check.sh"
    ;;
  k|cluster)
    bash "${SCRIPT_DIR}/setup-kind-cluster.sh"
    ;;
  d|delete)
    kind delete cluster
    ;;
  a|app)
    # Deploy app one by one
    if [ -n "$APP" ]; then
      bash "${SCRIPT_DIR}/manage-apps.sh" "$APP" "$ACTION" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    else
      bash "${SCRIPT_DIR}/manage-apps.sh" "''"
    fi
    ;;
  b|bootstrap)
    # Bootstrap whole cluster with all apps
    # Bootstrap whole cluster with base apps
    bash "$0" pre && \
    bash "$0" cluster && \
    bash ${SCRIPT_DIR}/bases.sh && \
    bash "$0" app all deploy
    ;;
  p|platform)
    # Bootstrap whole cluster with base apps
    bash "$0" pre && \
    bash "$0" cluster && \
    bash ${SCRIPT_DIR}/bases.sh && \
    bash "$0" app platform deploy
    ;;
  c|cleanup)
    # Cleanup kind nodes from unused images
    for node in kind-worker kind-worker2 kind-worker3 kind-control-plane; do
      echo "Cleaning up $node ..."
      docker exec $node crictl rmi --prune
    done
    ;;
  s|start)
    # Stop kind containers
    for node in kind-control-plane kind-worker kind-worker2 kind-worker3; do
      echo "Starting $node ..."
      docker start $node
    done
    ;;
  stop)
    # Stop kind containers
    for node in kind-worker kind-worker2 kind-worker3 kind-control-plane; do
      echo "Stopping $node ..."
      docker stop $node
    done
    ;;
  -h|--help|-Help)
    show_help
    exit 0
    ;;
  *)
    show_help
    exit 0
esac
