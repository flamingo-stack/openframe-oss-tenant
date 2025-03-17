#!/bin/bash

sudo sysctl fs.inotify.max_user_instances=1500
sudo sysctl -p

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"

export DOMAIN="${DOMAIN:-${IP}.nip.io}"
export HOSTS_FILE="/etc/hosts"

case "$1" in
u|up)
  # bash ./kind-cluster/scripts/setup-docker-registry.sh up
  bash ./kind-cluster/scripts/setup-kind-cluster.sh
  ;;
a|apps) bash ./kind-cluster/scripts/deploy-apps.sh all ;;
d|down)
  kind delete cluster
  bash ./kind-cluster/scripts/setup-docker-registry.sh down
  ;;
b|bootstrap)
  # Bootstrap whole cluster with all apps
  bash $0 up
  bash $0 apps
  ;;
*) echo "Usage:
$0 <parameter>

Parameters:

b|bootstrap: Bootstrap whole cluster with all apps
u|up       : Setup cluster only
a|apps     : Deploy all apps
d|down     : Remove cluster
"
esac
