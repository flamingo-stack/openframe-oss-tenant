#!/bin/bash

sudo sysctl fs.inotify.max_user_instances=1500 > /dev/null 2>&1
sudo sysctl -p > /dev/null 2>&1

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"

export DOMAIN="${DOMAIN:-${IP}.nip.io}"
# export HOSTS_FILE="/etc/hosts"

case "$1" in
u|up)
  # bash ./kind-cluster/scripts/setup-docker-registry.sh up
  bash ./kind-cluster/scripts/setup-kind-cluster.sh
  ;;
a|app)
  $0 cleanup
  if [ -n "$2" ]; then
    bash ./kind-cluster/scripts/deploy-apps.sh "$2"
  else
    bash ./kind-cluster/scripts/deploy-apps.sh
  fi
  ;;
d|down)
  kind delete cluster
  bash ./kind-cluster/scripts/setup-docker-registry.sh down
  ;;
b|bootstrap)
  # Bootstrap whole cluster with all apps
  bash $0 up
  bash $0 app all
  ;;
c|cleanup)
  # Cleanup kind nodes from unused images
  for node in kind-control-plane kind-worker kind-worker2 kind-worker3; do
    echo "Cleaning up $node ..."
    docker exec $node crictl rmi --prune
  done
  ;;
*) echo "Usage:
$0 <parameter>

Parameters:

b|bootstrap            : Bootstrap whole cluster with all apps
u|up                   : Setup cluster only
a|app <app-name>|all   : Deploy all apps or specific app if app-name is provided
d|down                 : Remove cluster
c|cleanup              : Cleanup kind nodes from unused images

Examples:
  $0 app all         # Deploy all applications
  $0 app redis       # Deploy only Redis
  $0 app kafka       # Deploy only Kafka
"
esac
