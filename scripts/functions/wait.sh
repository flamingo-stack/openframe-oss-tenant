#!/bin/bash

# Wait for cluster to be ready
wait_for_cluster() {
    local timeout=${1:-300} # Default timeout 300 seconds
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
                    if [[ $node_name != "NAME" ]]; then # Skip header
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
    local RESOURCE=${3:-pod}
    local TIMEOUT=${4:-20m}

    echo "Waiting for $RESOURCE in namespace $NAMESPACE with label $LABEL..."

    # Wait for Pods (iterate and wait according to their type)
    local pods_json
    pods_json=$(kubectl -n "$NAMESPACE" get pods -l "$LABEL" -o json)
    echo "$pods_json" | jq -c '.items[]' | while read -r pod_json; do
        pod_name=$(echo "$pod_json" | jq -r '.metadata.name')
        owner_kind=$(echo "$pod_json" | jq -r '.metadata.ownerReferences[0].kind // empty')
        owner_name=$(echo "$pod_json" | jq -r '.metadata.ownerReferences[0].name // empty')

        if [[ "$owner_kind" == "Job" ]]; then
            echo "Pod $pod_name is managed by Job $owner_name. Waiting for Job to complete..."
            kubectl -n "$NAMESPACE" wait --for=condition=Complete job/"$owner_name" --timeout="$TIMEOUT" || return 1
        elif [[ "$owner_kind" == "StatefulSet" ]]; then
            echo "Pod $pod_name is managed by StatefulSet $owner_name. Waiting for StatefulSet to be ready..."
            kubectl -n "$NAMESPACE" wait --for=condition=Ready statefulset/"$owner_name" --timeout="$TIMEOUT" || return 1
        elif [[ "$owner_kind" == "DaemonSet" ]]; then
            echo "Pod $pod_name is managed by DaemonSet $owner_name. Waiting for DaemonSet to be ready..."
            kubectl -n "$NAMESPACE" wait --for=condition=Ready daemonset/"$owner_name" --timeout="$TIMEOUT" || return 1
        elif [[ "$owner_kind" == "ReplicaSet" ]]; then
            # Try to get Deployment name from ReplicaSet owner
            deployment_name=$(kubectl -n "$NAMESPACE" get replicaset "$owner_name" -o jsonpath='{.metadata.ownerReferences[0].name}' 2>/dev/null)
            if [[ -n "$deployment_name" ]]; then
                echo "Pod $pod_name is managed by Deployment $deployment_name. Waiting for Deployment to be available..."
                kubectl -n "$NAMESPACE" wait --for=condition=Available deployment/"$deployment_name" --timeout="$TIMEOUT" || return 1
            else
                echo "Pod $pod_name is managed by ReplicaSet $owner_name (no Deployment owner). Waiting for pod to be ready..."
                kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$pod_name" --timeout="$TIMEOUT" || return 1
            fi
        else
            echo "Pod $pod_name is standalone. Waiting for pod to be ready..."
            kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$pod_name" --timeout="$TIMEOUT" || return 1
        fi
    done
}

# Export functions
export -f wait_for_cluster
export -f wait_for_app
