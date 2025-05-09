#!/bin/bash
function setup_cluster() {

    echo "Updating helm repos indexes"
    helm repo update

    add_loopback_ip

    # Set default number of agents based on CPU cores
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        TOTAL_CPU=$(sysctl -n hw.ncpu)
        TOTAL_MEM=$(($(sysctl -n hw.memsize) / 1024 / 1024 / 1024))
        
        # Check for Apple Silicon
        if [[ $(uname -m) == 'arm64' ]]; then
            IS_ARM64=true
            echo "Detected Apple Silicon (ARM64)"
        else
            IS_ARM64=false
        fi
    elif [ "$(uname -o)" = "Msys" ] || [ "$(uname -o)" = "Cygwin" ]; then
        # Windows (Git Bash/Cygwin)
        TOTAL_CPU=$(wmic cpu get NumberOfLogicalProcessors | grep -o "[0-9]*" | head -1)
        TOTAL_MEM=$(wmic ComputerSystem get TotalPhysicalMemory | grep -o "[0-9]*" | head -1)
        TOTAL_MEM=$((TOTAL_MEM / 1024 / 1024 / 1024)) # Convert from bytes to GB
        IS_ARM64=false
    else
        # Linux
        TOTAL_CPU=$(nproc)
        TOTAL_MEM=$(free -g | awk '/^Mem:/{print $2}')
        
        # Check for ARM64
        if [[ $(uname -m) == 'aarch64' ]]; then
            IS_ARM64=true
            echo "Detected ARM64 architecture"
        else
            IS_ARM64=false
        fi
    fi

    # Default to reasonable value if detection fails
    if [ -z "$TOTAL_CPU" ] || [ "$TOTAL_CPU" -lt 1 ]; then
        TOTAL_CPU=4
    fi

    if [ -z "$TOTAL_MEM" ] || [ "$TOTAL_MEM" -lt 1 ]; then
        TOTAL_MEM=8
    fi

    # Simple formula: 1 agent per 2 cores, minimum 1, maximum TOTAL_CPU/2
    OPTIMAL_AGENTS=$((TOTAL_CPU / 2))
    [ "$OPTIMAL_AGENTS" -lt 1 ] && OPTIMAL_AGENTS=1

    echo "System has $TOTAL_CPU CPU cores and ${TOTAL_MEM}GB memory"
    echo "Creating cluster with $OPTIMAL_AGENTS agent nodes"

    # Delete any existing cluster first to avoid conflicts
    if k3d cluster list 2>/dev/null | grep -q "openframe-dev"; then
        echo "Removing existing openframe-dev cluster to avoid API port binding issues..."
        k3d cluster delete openframe-dev
    fi

    # Select appropriate image based on architecture
    if [ "$IS_ARM64" = true ]; then
        K3S_IMAGE="rancher/k3s:v1.32.3-k3s1-arm64"
    else
        K3S_IMAGE="rancher/k3s:v1.32.3-k3s1"
    fi

    echo "Using image: $K3S_IMAGE"

    # Bootstrap cluster with explicit API port binding
    k3d cluster create openframe-dev \
        --servers 1 \
        --agents $OPTIMAL_AGENTS \
        --image "$K3S_IMAGE" \
        --k3s-arg "--disable=traefik@server:0" \
        --port "80:80@loadbalancer" \
        --port "443:443@loadbalancer" \
        --api-port "127.0.0.1:6550" \
        --k3s-arg "--kubelet-arg=eviction-hard=@all" \
        --k3s-arg "--kubelet-arg=eviction-soft=@all" \
        --timeout 120s

    # Ensure kubeconfig is properly configured
    k3d kubeconfig merge openframe-dev --kubeconfig-switch-context

    # Verify cluster is accessible
    echo "Waiting for cluster API to become accessible..."
    timeout=60
    counter=0
    until kubectl cluster-info &>/dev/null; do
        if [ $counter -ge $timeout ]; then
            echo "ERROR: Timed out waiting for cluster API to become accessible"
            echo "Try restarting Docker Desktop and running this script again"
            exit 1
        fi
        echo "Waiting for cluster API... ($counter/$timeout)"
        sleep 1
        ((counter++))
    done
    echo "Cluster API is accessible!"
    
    # Verify the namespace creation works properly
    echo "Testing namespace creation..."
    if ! kubectl create namespace test-namespace; then
        echo "WARNING: Failed to create test namespace. Checking kubeconfig..."
        # Fix kubeconfig if needed
        if ! kubectl config view -o jsonpath='{.clusters[?(@.name == "k3d-openframe-dev")].cluster.server}' | grep -q "127.0.0.1:6550"; then
            echo "Fixing kubeconfig to use correct server address..."
            kubectl config set-cluster k3d-openframe-dev --server=https://127.0.0.1:6550
        fi
    else
        kubectl delete namespace test-namespace
        echo "Namespace creation successful!"
    fi
}