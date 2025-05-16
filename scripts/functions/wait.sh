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
            echo "kubectl -n $NAMESPACE wait --for=condition=Complete job/$owner_name --timeout=$TIMEOUT"
            kubectl -n "$NAMESPACE" wait --for=condition=Complete job/"$owner_name" --timeout="$TIMEOUT" || return 1
        elif [[ "$owner_kind" == "StatefulSet" ]]; then
            echo "Pod $pod_name is managed by StatefulSet $owner_name. Waiting for all replicas to be ready..."
            # Convert TIMEOUT to seconds (default 20m = 1200)
            local timeout_sec=1200
            if [[ "$TIMEOUT" =~ ^([0-9]+)m$ ]]; then
                timeout_sec=$((BASH_REMATCH[1] * 60))
            elif [[ "$TIMEOUT" =~ ^([0-9]+)s$ ]]; then
                timeout_sec=${BASH_REMATCH[1]}
            fi
            local waited=0
            local interval=5
            while true; do
                ready=$(kubectl -n "$NAMESPACE" get statefulset "$owner_name" -o jsonpath='{.status.readyReplicas}')
                replicas=$(kubectl -n "$NAMESPACE" get statefulset "$owner_name" -o jsonpath='{.spec.replicas}')
                echo "Checking: readyReplicas=$ready, spec.replicas=$replicas"
                if [[ "$ready" == "$replicas" && -n "$ready" ]]; then
                    echo "StatefulSet $owner_name is ready ($ready/$replicas replicas)."
                    break
                fi
                if (( waited >= timeout_sec )); then
                    echo "Timeout waiting for StatefulSet $owner_name to be ready."
                    return 1
                fi
                sleep $interval
                waited=$((waited + interval))
            done
        elif [[ "$owner_kind" == "DaemonSet" ]]; then
            echo "Pod $pod_name is managed by DaemonSet $owner_name. Waiting for all pods to be ready..."
            # Convert TIMEOUT to seconds (default 20m = 1200)
            local timeout_sec=1200
            if [[ "$TIMEOUT" =~ ^([0-9]+)m$ ]]; then
                timeout_sec=$((BASH_REMATCH[1] * 60))
            elif [[ "$TIMEOUT" =~ ^([0-9]+)s$ ]]; then
                timeout_sec=${BASH_REMATCH[1]}
            fi
            local waited=0
            local interval=5
            while true; do
                ready=$(kubectl -n "$NAMESPACE" get daemonset "$owner_name" -o jsonpath='{.status.numberReady}')
                desired=$(kubectl -n "$NAMESPACE" get daemonset "$owner_name" -o jsonpath='{.status.desiredNumberScheduled}')
                echo "Checking: numberReady=$ready, desiredNumberScheduled=$desired"
                if [[ "$ready" == "$desired" && -n "$ready" ]]; then
                    echo "DaemonSet $owner_name is ready ($ready/$desired pods)."
                    break
                fi
                if (( waited >= timeout_sec )); then
                    echo "Timeout waiting for DaemonSet $owner_name to be ready."
                    return 1
                fi
                sleep $interval
                waited=$((waited + interval))
            done
        elif [[ "$owner_kind" == "ReplicaSet" ]]; then
            # Try to get Deployment name from ReplicaSet owner
            deployment_name=$(kubectl -n "$NAMESPACE" get replicaset "$owner_name" -o jsonpath='{.metadata.ownerReferences[0].name}' 2>/dev/null)
            if [[ -n "$deployment_name" ]]; then
                echo "Pod $pod_name is managed by Deployment $deployment_name. Waiting for Deployment to be available..."
                echo "kubectl -n $NAMESPACE wait --for=condition=Available deployment/$deployment_name --timeout=$TIMEOUT"
                kubectl -n "$NAMESPACE" wait --for=condition=Available deployment/"$deployment_name" --timeout="$TIMEOUT" || return 1
            else
                echo "Pod $pod_name is managed by ReplicaSet $owner_name (no Deployment owner). Waiting for pod to be ready..."
                echo "kubectl -n $NAMESPACE wait --for=condition=Ready pod/$pod_name --timeout=$TIMEOUT"
                kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$pod_name" --timeout="$TIMEOUT" || return 1
            fi
        else
            echo "Pod $pod_name is standalone. Waiting for pod to be ready..."
            echo "kubectl -n $NAMESPACE wait --for=condition=Ready pod/$pod_name --timeout=$TIMEOUT"
            kubectl -n "$NAMESPACE" wait --for=condition=Ready pod/"$pod_name" --timeout="$TIMEOUT" || return 1
        fi
    done
}

# Wait for a service to have at least one endpoint
function wait_for_service_endpoints() {
    local NAMESPACE=$1
    local SERVICE=$2
    local TIMEOUT=${3:-120}
    local waited=0
    local interval=3
    echo "Waiting for service $SERVICE in namespace $NAMESPACE to have endpoints (timeout: $TIMEOUT seconds)..."
    while true; do
        endpoints=$(kubectl -n "$NAMESPACE" get endpoints "$SERVICE" -o jsonpath='{.subsets[0].addresses[0].ip}' 2>/dev/null)
        if [[ -n "$endpoints" ]]; then
            echo "Service $SERVICE has endpoints: $endpoints"
            return 0
        fi
        if (( waited >= TIMEOUT )); then
            echo "Timeout waiting for service $SERVICE in namespace $NAMESPACE to have endpoints."
            return 1
        fi
        echo "Still waiting for endpoints for $SERVICE... ($waited/$TIMEOUT)"
        sleep $interval
        waited=$((waited + interval))
    done
}

# Usage examples for wait_for_service_endpoints:
#
# Wait for the NGINX Ingress admission webhook service endpoints before deploying ingresses:
#   wait_for_service_endpoints platform ingress-nginx-controller-admission 180
#
# Wait for another service:
#   wait_for_service_endpoints my-namespace my-service 120

# Export functions
export -f wait_for_cluster
export -f wait_for_app
export -f wait_for_service_endpoints

# ---
# Example waits for critical services (uncomment to use in your scripts):
#
# Wait for NGINX Ingress admission webhook endpoints before deploying ingresses
# wait_for_service_endpoints platform ingress-nginx-controller-admission 180
#
# Wait for NGINX Ingress controller endpoints before deploying ingresses
# wait_for_service_endpoints platform ingress-nginx-controller 180
