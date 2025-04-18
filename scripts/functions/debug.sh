#!/bin/bash

cleanup() {
  echo ""
  echo "Cleaning up intercept: $SERVICE_NAME"
  telepresence leave "$SERVICE_NAME"

  # Restore original namespace
  telepresence quit
  telepresence connect --namespace "$CURRENT_NAMESPACE"
  exit 0
}

function debug_app() {
  # Use the passed parameters instead of hardcoded values
  SERVICE_NAME="$1"
  NAMESPACE="$2"
  LOCAL_PORT="$3"
  REMOTE_PORT_NAME="$4"

  # Handle cleanup on Ctrl+C
  trap cleanup INT

  # Start intercept
  echo "Starting intercept for $SERVICE_NAME"
  # Save current namespace to a variable
  CURRENT_NAMESPACE=$(telepresence status --output json | jq -r '.user_daemon.namespace')
  # Fallback to "default" if empty
  CURRENT_NAMESPACE=${CURRENT_NAMESPACE:-default}

  if [ "$CURRENT_NAMESPACE" != "$NAMESPACE" ]; then
    echo "Switching telepresence from $CURRENT_NAMESPACE to $NAMESPACE"
    telepresence quit
    telepresence connect --namespace "$NAMESPACE"
  else
    echo "Telepresence already in $NAMESPACE"
  fi

  sleep 1
  telepresence intercept "$SERVICE_NAME" \
    --port "$LOCAL_PORT:$REMOTE_PORT_NAME"

  # Keep script alive until interrupted
  echo "Intercept running. Press Ctrl+C to stop..."
  while true; do sleep 1; done
}
