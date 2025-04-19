#!/bin/bash

# Set default number of agents based on CPU cores
if [ "$(uname)" = "Darwin" ]; then
    # macOS
    TOTAL_CPU=$(sysctl -n hw.ncpu)
    TOTAL_MEM=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
else
    # Linux
    TOTAL_CPU=$(nproc)
    TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
fi

# Default to reasonable value if detection fails
if [ -z "$TOTAL_CPU" ] || [ "$TOTAL_CPU" -lt 1 ]; then
    TOTAL_CPU=4
fi

if [ -z "$TOTAL_MEM" ] || [ "$TOTAL_MEM" -lt 1 ]; then
    TOTAL_MEM=8
fi

# Simple formula: 1 agent per 2 cores, minimum 1, maximum TOTAL_CPU/2
OPTIMAL_AGENTS=$(( TOTAL_CPU / 2 ))
[ "$OPTIMAL_AGENTS" -lt 1 ] && OPTIMAL_AGENTS=1

echo "System has $TOTAL_CPU CPU cores and ${TOTAL_MEM}GB memory"
echo "Creating cluster with $OPTIMAL_AGENTS agent nodes"

# Create the cluster with calculated agents
k3d cluster create openframe-dev \
    --servers 1 \
    --agents $OPTIMAL_AGENTS \
    --image rancher/k3s:v1.32.3-k3s1 \
    --k3s-arg "--disable=traefik@server:0" \
    --port "80:80@loadbalancer" \
    --port "443:443@loadbalancer" \
    --k3s-arg "--kubelet-arg=eviction-hard="@all \
    --k3s-arg "--kubelet-arg=eviction-soft="@all