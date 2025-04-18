#!/bin/bash

# Wait for cluster to be ready
wait_for_cluster() {
    local timeout=${1:-300}  # Default timeout 300 seconds
    local start_time=$(date +%s)
    local end_time=$((start_time + timeout))
    
    echo "Waiting for cluster to be ready (timeout: ${timeout}s)..."
    
    while true; do
        current_time=$(date +%s)
        if [ $current_time -gt $end_time ]; then
            echo "Timeout waiting for cluster to be ready"
            return 1
        fi
        
        if kubectl cluster-info &>/dev/null; then
            # Check if all nodes are ready
            local nodes_ready=true
            while IFS= read -r line; do
                if [[ $line =~ ^[^[:space:]]+ ]]; then
                    node_name=${BASH_REMATCH[0]}
                    if [[ $node_name != "NAME" ]]; then  # Skip header
                        status=$(kubectl get node "$node_name" -o jsonpath='{.status.conditions[?(@.type=="Ready")].status}')
                        if [ "$status" != "True" ]; then
                            nodes_ready=false
                            break
                        fi
                    fi
                fi
            done < <(kubectl get nodes)
            
            if [ "$nodes_ready" = true ]; then
                echo "Cluster is ready!"
                kubectl get nodes
                return 0
            fi
        fi
        
        echo "Waiting for cluster to be ready... ($(($end_time - $current_time))s remaining)"
        sleep 5
    done
}

# Wait for specific app to be ready
function wait_for_app() {
  local NAMESPACE=$1
  local LABEL=$2

  kubectl -n $NAMESPACE wait --for=condition=Ready pod -l $LABEL --timeout=20m
}

# Export functions
export -f wait_for_cluster
export -f wait_for_app