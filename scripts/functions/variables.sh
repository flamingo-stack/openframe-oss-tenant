#! /bin/bash

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"
export DOMAIN="${DOMAIN:-${IP}.nip.io}"

export K8S_VERSION="v1.32.3"  # Kubernetes version
export OS="$(uname)"  # Operating system

export NAMESPACES="platform openframe-datasources openframe-microservices integrated-tools-datasources integrated-tools client-tools"
