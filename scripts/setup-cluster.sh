#!/bin/bash

echo "Updating helm repos indexes"
helm repo update > /dev/null 2>&1

add_loopback_ip

# Bootsrap cluster
# Create a new k3d cluster
if ! [ "openframe-dev" == "$(k3d cluster list --no-headers | tr -s "  " " " | cut -d " " -f 1)" ]; then
    k3d cluster create openframe-dev \
        --servers 1 \
        --agents 3 \
        --image rancher/k3s:v1.32.3-k3s1 \
        --k3s-arg "--disable=traefik@server:0" \
        --port "80:80@loadbalancer" \
        --port "443:443@loadbalancer" \
        --k3s-arg "--kubelet-arg=eviction-hard="@all \
        --k3s-arg "--kubelet-arg=eviction-soft="@all #\
        # --k3s-arg "--kubelet-arg=eviction-max-pod-grace-period=0"@all \
        # --k3s-arg "--kubelet-arg=imagefs-cleanup-threshold=0"@all
else
    echo "Cluster already setup"
fi
