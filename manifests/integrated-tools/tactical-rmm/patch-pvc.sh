#!/bin/bash

# PVC Storage Update Script
# This script patches PVC storage requests for Tactical RMM and related services
# Based on PR #753 - RMM StatefulSets

set -e

NAMESPACE="${NAMESPACE:-integrated-tools}"
DATASOURCES_NAMESPACE="${DATASOURCES_NAMESPACE:-datasources}"

echo "Starting PVC storage updates"
echo "================================================"
echo "Integrated Tools Namespace: $NAMESPACE"
echo "Datasources Namespace: $DATASOURCES_NAMESPACE"
echo "================================================"

# Function to patch PVC storage
patch_pvc() {
    local pvc_name=$1
    local new_size=$2
    local old_size=$3
    local ns="${4:-$NAMESPACE}"

    echo "Patching PVC: $pvc_name ($old_size -> $new_size) in namespace: $ns"

    if kubectl get pvc "$pvc_name" -n "$ns" &>/dev/null; then
        kubectl patch pvc "$pvc_name" -n "$ns" -p "{\"spec\":{\"resources\":{\"requests\":{\"storage\":\"$new_size\"}}}}"
        echo "  ✓ Successfully patched $pvc_name"
    else
        echo "  ⚠ PVC $pvc_name not found, skipping..."
    fi
}

# Datasources (in datasources namespace)
echo -e "\n=== Datasources (namespace: $DATASOURCES_NAMESPACE) ==="
patch_pvc "mongodb-data" "20Gi" "5Gi" "$DATASOURCES_NAMESPACE"
patch_pvc "nats-data" "10Gi" "4Gi" "$DATASOURCES_NAMESPACE"

# Authentik (in integrated-tools namespace)
echo -e "\n=== Authentik (namespace: $NAMESPACE) ==="
patch_pvc "authentik-redis-data" "10Gi" "1Gi"

# Fleet MDM (in integrated-tools namespace)
echo -e "\n=== Fleet MDM (namespace: $NAMESPACE) ==="
patch_pvc "fleetmdm-mysql-data" "20Gi" "10Gi"
patch_pvc "fleetmdm-redis-data" "3Gi" "1Gi"
patch_pvc "fleetmdm-server-data" "10Gi" "5Gi"

# MeshCentral (in integrated-tools namespace)
echo -e "\n=== MeshCentral (namespace: $NAMESPACE) ==="
patch_pvc "meshcentral-mongodb-data" "20Gi" "10Gi"
patch_pvc "meshcentral-server" "10Gi" "5Gi"

# Tactical RMM - Core Services (in integrated-tools namespace)
echo -e "\n=== Tactical RMM - Core Services (namespace: $NAMESPACE) ==="
patch_pvc "tactical-postgres-data" "20Gi" "10Gi"
patch_pvc "tactical-redis-data" "10Gi" "5Gi"

# Tactical RMM - Application Components (in integrated-tools namespace)
echo -e "\n=== Tactical RMM - Application Components (namespace: $NAMESPACE) ==="
patch_pvc "tactical-backend-data" "10Gi" "5Gi"
patch_pvc "tactical-celery-data" "3Gi" "1Gi"
patch_pvc "tactical-celerybeat-data" "3Gi" "1Gi"
patch_pvc "tactical-frontend-data" "3Gi" "1Gi"
patch_pvc "tactical-nats-data" "3Gi" "1Gi"
patch_pvc "tactical-nginx-data" "3Gi" "1Gi"
patch_pvc "tactical-websockets-data" "3Gi" "1Gi"

echo -e "\n================================================"
echo "PVC storage update completed!"
echo ""
echo "Note: PVC expansion requires:"
echo "  1. StorageClass with 'allowVolumeExpansion: true'"
echo "  2. Support from the underlying storage provider"
echo "  3. Pod restart may be required for some storage types"
echo ""
echo "To verify changes, run:"
echo "  kubectl get pvc -n $NAMESPACE"
echo "  kubectl get pvc -n $DATASOURCES_NAMESPACE"
