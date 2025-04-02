#!/bin/bash

# Function to check if a command exists
check_command() {
    if ! command -v "$1" &> /dev/null; then
        echo "Error: $1 is not installed. Please install it first."
        exit 1
    fi
}

# Check if GITHUB_TOKEN_CLASSIC is set
if [ -z "$GITHUB_TOKEN_CLASSIC" ]; then
    echo "Error: GITHUB_TOKEN_CLASSIC environment variable is not set"
    echo "Please export GITHUB_TOKEN_CLASSIC with: 'export GITHUB_TOKEN_CLASSIC=<your-token>'"
    exit 1
fi

# Check required tools
echo "Checking required tools..."
check_command "kind"
check_command "docker"
check_command "helm"
check_command "kubectl"
check_command "telepresence"

helm repo update

sudo sysctl fs.inotify.max_user_instances=1500 > /dev/null 2>&1
sudo sysctl -p > /dev/null 2>&1

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"
export DOMAIN="${DOMAIN:-${IP}.nip.io}"


case "$1" in
u|up)
  # bash ./kind-cluster/scripts/setup-docker-registry.sh up
  bash ./kind-cluster/scripts/setup-kind-cluster.sh
  ;;
a|app)
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
m|minimal)
  # Bootstrap whole cluster with base apps
  bash $0 up
  bash $0 app minimal
  ;;
f|fast)
  # Bootstrap whole cluster with base apps without waiting for state=Ready
  bash $0 up
  bash $0 app fast
  ;;

c|cleanup)
  # Cleanup kind nodes from unused images
  for node in kind-control-plane kind-worker kind-worker2 kind-worker3; do
    echo "Cleaning up $node ..."
    docker exec $node crictl rmi --prune
  done
  ;;
build)
  bash ./kind-cluster/scripts/build-apps.sh "$2"
  ;;
*) echo "Usage:
$0 <parameter>

Parameters:

b|bootstrap            : Bootstrap whole cluster with all apps
m|minimal              : Bootstrap whole cluster with base apps
f|fast                 : Bootstrap whole cluster with base apps without waiting for state=Ready
u|up                   : Setup cluster only
a|app <app-name>|all   : Deploy all apps or specific app if app-name is provided
d|down                 : Remove cluster
c|cleanup              : Cleanup kind nodes from unused images
b|build <app-name>     : Build specific app

Examples:
  $0 app all         # Deploy all applications
  $0 app redis       # Deploy only Redis
  $0 app kafka       # Deploy only Kafka
"
esac
