#!/bin/bash


cleanup() {
  echo ""
  echo "Cleaning up intercept: $SERVICE_NAME"
  telepresence leave "$SERVICE_NAME" || true

  echo "Quitting Telepresence daemon"
  telepresence quit

  echo "Restoring original namespace: $CURRENT_NAMESPACE"
  telepresence connect --namespace "$CURRENT_NAMESPACE"
  exit 0
}


intercept_app() {
  SERVICE_NAME="$1"
  NAMESPACE="$2"
  LOCAL_PORT="$3"
  REMOTE_PORT_NAME="$4"

  if ! command -v jq &> /dev/null; then
    echo "jq is required but not installed. Please install jq."
    exit 1
  fi

  trap cleanup INT

  CURRENT_NAMESPACE=$(telepresence status --output json | jq -r '.user_daemon.namespace')
  CURRENT_NAMESPACE=${CURRENT_NAMESPACE:-default}

  echo "Current namespace: $CURRENT_NAMESPACE"

  if [ "$CURRENT_NAMESPACE" != "$NAMESPACE" ]; then
    echo "Switching Telepresence from $CURRENT_NAMESPACE to $NAMESPACE"
    telepresence quit
    telepresence connect --namespace "$NAMESPACE"
  else
    echo "Telepresence already connected to $NAMESPACE"
  fi

  sleep 1

  echo "Starting intercept for $SERVICE_NAME"
  telepresence intercept "$SERVICE_NAME" \
    --port "$LOCAL_PORT:$REMOTE_PORT_NAME" \
    --mount=false

  echo "Intercept running. Press Ctrl+C to stop..."

  # Sleep loop to keep script alive until Ctrl+C
  while true; do
    sleep 1
  done
}


switch_argocd_app_health() {
  SERVICE_NAME="$1"
  BRANCH_NAME="$2"
  HEALTH_STATUS="$3"

  # Detect platform-specific sed flags
  SED_INPLACE=(-i)
  [[ "$OSTYPE" == darwin* ]] && SED_INPLACE=(-i '')

  # Patch root argocd-apps.yaml
  sed "${SED_INPLACE[@]}" -E \
    "s|^([[:space:]]*targetRevision:[[:space:]]*)[[:alnum:]_/-]+$|\1${BRANCH_NAME}|" \
    "${ROOT_REPO_DIR}/manifests/argocd/argocd-apps.yaml"

  # Patch targetRevision and syncPolicy in service YAMLs
  find "${ROOT_REPO_DIR}/manifests/argocd-apps" -type f -name "${SERVICE_NAME}.yaml" -print0 | \
  while IFS= read -r -d '' file; do
    # Replace all targetRevision values
    sed "${SED_INPLACE[@]}" -E \
      "s|^([[:space:]]*targetRevision:[[:space:]]*)[[:alnum:]_/-]+$|\1${BRANCH_NAME}|" "$file"
    
    # Set syncPolicy.automated.selfHeal/prune to false
    local SYNC_BOOL="true"
    [[ "$HEALTH_STATUS" == "off" ]] && SYNC_BOOL="false"
    
    sed "${SED_INPLACE[@]}" -E \
      "s|^([[:space:]]*selfHeal:[[:space:]])[a-z]+$|\1${SYNC_BOOL}|" "$file"
    sed "${SED_INPLACE[@]}" -E \
      "s|^([[:space:]]*prune:[[:space:]])[a-z]+$|\1${SYNC_BOOL}|" "$file"
  done
}
