#!/bin/bash

# Bootsrap cluster
K8S_VERSION="v1.32.2"
[ "kind" == "$(kind get clusters --quiet)" ] || \
  kind create cluster --config ./kind-cluster/kind/cluster.yaml --image kindest/node:$K8S_VERSION
