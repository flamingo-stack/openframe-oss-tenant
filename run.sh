#!/bin/bash

for s in ./src/scripts/functions/*; do source $s; done

APP=$2
ACTION=$3
IFWAIT=$4

case "$1" in
  p|pre)
    bash ./src/scripts/pre-check.sh
    ;;
  k|cluster)
    bash ./src/scripts/setup-kind-cluster.sh
    ;;
  d|down)
    kind delete cluster
    ;;
  a|app)
    if [ -n "$APP" ]; then
      bash ./src/scripts/manage-apps.sh "$APP" "$ACTION" "$IFWAIT"
    fi
    ;;
  # b|bootstrap)
  #   # Bootstrap whole cluster with all apps
  #   bash $0 pre
  #   bash $0 cluster
  #   bash $0 app all
  #   ;;
  # m|minimal)
  #   # Bootstrap whole cluster with base apps
  #   bash $0 up
  #   bash $0 app minimal
  #   ;;

  # c|cleanup)
  #   # Cleanup kind nodes from unused images
  #   for node in kind-control-plane kind-worker kind-worker2 kind-worker3; do
  #     echo "Cleaning up $node ..."
  #     docker exec $node crictl rmi --prune
  #   done
  #   ;;
  # build)
  #   bash ./kind-cluster/scripts/build-apps.sh "$2"
  #   ;;
  -h|--help|-Help)
    show_help
    exit 0
    ;;
  *)
    echo "Get help with: $0 [ -h | --help | -Help ]"
    exit 1
esac
