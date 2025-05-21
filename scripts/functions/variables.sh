#! /bin/bash

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"
export DOMAIN="${DOMAIN:-${IP}.nip.io}"

export OS="$(uname)"         # Operating system
export K8S_VERSION="v1.32.3" # Kubernetes version
export ARGOCD_VERSION="3.0.0"

export NAMESPACES="openframe-microservices integrated-tools-datasources integrated-tools client-tools"

export SILENT="${SILENT:-false}"

export DEPLOY_LOG_DIR=/tmp/openframe-deployment-logs

export REGISTRY_PORT=5050

export K3D_CLUSTER_NAME="openframe-dev"
