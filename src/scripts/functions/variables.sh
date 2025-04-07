#! /bin/bash

# Below ip will be used for ingress
export IP="${IP:-192.168.100.100}"
export DOMAIN="${DOMAIN:-${IP}.nip.io}"

# Kubernetes version
export K8S_VERSION="v1.32.3"
