#!/bin/bash
# Source variables for cluster/registry names
. "$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/variables.sh"

function setup_cluster() {

    echo "Updating helm repos indexes"
    helm repo update
    
    # Check for port availability
    check_port_availability() {
        local port=$1
        local service=$2
        if command -v nc >/dev/null 2>&1; then
            if nc -z 127.0.0.1 "$port" >/dev/null 2>&1; then
                echo "Warning: Port $port for $service is already in use."
                return 1
            fi
        elif command -v lsof >/dev/null 2>&1; then
            if lsof -i:"$port" >/dev/null 2>&1; then
                echo "Warning: Port $port for $service is already in use."
                return 1
            fi
        else
            echo "Note: Cannot check if port $port is available (nc or lsof not found)."
        fi
        return 0
    }
    
    # Default ports
    HTTP_PORT=80
    HTTPS_PORT=443
    API_PORT=6550
    
    # Check if default ports are available, use alternatives if needed
    if ! check_port_availability $HTTP_PORT "HTTP"; then
        HTTP_PORT=8080
        echo "Using alternative HTTP port: $HTTP_PORT"
    fi
    
    if ! check_port_availability $HTTPS_PORT "HTTPS"; then
        HTTPS_PORT=8443
        echo "Using alternative HTTPS port: $HTTPS_PORT"
    fi
    
    if ! check_port_availability $API_PORT "Kubernetes API"; then
        API_PORT=6551
        echo "Using alternative Kubernetes API port: $API_PORT"
    fi

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
    OPTIMAL_AGENTS=$((TOTAL_CPU / 5))
    [ "$OPTIMAL_AGENTS" -lt 1 ] && OPTIMAL_AGENTS=1
    SERVERS=1

    echo "System has $TOTAL_CPU CPU cores and ${TOTAL_MEM}GB memory"
    echo "Planning to create cluster with $OPTIMAL_AGENTS agent nodes"

    # Clean up any leftover resources
    echo "Cleaning up any existing resources..."
    
    # Delete any existing cluster
    if k3d cluster list 2>/dev/null | grep -q "$K3D_CLUSTER_NAME"; then
        echo "Removing existing $K3D_CLUSTER_NAME cluster..."
        k3d cluster delete $K3D_CLUSTER_NAME
        # Wait a bit to ensure all resources are released
        sleep 5
    fi
    
    # Force cleanup of potential stuck Docker containers
    echo "Cleaning up any stuck containers..."
    docker rm -f $(docker ps -a | grep 'k3d-$K3D_CLUSTER_NAME' | awk '{print $1}') 2>/dev/null || true
    
    # Select appropriate image based on architecture
    if [ "$IS_ARM64" = true ]; then
        K3S_IMAGE="rancher/k3s:v1.33.0-k3s1-arm64"
    else
        K3S_IMAGE="rancher/k3s:v1.33.0-k3s1"
    fi

    echo "Using image: $K3S_IMAGE"

    # Create a temporary k3d config file (without inlined registry config)
    TMP_CONFIG_FILE=$(mktemp)
    cat > "$TMP_CONFIG_FILE" <<EOF
apiVersion: k3d.io/v1alpha4
kind: Simple
metadata:
  name: $K3D_CLUSTER_NAME
servers: $SERVERS
agents: $OPTIMAL_AGENTS
image: $K3S_IMAGE
kubeAPI:
  host: "127.0.0.1"
  hostIP: "127.0.0.1" 
  hostPort: "$API_PORT"
options:
  k3s:
    extraArgs:
      - arg: --disable=traefik
        nodeFilters:
          - server:*
      - arg: --kubelet-arg=eviction-hard=
        nodeFilters:
          - all
      - arg: --kubelet-arg=eviction-soft=
        nodeFilters:
          - all
ports:
  - port: $HTTP_PORT:80
    nodeFilters:
      - loadbalancer
  - port: $HTTPS_PORT:443
    nodeFilters:
      - loadbalancer
EOF

    # Step 1: Create server node first using config file and external registry config
    echo "Creating cluster from config file with k3d registry integration..."
    k3d cluster create --config $TMP_CONFIG_FILE --timeout 180s

    # Clean up temp file
    rm -f "$TMP_CONFIG_FILE"
    
    # Set up kubeconfig explicitly
    echo "Setting up kubeconfig..."
    KUBECONFIG_FILE="$HOME/.kube/config"
    mkdir -p "$HOME/.kube"
    
    # Generate k3d kubeconfig and ensure it's the active one
    k3d kubeconfig get $K3D_CLUSTER_NAME > "$HOME/.k3d-$K3D_CLUSTER_NAME.config"
    
    # If a kubeconfig already exists, merge it, otherwise use the new one
    if [ -f "$KUBECONFIG_FILE" ]; then
        echo "Merging with existing kubeconfig..."
        KUBECONFIG="$KUBECONFIG_FILE:$HOME/.k3d-$K3D_CLUSTER_NAME.config" kubectl config view --flatten > "$HOME/.kube/config.new"
        mv "$HOME/.kube/config.new" "$KUBECONFIG_FILE"
    else
        echo "Creating new kubeconfig..."
        cp "$HOME/.k3d-$K3D_CLUSTER_NAME.config" "$KUBECONFIG_FILE"
    fi
    
    # Ensure permissions are correct
    chmod 600 "$KUBECONFIG_FILE"
    
    # Switch context to the new cluster
    kubectl config use-context k3d-$K3D_CLUSTER_NAME
    
    # Explicitly verify we're pointing to the right server
    echo "Verifying cluster API server address..."
    # CURRENT_SERVER=$(kubectl config view -o jsonpath='{.clusters[?(@.name == "k3d-$K3D_CLUSTER_NAME")].cluster.server}')
    # if [[ "$CURRENT_SERVER" != *"127.0.0.1:$API_PORT"* ]]; then
    #     echo "Fixing API server address in kubeconfig..."
    #     kubectl config set-cluster k3d-$K3D_CLUSTER_NAME --server=http://127.0.0.1:$API_PORT
    # else
    #     echo "API server address is correctly set to $CURRENT_SERVER"
    # fi
    
    # Wait for at least one node to be Ready
    max_retries=30
    retry_count=0
    until kubectl --context=k3d-$K3D_CLUSTER_NAME get nodes 2>/dev/null | grep -q ' Ready '; do
      retry_count=$((retry_count+1))
      if [ $retry_count -ge $max_retries ]; then
        echo "ERROR: No Ready nodes after $max_retries attempts."
        kubectl --context=k3d-$K3D_CLUSTER_NAME get nodes
        exit 1
      fi
      echo "Waiting for a Ready node ($retry_count/$max_retries)..."
      sleep 2
    done

    # Verify the namespace creation works properly
    echo "Testing namespace creation..."
    max_retries=10
    retry_count=0
    while ! kubectl --context=k3d-$K3D_CLUSTER_NAME create namespace test-namespace; do
        retry_count=$((retry_count+1))
        if [ $retry_count -ge $max_retries ]; then
            echo "ERROR: Unable to create test namespace after $max_retries attempts."
            echo "Current kubectl config:"
            kubectl config view
            echo "Cluster status:"
            kubectl get nodes
            exit 1
        fi
        echo "Retrying namespace creation ($retry_count/$max_retries)..."
        sleep 2
    done
    
    # Clean up test namespace if it was created
    kubectl --context=k3d-$K3D_CLUSTER_NAME delete namespace test-namespace 2>/dev/null || true
    echo "Namespace creation test successful!"

    # Print cluster info for verification
    echo "Cluster information:"
    kubectl --context=k3d-$K3D_CLUSTER_NAME get nodes -o wide

    if [ "$HTTP_PORT" != "80" ] || [ "$HTTPS_PORT" != "443" ]; then
        echo ""
        echo "NOTE: Using non-standard ports:"
        [ "$HTTP_PORT" != "80" ] && echo "  - HTTP: localhost:$HTTP_PORT"
        [ "$HTTPS_PORT" != "443" ] && echo "  - HTTPS: localhost:$HTTPS_PORT"
    fi

}