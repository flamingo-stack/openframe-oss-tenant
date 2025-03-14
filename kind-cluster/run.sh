#!/bin/bash

sudo sysctl fs.inotify.max_user_instances=1500
sudo sysctl -p

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"

export DOMAIN="${DOMAIN:-${IP}.nip.io}"
export HOSTS_FILE="/etc/hosts"

case "$1" in
b|build) bash ./kind-cluster/scripts/build-images.sh ;;
u|up)
  # bash ./kind-cluster/scripts/setup-docker-registry.sh up
  bash ./kind-cluster/scripts/setup-kind-cluster.sh
  ;;
a|apps) bash ./kind-cluster/scripts/deploy-apps.sh ;;
d|down)
  kind delete cluster
  bash ./kind-cluster/scripts/setup-docker-registry.sh down
  ;;
*) echo "Usage:
$0 <parameter>

Parameters:

b|build    : Build images
u|up       : Setup cluster and image registry
a|apps     : Deploy apps
d|down     : Remove cluster
"
esac
