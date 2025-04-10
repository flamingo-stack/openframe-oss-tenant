#!/bin/bash

# Source functions in correct order
source ./functions/show-help.sh
export -f show_help show_help_apps

source ./functions/helm-repo-ensure.sh
export -f helm_repo_ensure

source ./functions/wait.sh
export -f wait_for_app

source ./functions/variables.sh
source ./functions/build-app.sh
export -f build_app

source ./functions/debug.sh
export -f debug_app

# Source remaining functions
for s in ./functions/apps-*.sh; do
  source "$s"
  # Export all functions from the sourced file
  while IFS= read -r func; do
    export -f "$func"
  done < <(declare -F | awk '{print $3}')
done

if [ "$1" == "b" ] || [ "$1" == "bootstrap" ] || [ "$1" == "m" ] || [ "$1" == "minimal" ]; then
  IFWAIT=$2
else
  APP=$2
  ACTION=$3
  if [ "$ACTION" == "debug" ]; then
    LOCAL_PORT="$4"
    REMOTE_PORT_NAME="$5"
  elif [ "$ACTION" == "deploy" ]; then
    IFWAIT=$4
  fi
fi

case "$1" in
  p|pre)
    bash ./pre-check.sh
    ;;
  k|cluster)
    bash ./setup-kind-cluster.sh
    ;;
  d|down)
    kind delete cluster
    ;;
  a|app)
    if [ -n "$APP" ]; then
      bash $0 pre && \
      bash ./manage-apps.sh "$APP" "$ACTION" "$IFWAIT" "$LOCAL_PORT" "$REMOTE_PORT_NAME"
    else
      echo "App name is required"
      exit 1
    fi
    ;;
  b|bootstrap)
    # Bootstrap whole cluster with all apps
    bash $0 pre && \
    bash $0 cluster && \
    bash $0 app all deploy "$IFWAIT"
    ;;
  m|minimal)
    # Bootstrap whole cluster with base apps
    bash $0 pre && \
    bash $0 cluster && \
    bash $0 app minimal deploy "$IFWAIT"
    ;;
  c|cleanup)
    # Cleanup kind nodes from unused images
    for node in kind-control-plane kind-worker kind-worker2 kind-worker3; do
      echo "Cleaning up $node ..."
      docker exec $node crictl rmi --prune
    done
    ;;
  -h|--help|-Help)
    show_help
    exit 0
    ;;
  *)
    echo "Get help with: $0 [ -h | --help | -Help ]"
    exit 1
esac
