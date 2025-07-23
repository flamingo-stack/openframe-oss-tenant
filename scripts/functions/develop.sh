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
