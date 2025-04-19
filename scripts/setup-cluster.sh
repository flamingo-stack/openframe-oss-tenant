#!/bin/bash

# Default values with better resource scaling
DEFAULT_SERVERS=1
DEFAULT_AGENTS=3
DEFAULT_MEM_PER_AGENT="2GB"  # Default memory per agent
DEFAULT_CPU_PER_AGENT="2"    # Default CPU per agent

# Calculate recommended agents based on available resources
TOTAL_CPU=$(grep -c ^processor /proc/cpuinfo 2>/dev/null || sysctl -n hw.ncpu 2>/dev/null || echo 4)
TOTAL_MEM=$(free -g 2>/dev/null | awk '/^Mem:/{print $2}' || sysctl -n hw.memsize 2>/dev/null | awk '{print int($1/1024/1024/1024)}' || echo 8)

# Reserve resources for host OS and control plane
RESERVED_CPU=2
RESERVED_MEM=4

# Calculate available resources
AVAILABLE_CPU=$((TOTAL_CPU - RESERVED_CPU))
AVAILABLE_MEM=$((TOTAL_MEM - RESERVED_MEM))

# Calculate recommended number of agents
RECOMMENDED_AGENTS=$((AVAILABLE_CPU / 2))

# Make sure we have at least 1 agent, but cap based on memory too
AGENTS_BY_MEM=$((AVAILABLE_MEM / 2))
if [ $AGENTS_BY_MEM -lt $RECOMMENDED_AGENTS ]; then
    RECOMMENDED_AGENTS=$AGENTS_BY_MEM
fi

# Ensure at least 1 agent
if [ $RECOMMENDED_AGENTS -lt 1 ]; then
    RECOMMENDED_AGENTS=1
fi

# Allow overriding via environment variables
SERVERS=${OPENFRAME_SERVERS:-$DEFAULT_SERVERS}
AGENTS=${OPENFRAME_AGENTS:-$RECOMMENDED_AGENTS}
MEM_PER_AGENT=${OPENFRAME_MEM_PER_AGENT:-$DEFAULT_MEM_PER_AGENT}
CPU_PER_AGENT=${OPENFRAME_CPU_PER_AGENT:-$DEFAULT_CPU_PER_AGENT}

echo "System resources:"
echo " - Total CPU cores: $TOTAL_CPU"
echo " - Total memory: ${TOTAL_MEM}GB"
echo " - Recommended agents for your system: $RECOMMENDED_AGENTS"
echo "Cluster configuration:"
echo " - Control plane nodes: $SERVERS"
echo " - Worker nodes: $AGENTS"
echo " - Per-agent memory limit: $MEM_PER_AGENT"
echo " - Per-agent CPU limit: $CPU_PER_AGENT"

# Update helm repos
echo "Updating helm repos indexes"
helm repo update > /dev/null 2>&1

add_loopback_ip

# Bootstrap cluster
# Create a new k3d cluster
if ! [ "openframe-dev" == "$(k3d cluster list --no-headers 2>/dev/null | tr -s "  " " " | cut -d " " -f 1)" ]; then
    echo "Creating new K3d cluster with $AGENTS agent nodes..."
    k3d cluster create openframe-dev \
        --servers $SERVERS \
        --agents $AGENTS \
        --image rancher/k3s:v1.32.3-k3s1 \
        --k3s-arg "--disable=traefik@server:0" \
        --port "80:80@loadbalancer" \
        --port "443:443@loadbalancer" \
        --k3s-arg "--kubelet-arg=eviction-hard=memory.available<100Mi,nodefs.available<1Gi"@all \
        --k3s-arg "--kubelet-arg=eviction-soft=memory.available<200Mi,nodefs.available<10Gi"@all \
        --k3s-arg "--kubelet-arg=eviction-soft-grace-period=memory.available=30s,nodefs.available=1m"@all \
        --k3s-arg "--kubelet-arg=eviction-max-pod-grace-period=60"@all \
        --k3s-arg "--kubelet-arg=image-gc-high-threshold=85"@all \
        --k3s-arg "--kubelet-arg=image-gc-low-threshold=80"@all
        
    echo "K3d cluster created successfully!"
else
    echo "Cluster already exists."
    CURRENT_AGENTS=$(k3d node list 2>/dev/null | grep -c "agent")
    echo "Current agent count: $CURRENT_AGENTS"
    
    # Check if we need to add more agents
    if [ $CURRENT_AGENTS -lt $AGENTS ]; then
        AGENTS_TO_ADD=$((AGENTS - CURRENT_AGENTS))
        echo "Adding $AGENTS_TO_ADD more agent nodes to match desired count..."
        
        for i in $(seq 1 $AGENTS_TO_ADD); do
            NODE_NAME="openframe-agent-extra-$i"
            echo "Adding node $NODE_NAME..."
            k3d node create $NODE_NAME --cluster openframe-dev --role agent
        done
    fi
fi

# Wait for nodes to be ready
echo "Waiting for all nodes to be ready..."
TIMEOUT=120
ELAPSED=0
while [ $ELAPSED -lt $TIMEOUT ]; do
    READY_NODES=$(kubectl get nodes 2>/dev/null | grep -c "Ready")
    EXPECTED_NODES=$((SERVERS + AGENTS))
    
    if [ "$READY_NODES" -eq "$EXPECTED_NODES" ]; then
        echo "All nodes are ready!"
        break
    fi
    
    echo "Waiting for nodes to be ready ($READY_NODES/$EXPECTED_NODES)..."
    sleep 5
    ELAPSED=$((ELAPSED + 5))
done

if [ $ELAPSED -ge $TIMEOUT ]; then
    echo "Warning: Timeout waiting for nodes to be ready."
    echo "Continuing anyway, but some nodes might not be fully initialized."
fi

echo "Cluster setup complete."