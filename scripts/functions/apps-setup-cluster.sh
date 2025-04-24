#!/bin/bash
function setup_cluster() {
    # Default network plugin is flannel (k3s default)
    NETWORK_PLUGIN=${NETWORK_PLUGIN:-"flannel"}
    
    echo "Updating helm repos indexes"
    helm repo update

    add_loopback_ip

    # Set default number of agents based on CPU cores
    if [ "$(uname)" = "Darwin" ]; then
        # macOS
        TOTAL_CPU=$(sysctl -n hw.ncpu)
        TOTAL_MEM=$(( $(sysctl -n hw.memsize) / 1024 / 1024 / 1024 ))
    elif [ "$(uname -o 2>/dev/null)" = "Msys" ] || [ "$(uname -o 2>/dev/null)" = "Cygwin" ]; then
        # Windows (Git Bash/Cygwin)
        TOTAL_CPU=$(wmic cpu get NumberOfLogicalProcessors | grep -o "[0-9]*" | head -1)
        TOTAL_MEM=$(wmic ComputerSystem get TotalPhysicalMemory | grep -o "[0-9]*" | head -1)
        TOTAL_MEM=$(( TOTAL_MEM / 1024 / 1024 / 1024 )) # Convert from bytes to GB
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
    echo "Using network plugin: $NETWORK_PLUGIN"

    NETWORK_ARGS=""
    if [ "$NETWORK_PLUGIN" != "flannel" ]; then
        NETWORK_ARGS="--k3s-arg \"--flannel-backend=none@server:0\" --k3s-arg \"--disable=flannel@server:0\""
    fi

    # Bootsrap cluster
    if ! [ "openframe-dev" == "$(k3d cluster list --no-headers | tr -s "  " " " | cut -d " " -f 1)" ]; then
        eval k3d cluster create openframe-dev \
            --servers 1 \
            --agents $OPTIMAL_AGENTS \
            --image rancher/k3s:v1.32.3-k3s1 \
            --k3s-arg "--disable=traefik@server:0" \
            --port "80:80@loadbalancer" \
            --port "443:443@loadbalancer" \
            --k3s-arg "--kubelet-arg=eviction-hard="@all \
            --k3s-arg "--kubelet-arg=eviction-soft="@all \
            $NETWORK_ARGS
    else
        echo "Cluster already setup"
    fi
}

function install_cni_plugin() {
    local plugin=$1
    
    if [ "$plugin" == "flannel" ]; then
        echo "Using default flannel CNI plugin, no additional installation needed"
        return 0
    fi
    
    echo "Installing $plugin CNI plugin..."
    
    case $plugin in
        "calico")
            kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/tigera-operator.yaml
            kubectl create -f https://raw.githubusercontent.com/projectcalico/calico/v3.25.0/manifests/custom-resources.yaml
            ;;
            
        "cilium")
            helm repo add cilium https://helm.cilium.io/
            helm install cilium cilium/cilium --version 1.13.0 \
                --namespace kube-system
            ;;
            
        "weave")
            kubectl apply -f "https://github.com/weaveworks/weave/releases/download/v2.8.1/weave-daemonset-k8s-1.11.yaml"
            ;;
            
        *)
            echo "WARNING: Unsupported CNI plugin: $plugin. Using flannel by default."
            ;;
    esac
    
    echo "Waiting for CNI plugin to be ready..."
    kubectl wait --for=condition=ready pods --all -n kube-system --timeout=180s
}
