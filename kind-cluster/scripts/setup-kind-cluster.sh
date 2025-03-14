#!/bin/bash

# sudo sysctl fs.inotify.max_user_instances=1024
# sudo sysctl -p

# Check if the IP is already assigned to the loopback interface
if ip addr show dev lo | grep -q "inet $IP/24"; then
    echo "IP $IP is already added to the loopback interface."
else
    # Add the IP address to the loopback interface
    sudo ip addr add "$IP/24" dev lo
    echo "IP $IP added to the loopback interface."
fi

# Bootsrap cluster
K8S_VERSION="v1.32.2"
[ "kind" == "$(kind get clusters --quiet)" ] || \
  kind create cluster --config ./kind-cluster/kind/cluster.yaml --image kindest/node:$K8S_VERSION
